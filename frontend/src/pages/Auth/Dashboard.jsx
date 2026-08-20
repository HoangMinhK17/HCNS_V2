import { useState, useEffect, useCallback } from 'react';
import {
  Row, Col, Card, Button, Tag, Typography,
  Avatar, Spin, message,
} from 'antd';
import { getBirthdays, getExpiringContracts, syncHRM } from '../../utils/employeeApi';
import {
  GiftFilled, GiftOutlined,
  FileTextOutlined,
  ReloadOutlined, SyncOutlined, ArrowRightOutlined,
  WarningFilled, ClockCircleOutlined,
  DashboardOutlined, CalendarOutlined,
  TeamOutlined, CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

/* ─── helpers ─────────────────────────────────────────────── */
function getInitials(name = '') {
  const parts = name.trim().split(' ');
  return parts[parts.length - 1]?.charAt(0)?.toUpperCase() || '?';
}

const AVATAR_COLORS = [
  '#7c3aed', '#1677ff', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#db2777',
];
function avatarColor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ─── Urgency config ─────────────────────────────────────── */
const BD_URGENCY = {
  today:    { color: '#7c3aed', tagColor: 'purple' },
  critical: { color: '#dc2626', tagColor: 'red' },
  warning:  { color: '#d97706', tagColor: 'orange' },
  normal:   { color: '#059669', tagColor: 'green' },
};

const CT_URGENCY = {
  critical: { color: '#dc2626', tagColor: 'red' },
  warning:  { color: '#d97706', tagColor: 'orange' },
  normal:   { color: '#1677ff', tagColor: 'blue' },
};

function ctUrgency(daysLeft) {
  if (daysLeft <= 7)  return 'critical';
  if (daysLeft <= 30) return 'warning';
  return 'normal';
}

/* ─── Stat summary card — chiều dọc đều nhau ─────────────── */
function StatBanner({ icon, value, label, sub, color, bg, borderColor, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: bg || '#fff',
        border: `1.5px solid ${borderColor || '#e5e7eb'}`,
        borderRadius: 16,
        padding: '20px 20px 18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s, transform 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        height: '100%',
        minHeight: 130,
      }}
      className="db-stat-banner"
    >
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: color + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, color, marginBottom: 14, flexShrink: 0,
      }}>
        {icon}
      </div>
      {/* Số */}
      <div style={{ fontSize: 34, fontWeight: 800, color: '#1f2937', lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      {/* Label */}
      <div style={{ fontSize: 12.5, fontWeight: 600, color, lineHeight: 1.3, marginBottom: 4 }}>
        {label}
      </div>
      {/* Sub */}
      {sub && (
        <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.4, marginTop: 'auto', paddingTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ─── Employee row ──────────────────────────────────────── */
function EmpRow({ emp, type }) {
  const name  = emp.fullName || '—';
  const code  = emp.empCode || '';
  const dept  = emp.departmentName || '';
  const pos   = emp.positionName  || '';
  const color = avatarColor(name);

  if (type === 'birthday') {
    const cfg     = BD_URGENCY[emp.urgency] || BD_URGENCY.normal;
    const isToday = emp.urgency === 'today';
    return (
      <div className="db-emp-row" style={{ borderLeft: `3px solid ${cfg.color}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              size={42}
              style={{
                background: isToday ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : color,
                fontWeight: 700, fontSize: 15,
                boxShadow: isToday ? '0 0 0 3px #ddd6fe' : 'none',
              }}
            >
              {getInitials(name)}
            </Avatar>
            {isToday && (
              <span style={{
                position: 'absolute', bottom: -3, right: -3,
                fontSize: 13, lineHeight: 1, color: '#7c3aed',
              }}>
                <GiftFilled />
              </span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: isToday ? '#7c3aed' : '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name}
            </div>
            <div style={{ fontSize: 11.5, color: '#6b7280' }}>{code}{pos ? ` · ${pos}` : ''}</div>
            {dept && <div style={{ fontSize: 11.5, color: '#9ca3af' }}>{dept}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <Tag
            color={cfg.tagColor}
            style={{ borderRadius: 20, fontWeight: 600, fontSize: 11.5, padding: '2px 10px', border: 'none' }}
          >
            {isToday
              ? <><GiftFilled /> Hôm nay!</>
              : <><ClockCircleOutlined /> Còn {emp.daysLeft} ngày</>}
          </Tag>
          {emp.birthdayFormatted && (
            <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 4 }}>
              <CalendarOutlined style={{ marginRight: 4 }} />
              {emp.birthdayFormatted}
            </div>
          )}
        </div>
      </div>
    );
  }

  // contract
  const uKey = ctUrgency(emp.daysLeft);
  const cfg  = CT_URGENCY[uKey];
  return (
    <div className="db-emp-row" style={{ borderLeft: `3px solid ${cfg.color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <Avatar size={42} style={{ background: color, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
          {getInitials(name)}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </div>
          <div style={{ fontSize: 11.5, color: '#6b7280' }}>{code}{pos ? ` · ${pos}` : ''}</div>
          {dept && <div style={{ fontSize: 11.5, color: '#9ca3af' }}>{dept}</div>}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <Tag
          color={cfg.tagColor}
          style={{ borderRadius: 20, fontWeight: 600, fontSize: 11.5, padding: '2px 10px', border: 'none' }}
        >
          {uKey === 'critical'
            ? <><WarningFilled /> Còn {emp.daysLeft} ngày</>
            : <><ClockCircleOutlined /> Còn {emp.daysLeft} ngày</>}
        </Tag>
        {emp.expiryFormatted && (
          <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 4 }}>
            <CalendarOutlined style={{ marginRight: 4 }} />HH: {emp.expiryFormatted}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Section card ──────────────────────────────────────── */
function SectionCard({ title, subtitle, icon, accentColor, children, action, loading, empty, count, badge }) {
  return (
    <Card
      styles={{ body: { padding: 0 } }}
      style={{
        borderRadius: 18, border: '1.5px solid #e5e7eb',
        overflow: 'hidden', height: '100%',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '18px 22px 14px',
        borderBottom: '1px solid #f3f4f6',
        background: `linear-gradient(135deg, ${accentColor}08 0%, #fff 100%)`,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: accentColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color: accentColor,
          }}>
            {icon}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong style={{ fontSize: 15, color: '#1f2937' }}>{title}</Text>
              {badge != null && (
                <span style={{
                  background: accentColor, color: '#fff',
                  borderRadius: 12, fontSize: 11, fontWeight: 700,
                  padding: '1px 8px', minWidth: 22, textAlign: 'center',
                }}>
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 1 }}>{subtitle}</div>}
          </div>
        </div>
        {action}
      </div>

      {/* Body */}
      <Spin spinning={loading} style={{ minHeight: 120 }}>
        {!loading && count === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <CheckCircleOutlined style={{ fontSize: 40, color: '#d1d5db', display: 'block', marginBottom: 10 }} />
            <div style={{ fontSize: 13, fontWeight: 500 }}>{empty}</div>
          </div>
        ) : (
          <div className="db-scroll" style={{ maxHeight: 420, overflowY: 'auto', padding: '8px 0' }}>
            {children}
          </div>
        )}
      </Spin>
    </Card>
  );
}

/* ─── Main Dashboard ────────────────────────────────────── */
export default function Dashboard({ onNavigate }) {
  const [msgApi, contextHolder] = message.useMessage();
  const [birthdays,  setBirthdays]  = useState([]);
  const [contracts,  setContracts]  = useState([]);
  const [bdLoading,  setBdLoading]  = useState(true);
  const [ctLoading,  setCtLoading]  = useState(true);
  const [isSyncing,  setIsSyncing]  = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchBirthdays = useCallback(async () => {
    setBdLoading(true);
    try {
      const res = await getBirthdays(30);
      if (res.success) setBirthdays(res.employees || []);
    } catch (_) { /* silent */ }
    finally { setBdLoading(false); }
  }, []);

  const fetchContracts = useCallback(async () => {
    setCtLoading(true);
    try {
      const res = await getExpiringContracts(60);
      if (res.success) setContracts(res.employees || []);
    } catch (_) { /* silent */ }
    finally { setCtLoading(false); }
  }, []);

  const refreshAll = useCallback(() => {
    fetchBirthdays();
    fetchContracts();
    setLastUpdate(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
  }, [fetchBirthdays, fetchContracts]);

  const handleSyncHRM = async () => {
    setIsSyncing(true);
    try {
      const res = await syncHRM();
      if (res.success) {
        msgApi.success(res.message || 'Đồng bộ HRM thành công!');
        refreshAll();
      } else {
        msgApi.error(res.message || 'Lỗi đồng bộ HRM');
      }
    } catch {
      msgApi.error('Không thể kết nối đến server để đồng bộ.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => { refreshAll(); }, [refreshAll]);

  /* derived stats */
  const bdToday    = birthdays.filter(e => e.urgency === 'today');
  const bdCritical = birthdays.filter(e => e.urgency === 'critical');
  const bdWarning  = birthdays.filter(e => e.urgency === 'warning');

  const ctCritical = contracts.filter(e => ctUrgency(e.daysLeft) === 'critical');
  const ctWarning  = contracts.filter(e => ctUrgency(e.daysLeft) === 'warning');
  const ctNormal   = contracts.filter(e => ctUrgency(e.daysLeft) === 'normal');

  /* sorted lists */
  const sortedBd = [...birthdays].sort((a, b) => {
    const order = { today: 0, critical: 1, warning: 2, normal: 3 };
    return (order[a.urgency] ?? 4) - (order[b.urgency] ?? 4) || (a.daysLeft ?? 999) - (b.daysLeft ?? 999);
  });
  const sortedCt = [...contracts].sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <>
      {contextHolder}
      <style>{`
        @keyframes db-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .db-stat-banner:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.10) !important;
          transform: translateY(-3px);
        }
        .db-emp-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 22px;
          border-bottom: 1px solid #f3f4f6;
          transition: background 0.15s;
          background: #fff;
        }
        .db-emp-row:last-child { border-bottom: none; }
        .db-emp-row:hover { background: #f9fafb; }
        .db-scroll::-webkit-scrollbar { width: 4px; }
        .db-scroll::-webkit-scrollbar-track { background: transparent; }
        .db-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
      `}</style>

      <div style={{ padding: '28px 32px', maxWidth: 1160 }}>

        {/* ── Page header ─────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#1f2937', letterSpacing: -0.5 }}>
              <DashboardOutlined style={{ marginRight: 10, color: '#1677ff' }} />
              Tổng quan Nhân sự
            </Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <CalendarOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
              <span style={{ fontSize: 12.5, color: '#9ca3af' }}>{todayStr}</span>
              {lastUpdate && (
                <span style={{ fontSize: 11.5, color: '#c4cad6', borderLeft: '1px solid #e5e7eb', paddingLeft: 8 }}>
                  Cập nhật lúc {lastUpdate}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Button
              id="dashboard-sync-hrm"
              icon={<SyncOutlined />}
              loading={isSyncing}
              onClick={handleSyncHRM}
              style={{
                borderRadius: 10, fontWeight: 600, height: 38,
                background: 'linear-gradient(135deg,#1677ff,#0ea5e9)',
                color: '#fff', border: 'none',
                boxShadow: '0 2px 8px rgba(22,119,255,0.30)',
                paddingInline: 18,
              }}
            >
              Đồng bộ HRM
            </Button>

            <Button
              id="dashboard-refresh"
              icon={<ReloadOutlined />}
              onClick={refreshAll}
              loading={bdLoading || ctLoading}
              style={{
                borderRadius: 10, fontWeight: 600, height: 38,
                border: '1.5px solid #e5e7eb', color: '#374151',
                background: '#fff',
              }}
            >
              Làm mới
            </Button>
          </div>
        </div>

        {/* ── Stat summary row — 4 card đều chiều dọc ────── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }} align="stretch">
          <Col span={6}>
            <StatBanner
              icon={<GiftFilled />}
              value={bdToday.length}
              label="Sinh nhật hôm nay"
              sub={bdToday.length > 0
                ? bdToday.map(e => e.fullName?.split(' ').slice(-1)[0]).join(', ')
                : 'Không có ai hôm nay'}
              color="#7c3aed"
              borderColor={bdToday.length > 0 ? '#ddd6fe' : '#e5e7eb'}
              bg={bdToday.length > 0 ? 'linear-gradient(160deg,#faf5ff 0%,#f5f3ff 100%)' : '#fff'}
              onClick={() => onNavigate('birthdays')}
            />
          </Col>
          <Col span={6}>
            <StatBanner
              icon={<GiftOutlined />}
              value={birthdays.length}
              label="Sinh nhật trong 30 ngày"
              sub={`${bdCritical.length} trong 7 ngày · ${bdWarning.length} trong 14 ngày`}
              color="#1677ff"
              borderColor="#dbeafe"
              bg="#f8fbff"
              onClick={() => onNavigate('birthdays')}
            />
          </Col>
          <Col span={6}>
            <StatBanner
              icon={<WarningFilled />}
              value={ctCritical.length}
              label="Hợp đồng hết hạn ≤ 7 ngày"
              sub={ctCritical.length > 0 ? 'Cần xử lý khẩn cấp!' : 'Không có trường hợp khẩn'}
              color="#dc2626"
              borderColor={ctCritical.length > 0 ? '#fecaca' : '#e5e7eb'}
              bg={ctCritical.length > 0 ? 'linear-gradient(160deg,#fff5f5 0%,#fef2f2 100%)' : '#fff'}
              onClick={() => onNavigate('contracts')}
            />
          </Col>
          <Col span={6}>
            <StatBanner
              icon={<FileTextOutlined />}
              value={contracts.length}
              label="Hợp đồng hết hạn ≤ 60 ngày"
              sub={`${ctWarning.length} trong 30 ngày · ${ctNormal.length} trong 60 ngày`}
              color="#f97316"
              borderColor="#fed7aa"
              bg="#fffbf5"
              onClick={() => onNavigate('contracts')}
            />
          </Col>
        </Row>

        {/* ── Urgency alert bar ────────────────────────── */}
        {(bdToday.length > 0 || ctCritical.length > 0) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            background: 'linear-gradient(90deg, #faf5ff 0%, #fef2f2 100%)',
            border: '1.5px solid #e9d5ff',
            borderRadius: 12, padding: '10px 18px',
            fontSize: 13, fontWeight: 600, marginBottom: 22,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#7c3aed',
              display: 'inline-block', animation: 'db-pulse 1.5s infinite', flexShrink: 0,
            }} />
            {bdToday.length > 0 && (
              <span style={{ color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 5 }}>
                <GiftFilled /> {bdToday.length} nhân viên có sinh nhật <strong>hôm nay</strong>!
              </span>
            )}
            {bdToday.length > 0 && ctCritical.length > 0 && (
              <span style={{ color: '#d1d5db' }}>·</span>
            )}
            {ctCritical.length > 0 && (
              <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}>
                <WarningFilled /> {ctCritical.length} hợp đồng hết hạn trong <strong>7 ngày</strong>!
              </span>
            )}
          </div>
        )}

        {/* ── Two-column main content ───────────────────── */}
        <Row gutter={18}>
          {/* Sinh nhật */}
          <Col xs={24} xl={12}>
            <SectionCard
              title="Sinh nhật nhân viên"
              subtitle="Trong 30 ngày tới"
              icon={<GiftFilled />}
              accentColor="#7c3aed"
              loading={bdLoading}
              count={sortedBd.length}
              badge={sortedBd.length}
              empty="Không có sinh nhật nào trong 30 ngày tới"
              action={
                <Button
                  type="link" size="small"
                  icon={<ArrowRightOutlined />}
                  onClick={() => onNavigate('birthdays')}
                  id="dashboard-go-birthday"
                  style={{ color: '#7c3aed', fontWeight: 600, padding: '0 4px' }}
                >
                  Xem tất cả
                </Button>
              }
            >
              {sortedBd.map((emp) => (
                <EmpRow key={emp._id} emp={emp} type="birthday" />
              ))}
            </SectionCard>
          </Col>

          {/* Hợp đồng hết hạn */}
          <Col xs={24} xl={12}>
            <SectionCard
              title="Hợp đồng sắp hết hạn"
              subtitle="Trong 60 ngày tới"
              icon={<FileTextOutlined />}
              accentColor="#f97316"
              loading={ctLoading}
              count={sortedCt.length}
              badge={sortedCt.length}
              empty="Không có hợp đồng nào sắp hết hạn"
              action={
                <Button
                  type="link" size="small"
                  icon={<ArrowRightOutlined />}
                  onClick={() => onNavigate('contracts')}
                  id="dashboard-go-contracts"
                  style={{ color: '#f97316', fontWeight: 600, padding: '0 4px' }}
                >
                  Xem tất cả
                </Button>
              }
            >
              {sortedCt.map((emp) => (
                <EmpRow key={emp._id} emp={emp} type="contract" />
              ))}
            </SectionCard>
          </Col>
        </Row>

        {/* ── Quick navigation ─────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
          <Button
            size="large"
            icon={<GiftFilled />}
            id="dashboard-shortcut-birthday"
            onClick={() => onNavigate('birthdays')}
            style={{
              borderRadius: 12, fontWeight: 600,
              border: '1.5px solid #ddd6fe', color: '#7c3aed',
              background: '#faf5ff', height: 42,
            }}
          >
            Quản lý Sinh nhật
          </Button>
          <Button
            size="large"
            icon={<FileTextOutlined />}
            id="dashboard-shortcut-contracts"
            onClick={() => onNavigate('contracts')}
            style={{
              borderRadius: 12, fontWeight: 600,
              border: '1.5px solid #fed7aa', color: '#ea580c',
              background: '#fff7ed', height: 42,
            }}
          >
            Danh sách Hợp đồng
          </Button>
          <Button
            size="large"
            icon={<TeamOutlined />}
            id="dashboard-shortcut-employees"
            onClick={() => onNavigate('employees')}
            style={{
              borderRadius: 12, fontWeight: 600,
              border: '1.5px solid #dbeafe', color: '#1677ff',
              background: '#f0f7ff', height: 42,
            }}
          >
            Danh sách Nhân viên
          </Button>
        </div>

      </div>
    </>
  );
}
