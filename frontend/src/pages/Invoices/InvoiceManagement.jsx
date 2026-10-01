import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  DatePicker,
  Input,
  Modal,
  Form,
  message,
  Typography,
  Row,
  Col,
  Statistic,
  Tooltip,
  Badge,
  Tabs,
  Popconfirm,
  Descriptions,
  Divider,
  Alert
} from 'antd';
import {
  CloudDownloadOutlined,
  SendOutlined,
  FileTextOutlined,
  ReloadOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  DollarCircleOutlined,
  AuditOutlined,
  FileProtectOutlined,
  LoginOutlined,
  GlobalOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  FileZipOutlined,
  DownloadOutlined,
  EyeOutlined,
  CodeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const API_BASE = '/api/v1/fumee/invoices';

export default function InvoiceManagement() {
  const [loading, setLoading] = useState(false);
  const [pushingMisa, setPushingMisa] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [statusData, setStatusData] = useState(null);

  // Row selection cho bảng — dùng để chọn HĐ trước khi đẩy MISA
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  // Date filter for pulling invoices
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);

  // Modals
  const [isCaptchaModalVisible, setIsCaptchaModalVisible] = useState(false);
  const [isTokenModalVisible, setIsTokenModalVisible] = useState(false);
  const [isMisaModalVisible, setIsMisaModalVisible] = useState(false);
  const [isXmlModalVisible, setIsXmlModalVisible] = useState(false);
  const [isPushConfirmVisible, setIsPushConfirmVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Puppeteer session state
  const [puppetSession, setPuppetSession] = useState({
    status: 'idle',
    isLoggedIn: false,
    captchaImage: '',
    captchaKey: '',
    lastError: '',
    isFullscreenFallback: false,
    isModalFallback: false,
  });
  const [puppetUsername, setPuppetUsername] = useState('0109120256');
  const [puppetPassword, setPuppetPassword] = useState('Intra2026@');
  const [puppetCaptchaInput, setPuppetCaptchaInput] = useState('');

  // Captcha state (direct API — fallback)
  const [captchaData, setCaptchaData] = useState({ key: '', content: '' });
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [gdtForm] = Form.useForm();
  const [tokenForm] = Form.useForm();
  const [misaForm] = Form.useForm();

  // Poll puppet session status every 3s when session is active
  useEffect(() => {
    const interval = setInterval(async () => {
      if (puppetSession.status === 'idle') return;
      try {
        const res = await fetch(`${API_BASE}/gdt/puppet/status`);
        const d = await res.json();
        if (d.success) {
          setPuppetSession(prev => ({
            ...prev,
            status: d.sessionStatus,
            isLoggedIn: d.isLoggedIn,
            lastError: d.lastError || '',
          }));
        }
      } catch (_) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [puppetSession.status]);

  // Load initial status & invoices
  useEffect(() => {
    fetchDashboardStatus();
  }, []);

  const fetchDashboardStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/status`);
      const data = await res.json();
      if (data.success) {
        setStatusData(data);
        setInvoices(data.recentInvoices || []);
      }
    } catch (err) {
      message.error('Không thể tải trạng thái hệ thống: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Khởi động trình duyệt Chrome thật trên màn hình
  const handleStartPuppetSession = async () => {
    try {
      setLoading(true);
      setPuppetSession(prev => ({ ...prev, status: 'launching', lastError: '' }));
      message.loading({ content: 'Đang kết nối Tổng Cục Thuế và lấy Captcha...', key: 'puppet', duration: 0 });

      const res = await fetch(`${API_BASE}/gdt/puppet/start`, { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setPuppetSession(prev => ({
          ...prev,
          status: 'captcha_wait',
          captchaImage: data.captchaImage || '',
          captchaKey: data.captchaKey || '',
          isFullscreenFallback: !!data.isFullscreenFallback,
          isModalFallback: !!data.isModalFallback,
        }));
        setPuppetCaptchaInput('');
        setIsCaptchaModalVisible(true);
        message.success({
          content: data.isFullscreenFallback
            ? '📷 Đã chụp màn hình GDT! Nhìn vào cửa sổ Chrome hoặc xem ảnh dưới để đọc Captcha.'
            : 'Đã lấy ảnh Captcha! Nhập mã vào popup.',
          key: 'puppet',
          duration: 4
        });
      } else {
        setPuppetSession(prev => ({ ...prev, status: 'error', lastError: data.message }));
        message.error({ content: data.message, key: 'puppet' });
      }
    } catch (err) {
      setPuppetSession(prev => ({ ...prev, status: 'error', lastError: err.message }));
      message.error({ content: 'Lỗi: ' + err.message, key: 'puppet' });
    } finally {
      setLoading(false);
    }
  };

  // Đóng trình duyệt Chrome
  const handleClosePuppetSession = async () => {
    try {
      setLoading(true);
      await fetch(`${API_BASE}/gdt/puppet/close`, { method: 'POST' });
      setPuppetSession({ status: 'idle', isLoggedIn: false, captchaImage: '', captchaKey: '', lastError: '' });
      message.info('Đã đóng trình duyệt Chrome.');
    } catch (err) {
      message.error('Lỗi khi đóng trình duyệt: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Gửi captcha và đăng nhập trong Puppeteer
  const handlePuppetLogin = async () => {
    if (!puppetCaptchaInput.trim()) {
      message.warning('Vui lòng nhập mã Captcha');
      return;
    }
    try {
      setLoading(true);
      message.loading({ content: 'Đang đăng nhập và kéo hóa đơn...', key: 'puppet_login', duration: 0 });

      const startDate = dateRange[0].format('DD/MM/YYYY');
      const endDate   = dateRange[1].format('DD/MM/YYYY');

      const res = await fetch(`${API_BASE}/gdt/puppet/login?startDate=${startDate}&endDate=${endDate}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          captcha: puppetCaptchaInput,
          username: puppetUsername,
          password: puppetPassword,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setPuppetSession(prev => ({ ...prev, status: 'logged_in', isLoggedIn: true }));
        setIsCaptchaModalVisible(false);

        // Backend đã tự động kéo hóa đơn — hiển thị kết quả
        if (data.autoScrape) {
          message.success({
            content: `✅ Đăng nhập thành công! Đã kéo và lưu ${data.autoScrape.count} hóa đơn (${data.autoScrape.startDate} → ${data.autoScrape.endDate})`,
            key: 'puppet_login',
            duration: 6,
          });
        } else {
          message.success({ content: data.message || 'Đăng nhập TCT thành công!', key: 'puppet_login', duration: 4 });
        }

        // Làm mới bảng dữ liệu
        fetchDashboardStatus();
      } else {
        // Captcha sai — lấy captcha mới
        if (data.captchaImage) {
          setPuppetSession(prev => ({
            ...prev,
            captchaImage: data.captchaImage,
            captchaKey: data.captchaKey || prev.captchaKey,
          }));
        }
        setPuppetCaptchaInput('');
        message.error({ content: data.message || 'Đăng nhập thất bại, mã captcha mới đã được tải lại', key: 'puppet_login' });
      }
    } catch (err) {
      message.error({ content: 'Lỗi: ' + err.message, key: 'puppet_login' });
    } finally {
      setLoading(false);
    }
  };


  // Kéo hóa đơn qua Puppeteer session
  const handlePullInvoicesPuppet = async (skipLoginCheck = false) => {
    if (!skipLoginCheck && !puppetSession.isLoggedIn) {
      message.warning('Chưa đăng nhập qua Puppeteer. Bấm "Khởi động phiên TCT".');
      return;
    }
    try {
      setLoading(true);
      const startDate = dateRange[0].format('DD/MM/YYYY');
      const endDate = dateRange[1].format('DD/MM/YYYY');
      message.loading({ content: 'Đang kéo hóa đơn từ TCT...', key: 'pull', duration: 0 });

      const res = await fetch(`${API_BASE}/gdt/puppet/invoices?startDate=${startDate}&endDate=${endDate}&size=100`);
      const data = await res.json();

      if (data.success) {
        message.success({
          content: data.message || `Đã kéo và lưu ${data.count} hóa đơn vào CSDL!`,
          key: 'pull',
          duration: 5
        });
        fetchDashboardStatus();
      } else {
        if (data.message?.includes('hết hạn') || data.message?.includes('401')) {
          setPuppetSession(prev => ({ ...prev, isLoggedIn: false, status: 'idle' }));
        }
        message.error({ content: data.message || 'Không thể kéo hóa đơn', key: 'pull' });
      }
    } catch (err) {
      message.error({ content: 'Lỗi: ' + err.message, key: 'pull' });
    } finally {
      setLoading(false);
    }
  };

  // Xóa 1 hóa đơn
  const handleDeleteInvoice = async (id) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/invoices/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        message.success('Đã xóa hóa đơn thành công');
        fetchDashboardStatus();
      } else {
        message.error(data.message || 'Xóa hóa đơn thất bại');
      }
    } catch (err) {
      message.error('Lỗi khi xóa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Xóa nhiều hóa đơn đã chọn
  const handleBulkDeleteInvoices = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/invoices/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedRowKeys })
      });
      const data = await res.json();
      if (data.success) {
        message.success(data.message || `Đã xóa ${selectedRowKeys.length} hóa đơn thành công`);
        setSelectedRowKeys([]);
        setSelectedRows([]);
        fetchDashboardStatus();
      } else {
        message.error(data.message || 'Xóa thất bại');
      }
    } catch (err) {
      message.error('Lỗi khi xóa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── XUẤT FILE PDF, XML, ZIP ──
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Mở/Tải PDF bản thể hiện
  const handleDownloadPdf = (invoice) => {
    window.open(`${API_BASE}/invoices/${invoice._id}/pdf`, '_blank');
  };

  // Tải file XML gốc
  const handleDownloadXmlFile = async (invoice) => {
    try {
      const res = await fetch(`${API_BASE}/invoices/${invoice._id}/xml`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        message.warning({
          content: err.message || 'Chưa có file XML. Hãy khởi động phiên TCT và đăng nhập để tải XML từ Tổng Cục Thuế.',
          duration: 5
        });
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeShdon = String(invoice.shdon || "").padStart(7, "0");
      const safeKhhdon = invoice.khhdon || "HD";
      a.download = `HD_${safeShdon}_${safeKhhdon}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      message.success(`Đã tải file XML hóa đơn ${invoice.shdon}!`);
    } catch (e) {
      message.error('Lỗi khi tải file XML: ' + e.message);
    }
  };

  // Tải trọn bộ ZIP (gồm cả PDF và XML)
  const handleDownloadZip = async (ids = null) => {
    try {
      setDownloadingZip(true);
      message.loading({ content: 'Đang tạo file ZIP trọn bộ hóa đơn (PDF + XML)...', key: 'zip_dl', duration: 0 });
      const targetIds = Array.isArray(ids) && ids.length > 0 ? ids : (selectedRowKeys.length > 0 ? selectedRowKeys : []);

      const response = await fetch(`${API_BASE}/invoices/download-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: targetIds })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Lỗi tải file ZIP (HTTP ${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HoaDon_FumeeTech_${dayjs().format('YYYYMMDD')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      message.success({ content: 'Đã tải xong file ZIP trọn bộ hóa đơn!', key: 'zip_dl', duration: 3 });
    } catch (err) {
      message.error({ content: 'Không thể tải ZIP: ' + err.message, key: 'zip_dl', duration: 4 });
    } finally {
      setDownloadingZip(false);
    }
  };

  // ── DIRECT API FLOW (cũ) — chỉ dùng khi có cookie thủ công ──
  const fetchCaptcha = async () => {
    try {
      setCaptchaLoading(true);
      const res = await fetch(`${API_BASE}/gdt/captcha`);
      const json = await res.json();
      if (json.success && json.data) {
        setCaptchaData(json.data);
      }
    } catch (err) {
      message.error('Lỗi captcha: ' + err.message);
    } finally {
      setCaptchaLoading(false);
    }
  };

  // Lưu Token/Cookie GDT thủ công
  const handleSetTokenManually = async (values) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/gdt/set-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      const data = await res.json();
      if (data.success) {
        message.success('Cập nhật Token TCT thành công!');
        setIsTokenModalVisible(false);
        fetchDashboardStatus();
      } else {
        message.error(data.message || 'Lỗi cập nhật');
      }
    } catch (err) {
      message.error('Lỗi kết nối: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Lưu Token MISA AMIS
  const handleSetMisaToken = async (values) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/misa/set-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      const data = await res.json();
      if (data.success) {
        message.success('Cập nhật Token MISA AMIS thành công!');
        setIsMisaModalVisible(false);
        fetchDashboardStatus();
      } else {
        message.error(data.message || 'Lỗi cập nhật');
      }
    } catch (err) {
      message.error('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Download XML for an Invoice
  const handleDownloadXml = async (record) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/gdt/download-xml/${record._id}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        message.success('Đã tải và lưu XML gốc thành công!');
        setSelectedInvoice(data.invoice);
        setIsXmlModalVisible(true);
        fetchDashboardStatus();
      } else {
        message.error(data.message || 'Không thể tải XML');
      }
    } catch (err) {
      message.error('Lỗi tải XML: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 6. Đẩy NHIỀU hóa đơn đã chọn sang MISA (chỉ thực hiện khi bấm nút xác nhận)
  const handleBulkPushToMisa = async () => {
    const pending = selectedRows.filter((r) => r.sync_misa_status !== 'synced_misa');
    if (pending.length === 0) {
      message.warning('Tất cả hóa đơn đã chọn đều đã được đẩy sang MISA rồi!');
      return;
    }

    setIsPushConfirmVisible(false);
    setPushingMisa(true);

    let successCount = 0;
    let failCount = 0;
    const key = 'push_progress';
    message.loading({ content: `Đang đẩy 0/${pending.length} hóa đơn...`, key, duration: 0 });

    for (let i = 0; i < pending.length; i++) {
      const record = pending[i];
      try {
        message.loading({ content: `Đang đẩy ${i + 1}/${pending.length}: HĐ ${record.shdon}...`, key, duration: 0 });
        const res = await fetch(`${API_BASE}/misa/pu-voucher`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId: record._id,
            vendorId: 'GUID_NHA_CUNG_CAP_MISA'
          })
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
        } else {
          failCount++;
          console.warn(`[Push MISA] HĐ ${record.shdon} thất bại:`, data.message);
        }
      } catch (err) {
        failCount++;
        console.error(`[Push MISA] HĐ ${record.shdon} lỗi:`, err.message);
      }
    }

    setPushingMisa(false);
    setSelectedRowKeys([]);
    setSelectedRows([]);
    fetchDashboardStatus();

    if (failCount === 0) {
      message.success({ content: `✅ Đã đẩy thành công ${successCount} hóa đơn sang MISA AMIS!`, key });
    } else {
      message.warning({ content: `⚠️ Đẩy xong: ${successCount} thành công, ${failCount} thất bại. Xem console để biết chi tiết.`, key, duration: 6 });
    }
  };

  const columns = [
    {
      title: 'Số HĐ',
      dataIndex: 'shdon',
      key: 'shdon',
      width: 110,
      render: (text) => <Text strong style={{ color: '#1677ff' }}>{text}</Text>
    },
    {
      title: 'Ký hiệu / Mẫu',
      key: 'khhdon',
      width: 120,
      render: (_, r) => (
        <span>{r.khhdon} <Tag color="blue">{r.khmshdon}</Tag></span>
      )
    },
    {
      title: 'Ngày lập',
      dataIndex: 'tdlap',
      key: 'tdlap',
      width: 110,
      render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '—'
    },
    {
      title: 'Nhà Cung Cấp (Bên Bán)',
      key: 'vendor',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.nbten}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>MST: {r.nbmst}</Text>
        </div>
      )
    },
    {
      title: 'Tiền trước thuế',
      dataIndex: 'tgtttbso',
      key: 'tgtttbso',
      align: 'right',
      render: (val) => (val || 0).toLocaleString('vi-VN') + ' đ'
    },
    {
      title: 'Thuế GTGT',
      dataIndex: 'tgtthue',
      key: 'tgtthue',
      align: 'right',
      render: (val) => (val || 0).toLocaleString('vi-VN') + ' đ'
    },
    {
      title: 'Tổng thanh toán',
      dataIndex: 'tgttoan',
      key: 'tgttoan',
      align: 'right',
      render: (val) => (
        <Text strong style={{ color: '#52c41a' }}>
          {(val || 0).toLocaleString('vi-VN')} đ
        </Text>
      )
    },
    {
      title: 'Trạng thái MISA',
      dataIndex: 'sync_misa_status',
      key: 'sync_misa_status',
      align: 'center',
      render: (st, r) => {
        if (st === 'synced_misa') {
          return (
            <Tooltip title={`Số chứng từ: ${r.misa_ref_no}`}>
              <Tag color="success" icon={<CheckCircleOutlined />}>Đã sang MISA</Tag>
            </Tooltip>
          );
        }
        if (st === 'failed') {
          return (
            <Tooltip title={r.misa_sync_error}>
              <Tag color="error" icon={<CloseCircleOutlined />}>Lỗi đẩy</Tag>
            </Tooltip>
          );
        }
        return <Tag color="warning">Chưa đẩy</Tag>;
      }
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center',
      width: 200,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title={r.xml_raw_data ? 'Xem chi tiết & XML' : 'Tải XML gốc từ TCT'}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                if (r.xml_raw_data) {
                  setSelectedInvoice(r);
                  setIsXmlModalVisible(true);
                } else {
                  handleDownloadXml(r);
                }
              }}
            >
              Xem
            </Button>
          </Tooltip>

          <Tooltip title="Mở / Tải file PDF bản thể hiện">
            <Button
              size="small"
              style={{ color: '#d4380d', borderColor: '#ffbb96' }}
              icon={<FilePdfOutlined />}
              onClick={() => handleDownloadPdf(r)}
            >
              PDF
            </Button>
          </Tooltip>

          <Tooltip title="Tải file XML gốc">
            <Button
              size="small"
              style={{ color: '#389e0d', borderColor: '#b7eb8f' }}
              icon={<CodeOutlined />}
              onClick={() => handleDownloadXmlFile(r)}
            >
              XML
            </Button>
          </Tooltip>

          <Popconfirm
            title="Xóa hóa đơn"
            description={`Bạn có chắc muốn xóa hóa đơn ${r.shdon} (${r.nbmst})?`}
            onConfirm={() => handleDeleteInvoice(r._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa hóa đơn khỏi CSDL">
              <Button
                size="small"
                danger
                type="text"
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileProtectOutlined style={{ color: '#1677ff' }} />
            Tích Hợp Hóa Đơn Điện Tử (TCT) ⟷ ERP ⟷ MISA AMIS
          </Title>
          <Text type="secondary">
            Kéo HĐĐT tự động từ Tổng Cục Thuế lưu trữ CSDL và đồng bộ sang phân hệ Mua hàng / Thu Chi MISA
          </Text>
        </div>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchDashboardStatus} loading={loading}>
            Làm mới
          </Button>
          <Button icon={<KeyOutlined />} onClick={() => setIsTokenModalVisible(true)}>
            Nhập Token TCT
          </Button>
          <Button icon={<GlobalOutlined />} onClick={() => setIsMisaModalVisible(true)}>
            Cấu hình MISA
          </Button>
        </Space>
      </div>

      {/* Top Stats */}
      <Row orientation="horizontal" gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng HĐĐT trong CSDL"
              value={statusData?.stats?.totalInvoices || 0}
              prefix={<FileTextOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Đã đồng bộ sang MISA"
              value={statusData?.stats?.syncedMisaInvoices || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Chưa đẩy sang MISA"
              value={statusData?.stats?.pendingInvoices || 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Kết nối Tổng Cục Thuế"
              value={statusData?.authStatus?.gdt?.hasToken ? "Đã sẵn sàng" : "Chưa có Token"}
              valueStyle={{ color: statusData?.authStatus?.gdt?.hasToken ? '#52c41a' : '#ff4d4f', fontSize: 18 }}
              prefix={<KeyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Action Bar */}
      <Card
        bordered={false}
        style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
      >
        {/* Session Status Banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          padding: '10px 16px', borderRadius: 8,
          background: puppetSession.isLoggedIn
            ? 'linear-gradient(90deg, #f6ffed, #d9f7be)'
            : puppetSession.status === 'captcha_wait'
            ? '#fffbe6'
            : puppetSession.status === 'error'
            ? '#fff2f0'
            : '#f0f5ff',
          border: `1px solid ${
            puppetSession.isLoggedIn ? '#b7eb8f' : puppetSession.status === 'captcha_wait' ? '#ffe58f' : puppetSession.status === 'error' ? '#ffccc7' : '#adc6ff'
          }`,
        }}>
          <span style={{ fontSize: 18 }}>
            {puppetSession.isLoggedIn ? '🟢' : puppetSession.status === 'captcha_wait' ? '🟡' : puppetSession.status === 'error' ? '🔴' : '⚪'}
          </span>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: 13 }}>
              Phiên TCT (Puppeteer): {' '}
              {puppetSession.isLoggedIn
                ? <Tag color="success" style={{ fontWeight: 600 }}>🟢 Đã đăng nhập TCT thành công ✓ — Sẵn sàng kéo hóa đơn</Tag>
                : puppetSession.status === 'launching'
                ? <Tag color="processing">Đang kết nối Tổng Cục Thuế...</Tag>
                : puppetSession.status === 'captcha_wait'
                ? <Tag color="warning" style={{ fontWeight: 600 }}>🟡 Đang mở Modal nhập Captcha...</Tag>
                : puppetSession.status === 'error'
                ? <Tag color="error">Lỗi: {puppetSession.lastError.slice(0, 100)}</Tag>
                : <Tag>Chưa khởi động phiên</Tag>}
            </Text>
          </div>
          {puppetSession.isLoggedIn && (
            <Button
              size="small" danger
              onClick={handleClosePuppetSession}
            >Đóng phiên</Button>
          )}
        </div>

        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={16}>
            <Space size="middle" wrap>
              <Text strong>Khoảng thời gian HĐ:</Text>
              <RangePicker
                value={dateRange}
                format="DD/MM/YYYY"
                onChange={(val) => val && setDateRange(val)}
              />
              {/* NÚT CHÍNH */}
              {!puppetSession.isLoggedIn ? (
                <Button
                  type="primary"
                  icon={<LoginOutlined />}
                  onClick={handleStartPuppetSession}
                  loading={loading && puppetSession.status === 'launching'}
                  style={{ background: '#1677ff', fontWeight: 600 }}
                >
                  🚀 Khởi Động Phiên TCT
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<CloudDownloadOutlined />}
                  onClick={handlePullInvoicesPuppet}
                  loading={loading}
                  style={{ background: '#52c41a', borderColor: '#52c41a', fontWeight: 600 }}
                >
                  ⬇ Kéo Hóa Đơn Về CSDL
                </Button>
              )}
            </Space>
          </Col>

          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button
                type="dashed" size="small"
                onClick={() => window.open('https://hoadondientu.gdt.gov.vn', '_blank')}
              >
                Mở web TCT
              </Button>
              <Button
                type="dashed" size="small"
                onClick={() => window.open('https://actapp.misa.vn/app/Overview/dashboard', '_blank')}
              >
                Mở MISA AMIS
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>Danh Sách Hóa Đơn Điện Tử Đã Lưu CSDL ERP</span>
            <Space>
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 'normal' }}>
                Tổng số {invoices.length} hóa đơn
              </Text>
              {selectedRowKeys.length > 0 && (
                <Tag color="blue">{selectedRowKeys.length} đã chọn</Tag>
              )}
              {selectedRowKeys.length > 0 && (
                <Popconfirm
                  title="Xóa các hóa đơn đã chọn"
                  description={`Bạn có chắc muốn xóa vĩnh viễn ${selectedRowKeys.length} hóa đơn đã chọn khỏi CSDL?`}
                  onConfirm={handleBulkDeleteInvoices}
                  okText="Xóa tất cả"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={loading}
                  >
                    Xóa ({selectedRowKeys.length}) HĐ
                  </Button>
                </Popconfirm>
              )}
              <Button
                icon={<FileZipOutlined />}
                loading={downloadingZip}
                disabled={invoices.length === 0}
                onClick={() => handleDownloadZip()}
                style={{
                  color: '#13c2c2',
                  borderColor: '#87e8de',
                  fontWeight: 500,
                }}
              >
                {selectedRowKeys.length > 0
                  ? `📦 Tải (${selectedRowKeys.length}) HĐ (ZIP)`
                  : '📦 Tải Tất Cả (ZIP)'}
              </Button>
              <Button
                type="primary"
                danger={false}
                icon={<SendOutlined />}
                loading={pushingMisa}
                disabled={selectedRowKeys.length === 0}
                onClick={() => setIsPushConfirmVisible(true)}
                style={{
                  background: selectedRowKeys.length > 0 ? '#722ed1' : undefined,
                  borderColor: selectedRowKeys.length > 0 ? '#722ed1' : undefined,
                  fontWeight: 600,
                  boxShadow: selectedRowKeys.length > 0 ? '0 2px 8px rgba(114,46,209,0.4)' : undefined,
                }}
              >
                {selectedRowKeys.length > 0
                  ? `Đẩy ${selectedRowKeys.length} HĐ sang MISA ▶`
                  : 'Chọn HĐ để Đẩy MISA'}
              </Button>
            </Space>
          </div>
        }
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
      >
        {selectedRowKeys.length > 0 && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={
              <span>
                Đã chọn <b>{selectedRowKeys.length}</b> hóa đơn.
                {'  '}
                <span style={{ color: '#888' }}>
                  Nhấn <b style={{ color: '#722ed1' }}>Đẩy sang MISA ▶</b> để đồng bộ, hoặc nút <b style={{ color: '#ff4d4f' }}>Xóa</b> để dọn dẹp hóa đơn thừa.
                </span>
              </span>
            }
            closable
            onClose={() => { setSelectedRowKeys([]); setSelectedRows([]); }}
          />
        )}

        <Table
          columns={columns}
          dataSource={invoices}
          rowKey="_id"
          loading={loading}
          pagination={{
            defaultPageSize: 20,
            pageSizeOptions: ['10', '20', '50', '100', '200'],
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / tổng số ${total} hóa đơn`,
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys, rows) => {
              setSelectedRowKeys(keys);
              setSelectedRows(rows);
            },
            getCheckboxProps: (record) => ({
              disabled: record.sync_misa_status === 'synced_misa',
              title: record.sync_misa_status === 'synced_misa' ? 'Đã đẩy MISA rồi' : '',
            }),
          }}
          rowClassName={(record) =>
            record.sync_misa_status === 'synced_misa' ? 'row-synced' : ''
          }
        />
      </Card>

      {/* Modal Xác Nhận Đẩy MISA */}
      <Modal
        title={<span>🚀 Xác Nhận Đẩy Chứng Từ Sang MISA AMIS</span>}
        open={isPushConfirmVisible}
        onCancel={() => setIsPushConfirmVisible(false)}
        onOk={handleBulkPushToMisa}
        okText={`Xác nhận đẩy ${selectedRows.filter(r => r.sync_misa_status !== 'synced_misa').length} hóa đơn`}
        okButtonProps={{ style: { background: '#722ed1', borderColor: '#722ed1' }, size: 'large' }}
        cancelText="Hủy bỏ"
        width={520}
      >
        <Alert
          type="warning"
          showIcon
          message="Thao tác này sẽ tạo Chứng từ Mua hàng và Ghi sổ cái tự động trên MISA AMIS!"
          style={{ marginBottom: 16 }}
        />
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="Số HĐ sẽ đẩy">
            <b style={{ color: '#722ed1' }}>
              {selectedRows.filter(r => r.sync_misa_status !== 'synced_misa').length}
            </b> hóa đơn
          </Descriptions.Item>
          <Descriptions.Item label="HĐ đã đẩy rồi (bỏ qua)">
            {selectedRows.filter(r => r.sync_misa_status === 'synced_misa').length} hóa đơn
          </Descriptions.Item>
          <Descriptions.Item label="Tổng giá trị">
            <b style={{ color: '#52c41a' }}>
              {selectedRows
                .filter(r => r.sync_misa_status !== 'synced_misa')
                .reduce((s, r) => s + (r.tgttoan || 0), 0)
                .toLocaleString('vi-VN')} đ
            </b>
          </Descriptions.Item>
          <Descriptions.Item label="Điểm đến">
            MISA AMIS → Phân hệ Mua hàng (<code>PU Voucher</code>)
          </Descriptions.Item>
        </Descriptions>
      </Modal>

      {/* Modal: Nhập Tài khoản & Captcha Puppeteer Session */}
      <Modal
        title={<span>🔐 Đăng Nhập Tổng Cục Thuế (hoadondientu.gdt.gov.vn)</span>}
        open={isCaptchaModalVisible}
        onCancel={() => setIsCaptchaModalVisible(false)}
        footer={null}
        destroyOnClose
        width={puppetSession.isFullscreenFallback || puppetSession.isModalFallback ? 860 : 500}
      >
        <Alert
          type="info"
          showIcon
          message="Hệ thống tự động điền sẵn Tài khoản & Mật khẩu. Bạn chỉ cần nhập mã Captcha."
          style={{ marginBottom: 16 }}
        />

        <div style={{ marginBottom: 14 }}>
          <Text strong>Tài khoản (MST):</Text>
          <Input
            size="middle"
            value={puppetUsername}
            onChange={e => setPuppetUsername(e.target.value.trim())}
            placeholder="Mã số thuế (VD: 0109120256)"
            style={{ marginTop: 4 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text strong>Mật khẩu:</Text>
          <Input.Password
            size="middle"
            value={puppetPassword}
            onChange={e => setPuppetPassword(e.target.value)}
            placeholder="Mật khẩu TCT"
            style={{ marginTop: 4 }}
          />
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 6 }}>Hình ảnh mã Captcha:</Text>
          {puppetSession.captchaImage ? (
            puppetSession.isFullscreenFallback ? (
              // Fullpage screenshot — hiển thị lớn + hướng dẫn nhìn Chrome
              <div>
                <Alert
                  type="warning" showIcon
                  style={{ marginBottom: 10, textAlign: 'left' }}
                  message={
                    <span>
                      <b>📷 Ảnh chụp toàn màn hình</b> — Captcha nằm trong form đăng nhập.
                      <br/>
                      <span style={{ color: '#d46b08' }}>Hãy nhìn vào <b>cửa sổ Chrome đang mở</b> trên màn hình để đọc Captcha chính xác hơn.</span>
                    </span>
                  }
                />
                <img
                  src={puppetSession.captchaImage}
                  alt="Captcha TCT (fullpage)"
                  style={{ width: '100%', borderRadius: 8, border: '2px solid #faad14', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}
                />
              </div>
            ) : puppetSession.isModalFallback ? (
              // Modal screenshot — hiển thị toàn bộ form
              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
                  📷 Ảnh chụp form đăng nhập TCT. Tìm mã Captcha trong ảnh.
                </Text>
                <img
                  src={puppetSession.captchaImage}
                  alt="Captcha TCT (modal)"
                  style={{ width: '100%', maxWidth: 800, borderRadius: 8, border: '2px solid #1677ff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                />
              </div>
            ) : (
              // Ảnh captcha thật — hiển thị nhỏ gọn
              <img
                src={puppetSession.captchaImage}
                alt="Captcha TCT"
                style={{ height: 65, borderRadius: 8, border: '2px solid #1677ff', padding: 4, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              />
            )
          ) : (
            <div style={{ height: 60, lineHeight: '60px', color: '#999' }}>Đang tải captcha...</div>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <Text strong>Nhập mã Captcha trong ảnh trên (viết liền):</Text>
          <Input
            size="large"
            placeholder="Ví dụ: 44F4FB"
            value={puppetCaptchaInput}
            onChange={e => setPuppetCaptchaInput(e.target.value.replace(/\s+/g, '').toUpperCase())}
            onPressEnter={handlePuppetLogin}
            style={{ textAlign: 'center', fontSize: 22, letterSpacing: 4, fontWeight: 700, marginTop: 4 }}
            maxLength={6}
            autoFocus
          />
          <div style={{ textAlign: 'center', marginTop: 4, color: '#888', fontSize: 12 }}>
            💡 Lưu ý: Viết liền không cách (đủ 6 ký tự)
          </div>
        </div>

        <Button
          type="primary"
          block
          size="large"
          loading={loading}
          onClick={handlePuppetLogin}
          style={{ fontWeight: 700, height: 44, background: '#1677ff' }}
        >
          ✅ Xác Nhận & Đăng Nhập
        </Button>
      </Modal>

      {/* Modal: Nhập Token GDT Thủ Công */}
      <Modal
        title={<span>🔑 Dán Cookie Từ Trình Duyệt (Tổng Cục Thuế)</span>}
        open={isTokenModalVisible}
        onCancel={() => setIsTokenModalVisible(false)}
        footer={null}
        destroyOnClose
        width={620}
      >
        <Alert
          type="warning"
          showIcon
          message="GDT yêu cầu cả JWT Token + JSESSIONID Cookie — nếu thiếu sẽ bị lỗi 403"
          style={{ marginBottom: 16 }}
        />

        <div style={{
          background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 8,
          padding: '12px 16px', marginBottom: 16, fontSize: 13, lineHeight: '22px'
        }}>
          <b>📋 Cách lấy Cookie từ DevTools sau khi đăng nhập:</b>
          <ol style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>Trên web <b>hoadondientu.gdt.gov.vn</b> đang mở, nhấn <b>F12</b></li>
            <li>Chọn tab <b>Network</b> → Reload trang hoặc bấm "Tra cứu"</li>
            <li>Chọn bất kỳ request nào vào <code>hoadondientu.gdt.gov.vn</code></li>
            <li>Ở phần <b>Request Headers</b>, tìm dòng <b>Cookie:</b></li>
            <li>Copy toàn bộ giá trị Cookie (dài, bao gồm cả <code>jwt=...</code> và <code>JSESSIONID=...</code>)</li>
            <li>Dán vào ô bên dưới rồi nhấn <b>Lưu</b></li>
          </ol>
          <div style={{ marginTop: 8, color: '#595959' }}>
            💡 Hoặc vào tab <b>Application → Cookies → hoadondientu.gdt.gov.vn</b> để xem từng cookie riêng lẻ.
          </div>
        </div>

        <Form form={tokenForm} layout="vertical" onFinish={handleSetTokenManually}>
          <Form.Item
            label={<span>🍪 Toàn bộ Cookie String (copy từ Request Headers)</span>}
            name="cookie"
            extra="Ví dụ: jwt=eyJhbGci...; JSESSIONID=abc123; Path=/"
          >
            <Input.TextArea
              rows={4}
              placeholder="jwt=eyJhbGciOiJIUzUxMiJ9...; JSESSIONID=node0abc123...; ..."
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Form.Item>
          <Form.Item
            label="Bearer Token riêng (nếu chỉ có Token, không có Cookie)"
            name="token"
            extra="Lấy từ Application → LocalStorage → hoặc Authorization header"
          >
            <Input.TextArea rows={2} placeholder="eyJhbGciOiJIUzUxMiJ9..." style={{ fontFamily: 'monospace', fontSize: 12 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading} size="large">
            💾 Lưu & Kích Hoạt Phiên GDT
          </Button>
        </Form>
      </Modal>

      {/* Modal: Cấu hình MISA AMIS */}
      <Modal
        title="Cấu Hình MISA AMIS (actapp.misa.vn)"
        open={isMisaModalVisible}
        onCancel={() => setIsMisaModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={misaForm}
          layout="vertical"
          onFinish={handleSetMisaToken}
          initialValues={{
            branchId: '243df488-5bc6-4f31-8125-23afd8ce4548'
          }}
        >
          <Form.Item label="Mã chi nhánh (branch_id)" name="branchId" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Bearer Token MISA (Từ actapp.misa.vn)" name="token" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="Dán Bearer Token MISA sau khi đăng nhập..." />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Lưu Kết Nối MISA
          </Button>
        </Form>
      </Modal>

      {/* Modal: Xem XML & Chi tiết HĐ */}
      <Modal
        title={`Chi tiết Hóa Đơn: ${selectedInvoice?.shdon} - ${selectedInvoice?.nbten}`}
        open={isXmlModalVisible}
        onCancel={() => setIsXmlModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setIsXmlModalVisible(false)}>
            Đóng
          </Button>
        ]}
      >
        {selectedInvoice && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Số Hóa Đơn">{selectedInvoice.shdon}</Descriptions.Item>
              <Descriptions.Item label="Ký Hiệu">{selectedInvoice.khhdon}</Descriptions.Item>
              <Descriptions.Item label="MST Bên Bán">{selectedInvoice.nbmst}</Descriptions.Item>
              <Descriptions.Item label="Tên Bên Bán">{selectedInvoice.nbten}</Descriptions.Item>
              <Descriptions.Item label="Tổng Chưa Thuế">
                {(selectedInvoice.tgtttbso || 0).toLocaleString('vi-VN')} đ
              </Descriptions.Item>
              <Descriptions.Item label="Thuế GTGT">
                {(selectedInvoice.tgtthue || 0).toLocaleString('vi-VN')} đ
              </Descriptions.Item>
              <Descriptions.Item label="Tổng Thanh Toán" span={2}>
                <Text strong style={{ color: '#52c41a' }}>
                  {(selectedInvoice.tgttoan || 0).toLocaleString('vi-VN')} đ
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider>Dữ Liệu XML Gốc (Đã lưu CSDL)</Divider>
            <Input.TextArea
              rows={10}
              readOnly
              value={selectedInvoice.xml_raw_data || 'Chưa tải XML gốc'}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
