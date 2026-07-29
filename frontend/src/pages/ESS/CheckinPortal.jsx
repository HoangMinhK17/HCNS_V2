import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, Button, Tag, Progress, Spin, message, Typography, Divider, Badge, Alert } from 'antd';
import {
  EnvironmentOutlined, CameraOutlined, CheckCircleFilled,
  CloseCircleFilled, ClockCircleOutlined, LoadingOutlined,
  SafetyOutlined, ApiOutlined,
} from '@ant-design/icons';
import { checkIn, checkOut, getMyToday } from '../../utils/attendanceApi';
import './CheckinPortal.css';

const { Title, Text } = Typography;

// ── Hằng số GPS ────────────────────────────────────────────────
const GPS_OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

export default function CheckinPortal() {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);

  const [todayData,    setTodayData]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [actionLoading,setActionLoading]= useState(false);
  const [cameraOn,     setCameraOn]     = useState(false);
  const [cameraError,  setCameraError]  = useState(null);

  const [gpsStatus,    setGpsStatus]    = useState('idle'); // idle | loading | ok | error
  const [gpsCoords,    setGpsCoords]    = useState(null);
  const [gpsAccuracy,  setGpsAccuracy]  = useState(null);

  const [faceStatus,   setFaceStatus]   = useState('idle'); // idle | loading | ok | error
  const [capturedImg,  setCapturedImg]  = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);

  const [faceApiLoaded, setFaceApiLoaded] = useState(false);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── Real-time clock ────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Load dữ liệu hôm nay ───────────────────────────────────
  const fetchToday = useCallback(async () => {
    try {
      const res = await getMyToday();
      setTodayData(res.data);
    } catch {
      setTodayData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  // ── Load face-api.js dynamically ───────────────────────────
  useEffect(() => {
    const loadFaceApi = async () => {
      if (window.faceapi) { setFaceApiLoaded(true); return; }
      try {
        // face-api.js được load qua CDN trong index.html hoặc từ node_modules
        // Đây là placeholder — trong thực tế cần import face-api.js
        setFaceApiLoaded(false); // Sẽ fallback sang chế độ không có face
      } catch {
        setFaceApiLoaded(false);
      }
    };
    loadFaceApi();
  }, []);

  // ── Lấy GPS ────────────────────────────────────────────────
  const getGPS = useCallback(() => {
    setGpsStatus('loading');
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsStatus('ok');
      },
      () => setGpsStatus('error'),
      GPS_OPTIONS
    );
  }, []);

  // ── Bật camera ─────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      setCameraError('Không thể truy cập camera. Vui lòng cấp quyền camera.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  // ── Chụp ảnh + extract face descriptor ─────────────────────
  const captureAndDetect = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setFaceStatus('loading');

    const canvas = canvasRef.current;
    canvas.width  = videoRef.current.videoWidth  || 320;
    canvas.height = videoRef.current.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImg(imageDataUrl);

    // face-api.js integration placeholder
    // Trong production: dùng face-api.js để extract descriptor 128-dim
    if (window.faceapi) {
      try {
        const img = document.createElement('img');
        img.src = imageDataUrl;
        await new Promise((r) => { img.onload = r; });
        const detection = await window.faceapi
          .detectSingleFace(img, new window.faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (detection) {
          setFaceDescriptor(Array.from(detection.descriptor));
          setFaceStatus('ok');
        } else {
          setFaceStatus('error');
          message.warning('Không phát hiện khuôn mặt. Hãy đảm bảo ánh sáng tốt và nhìn thẳng vào camera.');
        }
      } catch {
        setFaceStatus('error');
      }
    } else {
      // Demo mode: gửi null descriptor, server sẽ bỏ qua face check
      setFaceDescriptor(null);
      setFaceStatus('ok');
    }

    stopCamera();
  }, [stopCamera]);

  // ── Check-in ───────────────────────────────────────────────
  const handleCheckIn = async () => {
    if (gpsStatus !== 'ok') {
      message.warning('Vui lòng lấy vị trí GPS trước');
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        latitude: gpsCoords.lat,
        longitude: gpsCoords.lng,
        gpsAccuracy,
        faceDescriptor,
        deviceInfo: navigator.userAgent,
      };
      const res = await checkIn(payload);
      message.success(res.message);
      if (res.data?.warnings?.length) {
        res.data.warnings.forEach((w) => message.warning(w, 5));
      }
      fetchToday();
      setCapturedImg(null);
      setFaceStatus('idle');
      setGpsStatus('idle');
      setGpsCoords(null);
    } catch (err) {
      message.error(err.response?.data?.message || 'Check-in thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (gpsStatus !== 'ok') {
      message.warning('Vui lòng lấy vị trí GPS trước');
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        latitude: gpsCoords.lat,
        longitude: gpsCoords.lng,
        gpsAccuracy,
        faceDescriptor,
      };
      const res = await checkOut(payload);
      message.success(res.message);
      fetchToday();
      setCapturedImg(null);
      setFaceStatus('idle');
      setGpsStatus('idle');
      setGpsCoords(null);
    } catch (err) {
      message.error(err.response?.data?.message || 'Check-out thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const hasCheckedIn  = !!todayData?.checkIn;
  const hasCheckedOut = !!todayData?.checkOut;
  const isCompleted   = hasCheckedIn && hasCheckedOut;
  const canAction     = !isCompleted;

  const gpsIcon = {
    idle: <EnvironmentOutlined style={{ color: '#9ca3af' }} />,
    loading: <LoadingOutlined style={{ color: '#1677ff' }} />,
    ok: <EnvironmentOutlined style={{ color: '#10b981' }} />,
    error: <EnvironmentOutlined style={{ color: '#ef4444' }} />,
  }[gpsStatus];

  const faceIcon = {
    idle: <CameraOutlined style={{ color: '#9ca3af' }} />,
    loading: <LoadingOutlined style={{ color: '#1677ff' }} />,
    ok: <CheckCircleFilled style={{ color: '#10b981' }} />,
    error: <CloseCircleFilled style={{ color: '#ef4444' }} />,
  }[faceStatus];

  if (loading) return (
    <div className="checkin-loading">
      <Spin size="large" />
      <Text style={{ marginTop: 12, color: '#6b7280' }}>Đang tải dữ liệu...</Text>
    </div>
  );

  return (
    <div className="checkin-portal">
      {/* Header Clock */}
      <div className="checkin-header">
        <div className="checkin-clock">
          {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="checkin-date">
          {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="checkin-body">
        {/* Status Card */}
        <Card className="checkin-status-card" bordered={false}>
          <div className="checkin-status-row">
            <div className={`checkin-status-dot ${hasCheckedIn ? 'dot-green' : 'dot-gray'}`} />
            <div>
              <Text strong style={{ fontSize: 15 }}>
                {isCompleted ? '✅ Hoàn tất hôm nay' : hasCheckedIn ? '🟡 Đã Check-in, chờ Check-out' : '⚪ Chưa chấm công'}
              </Text>
              <div className="checkin-times">
                <span>
                  <ClockCircleOutlined style={{ color: '#10b981', marginRight: 4 }} />
                  Check-in: <b>{todayData?.checkIn ? new Date(todayData.checkIn.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</b>
                </span>
                <span style={{ marginLeft: 24 }}>
                  <ClockCircleOutlined style={{ color: '#f59e0b', marginRight: 4 }} />
                  Check-out: <b>{todayData?.checkOut ? new Date(todayData.checkOut.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</b>
                </span>
              </div>
              {todayData?.summary?.shiftTemplate && (
                <div style={{ marginTop: 6 }}>
                  <Tag color="blue">
                    Ca: {todayData.summary.shiftTemplate.name} ({todayData.summary.shiftTemplate.startTime} – {todayData.summary.shiftTemplate.endTime})
                  </Tag>
                </div>
              )}
            </div>
          </div>
        </Card>

        {canAction && (
          <>
            {/* Step 1: GPS */}
            <Card className="checkin-step-card" bordered={false}>
              <div className="step-header">
                <div className="step-num">1</div>
                <div>
                  <Text strong>Xác nhận vị trí GPS</Text>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Bán kính cho phép: 100m từ văn phòng</div>
                </div>
                <div className="step-status-icon">{gpsIcon}</div>
              </div>
              {gpsStatus === 'ok' && gpsCoords && (
                <Alert
                  type="success" showIcon
                  message={`📍 Đã xác định vị trí (±${gpsAccuracy}m) — ${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}`}
                  style={{ marginTop: 10, borderRadius: 8 }}
                />
              )}
              {gpsStatus === 'error' && (
                <Alert type="error" showIcon message="Không thể lấy GPS. Vui lòng bật định vị và thử lại." style={{ marginTop: 10 }} />
              )}
              <Button
                type={gpsStatus === 'ok' ? 'default' : 'primary'}
                icon={<EnvironmentOutlined />}
                loading={gpsStatus === 'loading'}
                onClick={getGPS}
                style={{ marginTop: 12, borderRadius: 8 }}
                block={gpsStatus !== 'ok'}
              >
                {gpsStatus === 'ok' ? '🔄 Cập nhật GPS' : 'Lấy vị trí GPS'}
              </Button>
            </Card>

            {/* Step 2: Camera */}
            <Card className="checkin-step-card" bordered={false}>
              <div className="step-header">
                <div className="step-num">2</div>
                <div>
                  <Text strong>Xác thực khuôn mặt</Text>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Sử dụng camera trình duyệt</div>
                </div>
                <div className="step-status-icon">{faceIcon}</div>
              </div>

              {cameraError && <Alert type="error" message={cameraError} showIcon style={{ marginTop: 10 }} />}

              {/* Camera preview */}
              <div className="camera-container" style={{ display: cameraOn || capturedImg ? 'block' : 'none' }}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="camera-video" 
                  style={{ display: cameraOn ? 'block' : 'none' }} 
                />
                {cameraOn && <div className="camera-face-guide" />}
                {capturedImg && !cameraOn && (
                  <img src={capturedImg} alt="Captured" className="camera-captured" />
                )}
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {!cameraOn && faceStatus !== 'ok' && (
                  <Button type="primary" icon={<CameraOutlined />} onClick={startCamera} style={{ borderRadius: 8, flex: 1 }}>
                    Mở Camera
                  </Button>
                )}
                {cameraOn && (
                  <>
                    <Button onClick={stopCamera} style={{ borderRadius: 8 }}>Hủy</Button>
                    <Button
                      type="primary"
                      icon={faceStatus === 'loading' ? <LoadingOutlined /> : <CameraOutlined />}
                      loading={faceStatus === 'loading'}
                      onClick={captureAndDetect}
                      style={{ borderRadius: 8, flex: 1, background: '#10b981', borderColor: '#10b981' }}
                    >
                      Chụp & Xác thực
                    </Button>
                  </>
                )}
                {faceStatus === 'ok' && (
                  <Button onClick={() => { setCapturedImg(null); setFaceStatus('idle'); setFaceDescriptor(null); startCamera(); }} style={{ borderRadius: 8, flex: 1 }}>
                    📸 Chụp lại
                  </Button>
                )}
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="checkin-actions">
              {!hasCheckedIn && (
                <Button
                  type="primary"
                  size="large"
                  className="btn-checkin"
                  loading={actionLoading}
                  disabled={gpsStatus !== 'ok'}
                  onClick={handleCheckIn}
                  icon={<CheckCircleFilled />}
                >
                  CHECK-IN
                </Button>
              )}
              {hasCheckedIn && !hasCheckedOut && (
                <Button
                  size="large"
                  className="btn-checkout"
                  loading={actionLoading}
                  disabled={gpsStatus !== 'ok'}
                  onClick={handleCheckOut}
                  icon={<CheckCircleFilled />}
                >
                  CHECK-OUT
                </Button>
              )}
            </div>

            {gpsStatus !== 'ok' && (
              <Text type="secondary" style={{ textAlign: 'center', display: 'block', fontSize: 12 }}>
                ⚠️ Cần xác nhận GPS trước khi chấm công
              </Text>
            )}
          </>
        )}

        {isCompleted && (
          <Card bordered={false} style={{ textAlign: 'center', borderRadius: 16, background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <Title level={4} style={{ color: '#166534', margin: 0 }}>Đã chấm công xong hôm nay!</Title>
            <Text style={{ color: '#15803d' }}>
              Làm việc: {todayData?.summary?.actualWorkMinutes ? `${Math.floor(todayData.summary.actualWorkMinutes / 60)}h ${todayData.summary.actualWorkMinutes % 60}m` : '--'}
            </Text>
          </Card>
        )}
      </div>
    </div>
  );
}
