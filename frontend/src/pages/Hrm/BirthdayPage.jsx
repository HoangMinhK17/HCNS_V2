import { useState, useEffect, useCallback } from 'react';
import { getBirthdays } from '../../utils/employeeApi';
import {
  Table, Button, Input, Select, Space, Tag, Avatar,
  Typography, Tooltip, Spin, Alert, Badge,
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, GiftOutlined,
  ClockCircleOutlined, StarFilled, FilterOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const URGENCY_CONFIG = {
  today:    { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: '🎂 Hôm nay', badgeStatus: 'processing' },
  critical: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: '🔴 Trong 7 ngày', badgeStatus: 'error' },
  warning:  { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: '🟡 Trong 14 ngày', badgeStatus: 'warning' },
  normal:   { color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', label: '✅ Sắp tới', badgeStatus: 'success' },
};

function ConfettiBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
      color: '#fff', borderRadius: 20, padding: '2px 10px',
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
      animation: 'pulse-badge 1.5s ease-in-out infinite',
    }}>
      🎉 Sinh nhật hôm nay!
    </span>
  );
}

export default function BirthdayPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');
  const [deptFilter, setDeptFilter]       = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [daysRange, setDaysRange]         = useState(30);

  const fetchBirthdays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBirthdays(daysRange);
      if (data.success) {
        setEmployees(data.employees || []);
      } else {
        setError('Không thể tải dữ liệu sinh nhật.');
      }
    } catch (err) {
      setError(`Lỗi kết nối server: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [daysRange]);

  useEffect(() => { fetchBirthdays(); }, [fetchBirthdays]);

  // Stats
  const todayCount    = employees.filter((e) => e.urgency === 'today').length;
  const criticalCount = employees.filter((e) => e.urgency === 'critical').length;
  const warningCount  = employees.filter((e) => e.urgency === 'warning').length;

  // Departments list
  const departments = ['all', ...new Set(employees.map((e) => e.departmentName).filter(Boolean))];

  // Filter
  const filtered = employees.filter((e) => {
    const matchSearch =
      !search ||
      e.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      e.empCode?.toLowerCase().includes(search.toLowerCase());
    const matchDept    = deptFilter === 'all' || e.departmentName === deptFilter;
    const matchUrgency = urgencyFilter === 'all' || e.urgency === urgencyFilter;
    return matchSearch && matchDept && matchUrgency;
  });

  const todayEmployees    = urgencyFilter === 'all' || urgencyFilter === 'today'
    ? filtered.filter((e) => e.isToday)
    : [];
  const upcomingEmployees = urgencyFilter === 'all' || urgencyFilter !== 'today'
    ? filtered.filter((e) => !e.isToday)
    : [];

  const columns = [
    {
      title: 'Nhân sự',
      dataIndex: 'fullName',
      render: (_, r) => {
        const cfg = URGENCY_CONFIG[r.urgency] || URGENCY_CONFIG.normal;
        const initials = (r.fullName || '?').split(' ').slice(-1)[0].charAt(0).toUpperCase();
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <Avatar
                size={42}
                style={{
                  background: r.isToday
                    ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                    : cfg.color,
                  fontWeight: 700, fontSize: 16,
                  boxShadow: r.isToday ? '0 0 0 3px #ddd6fe' : 'none',
                }}
              >
                {initials}
              </Avatar>
              {r.isToday && (
                <span style={{
                  position: 'absolute', bottom: -2, right: -2,
                  fontSize: 14, lineHeight: 1,
                }}>🎂</span>
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                {r.urgency !== 'normal' && <Badge status={cfg.badgeStatus} />}
                <Text strong style={{ fontSize: 13.5, color: r.isToday ? '#7c3aed' : '#1f2937' }}>
                  {r.fullName}
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 11.5 }}>{r.empCode}</Text>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Chức vụ & Phòng ban',
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{r.positionName}</Text>
          <div><Text type="secondary" style={{ fontSize: 12.5 }}>{r.departmentName}</Text></div>
        </div>
      ),
    },
    {
      title: 'Ngày sinh',
      render: (_, r) => {
        const cfg = URGENCY_CONFIG[r.urgency] || URGENCY_CONFIG.normal;
        return (
          <div>
            <Text strong style={{ fontSize: 14, color: r.isToday ? '#7c3aed' : '#1f2937' }}>
              🎂 {r.birthdayFormatted}
            </Text>
            <div style={{ marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 11.5 }}>
                Sinh năm {r.birthdayFull?.split('/').slice(-1)[0]} · Tuổi {r.age}
              </Text>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      render: (_, r) => {
        const cfg = URGENCY_CONFIG[r.urgency] || URGENCY_CONFIG.normal;
        if (r.isToday) return <ConfettiBadge />;
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            borderRadius: 20, padding: '3px 10px',
            fontSize: 12, color: cfg.color, fontWeight: 600,
          }}>
            <ClockCircleOutlined />
            Còn {r.daysLeft} ngày
          </span>
        );
      },
    },
    {
      title: 'Mức độ',
      render: (_, r) => {
        const cfg = URGENCY_CONFIG[r.urgency] || URGENCY_CONFIG.normal;
        return (
          <Tag
            style={{
              borderRadius: 20, fontWeight: 600, fontSize: 11.5,
              padding: '2px 10px',
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              color: cfg.color,
            }}
          >
            {cfg.label}
          </Tag>
        );
      },
    },
    {
      title: 'Liên hệ',
      render: (_, r) => (
        <div style={{ fontSize: 12, color: '#4b5563' }}>
          {r.email && (
            <div style={{ marginBottom: 2 }}>
              <span style={{ color: '#9ca3af', marginRight: 4 }}>✉️</span>
              {r.email}
            </div>
          )}
          {r.phone && (
            <div>
              <span style={{ color: '#9ca3af', marginRight: 4 }}>📞</span>
              {r.phone}
            </div>
          )}
          {!r.email && !r.phone && <Text type="secondary">—</Text>}
        </div>
      ),
    },
  ];

  return (
    <>
      <style>{`
        @keyframes pulse-badge {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.04); }
        }
        @keyframes birthday-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.15); }
          50% { box-shadow: 0 0 0 6px rgba(124,58,237,0); }
        }
        .birthday-today-row td { background: #faf5ff !important; }
        .birthday-today-row:hover td { background: #f5f3ff !important; }
      `}</style>

      <div style={{ padding: '28px 32px', maxWidth: 1200 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
              🎂 Sinh nhật nhân viên
            </Title>

            {/* Stats badges */}
            {!loading && !error && (
              <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                {todayCount > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#f5f3ff', border: '1px solid #ddd6fe',
                    borderRadius: 8, padding: '4px 12px',
                    fontSize: 12.5, color: '#7c3aed', fontWeight: 700,
                    animation: 'birthday-glow 2s ease-in-out infinite',
                  }}>
                    🎉 {todayCount} người sinh nhật hôm nay
                  </span>
                )}
                {criticalCount > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 8, padding: '4px 12px',
                    fontSize: 12.5, color: '#dc2626', fontWeight: 600,
                  }}>
                    🔴 {criticalCount} sinh nhật trong 7 ngày tới
                  </span>
                )}
                {warningCount > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#fffbeb', border: '1px solid #fde68a',
                    borderRadius: 8, padding: '4px 12px',
                    fontSize: 12.5, color: '#d97706', fontWeight: 600,
                  }}>
                    🟡 {warningCount} sinh nhật trong 14 ngày tới
                  </span>
                )}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#eff6ff', border: '1px solid #dbeafe',
                  borderRadius: 8, padding: '4px 12px',
                  fontSize: 12.5, color: '#1677ff', fontWeight: 500,
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#1677ff', display: 'inline-block',
                    animation: 'pulse-badge 1.5s ease-in-out infinite',
                  }} />
                  Tự động quét theo ngày/tháng · Không phụ thuộc năm sinh
                </span>
              </div>
            )}
          </div>

          <Space>
            <Button
              icon={<ReloadOutlined />}
              id="birthday-refresh"
              onClick={fetchBirthdays}
              loading={loading}
              style={{ borderRadius: 8 }}
            >
              Làm mới
            </Button>
          </Space>
        </div>

        {/* ── Toolbar ── */}
        <Space style={{ marginBottom: 16, flexWrap: 'wrap' }} size={10}>
          <Input
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder="Tìm tên, mã NV..."
            style={{ width: 260, borderRadius: 8 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="birthday-search"
          />

          <Select
            value={deptFilter}
            onChange={setDeptFilter}
            allowClear
            style={{ width: 210 }}
            id="birthday-dept-filter"
            options={departments.map((d) => ({
              value: d,
              label: d === 'all' ? 'Tất cả phòng ban' : d,
            }))}
          />

          <Select
            value={urgencyFilter}
            onChange={setUrgencyFilter}
            style={{ width: 200 }}
            allowClear
            id="birthday-urgency-filter"
            options={[
              { value: 'all',      label: 'Tất cả mức độ' },
              { value: 'today',    label: '🎉 Sinh nhật hôm nay' },
              { value: 'critical', label: '🔴 Trong 7 ngày tới' },
              { value: 'warning',  label: '🟡 Trong 14 ngày tới' },
              { value: 'normal',   label: '✅ Trong thời gian còn lại' },
            ]}
          />

          <Select
            value={daysRange}
            onChange={setDaysRange}
            style={{ width: 180 }}
            id="birthday-days-range"
            allowClear
            options={[
              { value: 7,   label: 'Trong 7 ngày tới' },
              { value: 14,  label: 'Trong 14 ngày tới' },
              { value: 30,  label: 'Trong 30 ngày tới' },
              { value: 60,  label: 'Trong 60 ngày tới' },
              { value: 90,  label: 'Trong 90 ngày tới' },
            ]}
          />
        </Space>

        {/* ── Error ── */}
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 16, borderRadius: 10 }}
            action={<Button size="small" onClick={fetchBirthdays}>Thử lại</Button>}
          />
        )}

        {/* ── Section: Sinh nhật hôm nay ── */}
        {!loading && todayEmployees.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
            }}>
              <StarFilled style={{ color: '#7c3aed', fontSize: 16 }} />
              <Text strong style={{ fontSize: 15, color: '#7c3aed' }}>
                Sinh nhật hôm nay ({todayEmployees.length} người)
              </Text>
            </div>
            <Table
              dataSource={todayEmployees.map((e) => ({ ...e, key: e._id }))}
              columns={columns}
              pagination={false}
              rowClassName={() => 'birthday-today-row'}
              style={{
                borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 0 0 2px #ddd6fe, 0 4px 16px rgba(124,58,237,0.12)',
              }}
              size="middle"
              scroll={{ x: 980 }}
            />
          </div>
        )}

        {/* ── Section: Sắp tới ── */}
        <Spin spinning={loading} tip="Đang tải dữ liệu từ hệ thống...">
          {(!loading && todayEmployees.length > 0 && upcomingEmployees.length > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <GiftOutlined style={{ color: '#1677ff', fontSize: 16 }} />
              <Text strong style={{ fontSize: 15, color: '#1f2937' }}>
                Sinh nhật sắp tới ({upcomingEmployees.length} người)
              </Text>
            </div>
          )}
          <Table
            dataSource={upcomingEmployees.map((e) => ({ ...e, key: e._id }))}
            columns={columns}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `${total} nhân sự`,
              style: { padding: '0 16px' },
            }}
            style={{
              borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
            scroll={{ x: 980 }}
            size="middle"
            locale={{
              emptyText: loading ? ' ' : (
                <div style={{ padding: '48px 0', color: '#9ca3af', fontSize: 14 }}>
                  <GiftOutlined style={{ fontSize: 36, color: '#d1d5db', display: 'block', marginBottom: 10 }} />
                  Không có sinh nhật nào trong {daysRange} ngày tới 🎈
                </div>
              ),
            }}
          />
        </Spin>
      </div>
    </>
  );
}
