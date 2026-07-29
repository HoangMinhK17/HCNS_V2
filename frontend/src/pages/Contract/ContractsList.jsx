import { useState, useEffect, useCallback } from 'react';
import { sendContractWarningMail } from '../../utils/contractApi';
import { getExpiringContracts } from '../../utils/employeeApi';
import {
  Table, Button, Input, Select, Space, Tag, Avatar,
  Typography, Tooltip, message, Badge, Spin, Alert,
} from 'antd';
import {
  SearchOutlined, FilterOutlined, DownloadOutlined,
  SendOutlined, WarningFilled, CheckCircleFilled,
  ClockCircleOutlined, MailOutlined, ReloadOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const CONTRACT_TYPE_LABEL = {
  probation: 'Thử việc',
  'fixed-term': 'Xác định thời hạn',
  indefinite: 'Vô thời hạn',
};

/** Chuyển đổi dữ liệu API về shape dùng trong bảng */
const mapEmployee = (emp) => ({
  key: emp._id || emp.empCode,
  empCode: emp.empCode,
  name: emp.fullName,
  position: emp.positionName || '—',
  dept: emp.departmentName || '—',
  contractType: CONTRACT_TYPE_LABEL[emp.contractType] || emp.contractType,
  expiry: emp.expiryFormatted,
  daysLeft: emp.daysLeft,
  urgency: emp.urgency,           // 'critical' | 'warning' | 'normal'
  email: emp.email || null,
  phone: emp.phone || null,
  status: 'expiring',
  // giữ raw để gửi mail
  _raw: emp,
});

export default function ContractsList({ onNavigate }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [daysRange, setDaysRange] = useState(30);
  const [msgApi, contextHolder] = message.useMessage();
  const [sendingIds, setSendingIds] = useState(new Set());

  // ── Fetch dữ liệu từ DB ──
  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExpiringContracts(daysRange);
      if (data.success) {
        setEmployees((data.employees || []).map(mapEmployee));
      } else {
        setError('Không thể tải dữ liệu hợp đồng.');
      }
    } catch (err) {
      setError(`Lỗi kết nối server: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [daysRange]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // ── Gửi email cảnh báo ──
  const handleSendWarning = async (record) => {
    setSendingIds((prev) => new Set(prev).add(record.key));
    try {
      const data = await sendContractWarningMail(record._raw);
      if (data.success) {
        msgApi.success(`✅ Đã gửi email cảnh báo đến ${record.name}!`);
      } else {
        msgApi.error(`❌ Gửi thất bại: ${data.message}`);
      }
    } catch (err) {
      msgApi.error(`❌ Lỗi kết nối: ${err.message}`);
    } finally {
      setSendingIds((prev) => {
        const s = new Set(prev);
        s.delete(record.key);
        return s;
      });
    }
  };

  // ── Gửi hàng loạt ──
  const handleBulkSend = async () => {
    const toSend = filtered.filter((r) => r.email && r.urgency !== 'normal');
    if (toSend.length === 0) {
      msgApi.info('Không có nhân viên nào đủ điều kiện gửi email hàng loạt.');
      return;
    }
    setSendingIds(new Set(toSend.map((r) => r.key)));
    let ok = 0;
    let fail = 0;
    for (const r of toSend) {
      try {
        const data = await sendContractWarningMail(r._raw);
        if (data.success) ok++; else fail++;
      } catch {
        fail++;
      }
    }
    setSendingIds(new Set());
    msgApi.success(`Gửi xong: ${ok} thành công${fail ? `, ${fail} thất bại` : ''}`);
  };

  // ── Lấy danh sách phòng ban duy nhất để filter ──
  const departments = ['all', ...new Set(employees.map((e) => e.dept).filter(Boolean))];

  // ── Lọc ──
  const filtered = employees.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.empCode.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'all' || c.dept === deptFilter;
    const matchUrgency = urgencyFilter === 'all' || c.urgency === urgencyFilter;
    return matchSearch && matchDept && matchUrgency;
  });

  // ── Thống kê nhanh ──
  const criticalCount = employees.filter((e) => e.urgency === 'critical').length;
  const warningCount = employees.filter((e) => e.urgency === 'warning').length;

  // ── Columns ──
  const columns = [
    {
      title: 'Nhân sự',
      dataIndex: 'name',
      render: (_, r) => (
        <div className="emp-cell">
          <Avatar
            style={{ background: r.urgency === 'critical' ? '#dc2626' : '#1677ff', fontWeight: 700 }}
            size={40}
          >
            {r.name.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {r.urgency === 'critical' && <Badge status="error" />}
              {r.urgency === 'warning' && <Badge status="warning" />}
              <Text strong style={{ fontSize: 13.5 }}>{r.name}</Text>
            </div>
            <Text type="secondary" style={{ fontSize: 11.5 }}>{r.empCode}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Chức vụ & Phòng ban',
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{r.position}</Text>
          <div><Text type="secondary" style={{ fontSize: 12.5 }}>{r.dept}</Text></div>
        </div>
      ),
    },
    {
      title: 'Loại hợp đồng',
      dataIndex: 'contractType',
      render: (v) => (
        <Tag style={{ borderRadius: 20, fontSize: 11.5, fontWeight: 600, padding: '2px 10px' }}>
          {v}
        </Tag>
      ),
    },
    {
      title: 'Ngày hết hạn',
      dataIndex: 'expiry',
      sorter: (a, b) => a.daysLeft - b.daysLeft,
      defaultSortOrder: 'ascend',
      render: (_, r) => (
        <div>
          <Text
            strong
            style={{
              fontSize: 13,
              color: r.urgency === 'critical' ? '#dc2626' : '#1f2937',
            }}
          >
            {r.expiry}
          </Text>
          <div style={{ marginTop: 3 }}>
            {r.urgency === 'critical' ? (
              <Text style={{ fontSize: 11.5, color: '#dc2626', fontWeight: 600 }}>
                <WarningFilled /> Còn {r.daysLeft} ngày
              </Text>
            ) : (
              <Text style={{ fontSize: 11.5, color: '#d97706', fontWeight: 600 }}>
                <ClockCircleOutlined /> Còn {r.daysLeft} ngày
              </Text>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      render: (email) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <MailOutlined style={{ color: email ? '#1677ff' : '#9ca3af', fontSize: 14 }} />
          <Text style={{ fontSize: 12, color: email ? '#374151' : '#9ca3af' }}>
            {email || 'Chưa có'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Thao tác',
      render: (_, r) => (
        <Space size={6}>
          <Tooltip title={r.email ? 'Gửi email cảnh báo' : 'Nhân viên chưa có email'}>
            <Button
              type="text"
              size="small"
              icon={<SendOutlined />}
              id={`contracts-send-${r.key}`}
              loading={sendingIds.has(r.key)}
              disabled={!r.email}
              onClick={() => handleSendWarning(r)}
            />
          </Tooltip>
          <Button
            type="primary"
            size="small"
            style={{ borderRadius: 6, fontWeight: 600 }}
            id={`contracts-renew-${r.key}`}
            onClick={() => onNavigate('contracts/renewal', r._raw)}
          >
            Xử lý gia hạn
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1160 }}>
      {contextHolder}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
            Danh sách Thông báo & Hết hạn
          </Title>

          {/* Thống kê nhanh */}
          {!loading && !error && (
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              {criticalCount > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                  padding: '4px 12px', fontSize: 12.5, color: '#dc2626', fontWeight: 600,
                }}>
                  <WarningFilled /> {criticalCount} khẩn cấp (≤7 ngày)
                </span>
              )}
              {warningCount > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
                  padding: '4px 12px', fontSize: 12.5, color: '#d97706', fontWeight: 600,
                }}>
                  <ClockCircleOutlined /> {warningCount} cảnh báo (≤30 ngày)
                </span>
              )}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 8,
                padding: '4px 12px', fontSize: 12.5, color: '#1677ff', fontWeight: 500,
              }}>
                <span className="cron-pulse" />
                🔄 Cron job quét mỗi ngày lúc 08:00 — Gửi mail ở mốc 30/14/7/3/1 ngày
              </span>
            </div>
          )}
        </div>

        <Space>
          <Button
            icon={<ReloadOutlined />}
            id="contracts-refresh"
            onClick={fetchContracts}
            loading={loading}
            style={{ borderRadius: 8 }}
          >
            Làm mới
          </Button>
          <Button icon={<DownloadOutlined />} id="contracts-export" style={{ borderRadius: 8 }}>
            Xuất báo cáo
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            id="contracts-bulk-send"
            onClick={handleBulkSend}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            Gửi nhắc nhở hàng loạt
          </Button>
        </Space>
      </div>

      {/* Toolbar */}
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }} size={10}>
        <Input
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          placeholder="Tìm tên, mã NV..."
          style={{ width: 260, borderRadius: 8 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          id="contracts-search"
        />

        <Select
          value={deptFilter}
          onChange={setDeptFilter}
          allowClear={true}
          style={{ width: 200 }}
          id="contracts-dept-filter"
          options={departments.map((d) => ({
            value: d,
            label: d === 'all' ? 'Tất cả phòng ban' : d,
          }))}
        />

        <Select
          value={urgencyFilter}
          onChange={setUrgencyFilter}
          style={{ width: 190 }}
          allowClear={true}
          id="contracts-urgency-filter"
          options={[
            { value: 'all', label: 'Tất cả mức độ' },
            { value: 'critical', label: '🔴 Khẩn cấp (≤7 ngày)' },
            { value: 'warning', label: '🟡 Cảnh báo (≤30 ngày)' },
          ]}
        />

        <Select
          value={daysRange}
          onChange={setDaysRange}
          style={{ width: 170 }}
          id="contracts-days-range"
          allowClear={true}
          options={[
            { value: 7, label: 'Trong 7 ngày tới' },
            { value: 14, label: 'Trong 14 ngày tới' },
            { value: 30, label: 'Trong 30 ngày tới' },
            { value: 60, label: 'Trong 60 ngày tới' },
            { value: 90, label: 'Trong 90 ngày tới' },
          ]}
        />
      </Space>

      {/* Error */}
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: 16, borderRadius: 10 }}
          action={
            <Button size="small" onClick={fetchContracts}>
              Thử lại
            </Button>
          }
        />
      )}

      {/* Table */}
      <Spin spinning={loading} tip="Đang tải dữ liệu từ hệ thống...">
        <Table
          dataSource={filtered}
          columns={columns}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `${total} nhân sự`,
            style: { padding: '0 16px' },
          }}
          style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          scroll={{ x: 980 }}
          size="middle"
          locale={{
            emptyText: loading ? ' ' : (
              <div style={{ padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>
                <CheckCircleFilled style={{ fontSize: 32, color: '#059669', display: 'block', marginBottom: 10 }} />
                Không có hợp đồng nào sắp hết hạn trong {daysRange} ngày tới 🎉
              </div>
            ),
          }}
        />
      </Spin>
    </div>
  );
}
