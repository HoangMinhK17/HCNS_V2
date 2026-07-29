import { useState, useEffect } from 'react';
import {
  Row, Col, Card, Statistic, Button, Tag, Space, Typography,
  List, Avatar, message, Table, Spin
} from 'antd';
import { getAllEmployeesForDropdown } from '../../utils/employeeApi';
import { getAllDepartments } from '../../utils/departmentApi';
import { getAllPositions } from '../../utils/positionApi';
import {
  FolderOpenOutlined, CalendarOutlined, ReloadOutlined,
  RiseOutlined, WarningOutlined, CheckCircleOutlined,
  MailOutlined, FileAddOutlined, EditOutlined, ExclamationCircleOutlined,
  PlusOutlined, FileTextOutlined, UploadOutlined, SendOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// ── Pure SVG Donut (no chart lib needed) ──
const CHART_DATA = [
  { label: 'Đang hiệu lực (65%)', value: 65, color: '#1677ff' },
  { label: 'Sắp hết hạn (20%)', value: 20, color: '#f97316' },
  { label: 'Đã hết hạn/Hủy (15%)', value: 15, color: '#d1d5db' },
];

function DonutChart({ data }) {
  const size = 170, cx = 85, cy = 85, r = 62;
  const circumference = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  let offset = 0;
  return (
    <div className="donut-wrapper">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          const dash = (d.value / total) * circumference;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={28}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset} strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="donut-center">
        <div className="donut-center-val">1,248</div>
        <div className="donut-center-lbl">HĐ</div>
      </div>
    </div>
  );
}

// ── Activity feed data ──
const ACTIVITIES = [
  {
    icon: <MailOutlined />, color: '#eff6ff', iconColor: '#1677ff',
    title: 'Hệ thống gửi email thông báo',
    desc: 'Đã gửi nhắc nhở gia hạn đến 15 nhân viên khối sản xuất.',
    time: '10 phút trước',
  },
  {
    icon: <FileAddOutlined />, color: '#ecfdf5', iconColor: '#059669',
    title: 'Đồng bộ từ Base.vn thành công',
    desc: '6 nhân viên mới vừa được đồng bộ từ trang Base.vn.',
    time: '1 giờ trước',
  },
  {
    icon: <EditOutlined />, color: '#f9fafb', iconColor: '#6b7280',
    title: 'Cập nhật phụ lục',
    desc: 'Nguyễn Văn A đã được cập nhật phụ lục lương mới.',
    time: 'Hôm qua, 14:30',
  },
  {
    icon: <ExclamationCircleOutlined />, color: '#fffbeb', iconColor: '#d97706',
    title: 'Cảnh báo chậm trễ',
    desc: '3 hợp đồng phòng IT chưa phản hồi yêu cầu gia hạn.',
    time: 'Hôm qua, 09:15',
  },
];

export default function Dashboard({ onNavigate }) {
  const [msgApi, contextHolder] = message.useMessage();
  const [sysData, setSysData] = useState({ employees: [], departments: [], positions: [] });
  const [sysLoading, setSysLoading] = useState(true);

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const [empRes, deptRes, posRes] = await Promise.all([
          getAllEmployeesForDropdown(),
          getAllDepartments(),
          getAllPositions()
        ]);
        setSysData({
          employees: empRes.success ? empRes.data : [],
          departments: deptRes.success ? deptRes.data : [],
          positions: posRes.success ? posRes.data : []
        });
      } catch (error) {
        msgApi.error('Không thể tải dữ liệu hệ thống (NV/PB/CD)');
      } finally {
        setSysLoading(false);
      }
    };
    fetchSystemData();
  }, []);

  const handleBulkSend = () => {
    msgApi.success('Đã gửi thông báo nhắc nhở đến 42 nhân sự!', 3);
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      {contextHolder}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
            Tổng quan Nhắc nhở &amp; Gia hạn
          </Title>
          <Text type="secondary">Quản lý và theo dõi vòng đời hợp đồng nhân sự.</Text>
        </div>
        <Button
          type="primary" icon={<PlusOutlined />} size="large"
          id="dashboard-create-new"
          onClick={() => onNavigate('renewal')}
          style={{ borderRadius: 8, fontWeight: 600 }}
        >
          Tạo mới HĐ
        </Button>
      </div>

      {/* Cron info bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#eff6ff', border: '1px solid #dbeafe',
        borderRadius: 8, padding: '9px 14px',
        fontSize: 13, color: '#1677ff', fontWeight: 500, marginBottom: 22,
      }}>
        <span className="cron-pulse" />
        🔄 Hệ thống quét tự động (Cron-job). Lịch quét tiếp theo:
        <strong style={{ marginLeft: 4 }}>Ngày 15 tháng này</strong>
        <span style={{ color: '#6b7280', fontWeight: 400, marginLeft: 4 }}>| Quét vào ngày 01 &amp; 15 hàng tháng</span>
      </div>

      {/* Stat cards */}
      <Row gutter={18} style={{ marginBottom: 22 }}>
        <Col span={8}>
          <Card className="stat-card-hover" styles={{ body: { padding: '18px 22px' } }} style={{ borderRadius: 12 }}>
            <Statistic
              title={<Text style={{ fontSize: 12.5, color: '#6b7280' }}>Tổng số hợp đồng</Text>}
              value={1248}
              prefix={<FolderOpenOutlined style={{ color: '#1677ff', fontSize: 20, marginRight: 4 }} />}
              valueStyle={{ fontWeight: 700, fontSize: 28 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#059669', fontWeight: 500 }}>
              <RiseOutlined /> +12% so với tháng trước
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card
            className="stat-card-hover"
            styles={{ body: { padding: '18px 22px' } }}
            style={{ borderRadius: 12, borderLeft: '4px solid #f97316' }}
          >
            <Statistic
              title={<Text style={{ fontSize: 12.5, color: '#6b7280' }}>Sắp hết hạn (30 ngày)</Text>}
              value={42}
              prefix={<CalendarOutlined style={{ color: '#f97316', fontSize: 20, marginRight: 4 }} />}
              valueStyle={{ fontWeight: 700, fontSize: 28, color: '#f97316' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#d97706', fontWeight: 500 }}>
              <WarningOutlined /> Cần xử lý gấp
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card
            className="stat-card-hover"
            styles={{ body: { padding: '18px 22px' } }}
            style={{ borderRadius: 12, borderLeft: '4px solid #059669' }}
          >
            <Statistic
              title={<Text style={{ fontSize: 12.5, color: '#6b7280' }}>Đã gia hạn (Tháng này)</Text>}
              value={86}
              prefix={<ReloadOutlined style={{ color: '#059669', fontSize: 20, marginRight: 4 }} />}
              valueStyle={{ fontWeight: 700, fontSize: 28, color: '#059669' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#059669', fontWeight: 500 }}>
              <CheckCircleOutlined /> Hoàn thành đúng hạn
            </div>
          </Card>
        </Col>
      </Row>

      {/* Chart + Activity */}
      <Row gutter={18} style={{ marginBottom: 22 }}>
        <Col span={14}>
          <Card title={<Text strong>Trạng thái hợp đồng</Text>} style={{ borderRadius: 12, height: '100%' }} styles={{ body: { padding: '20px 24px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, height: '100%' }}>
              <DonutChart data={CHART_DATA} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {CHART_DATA.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                    <span style={{ color: '#6b7280' }}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>

        <Col span={10}>
          <Card
            title={<Text strong>Hoạt động gần đây</Text>}
            extra={
              <Button type="link" size="small" onClick={() => onNavigate('contracts')} id="dashboard-view-all">
                Xem tất cả
              </Button>
            }
            style={{ borderRadius: 12, height: '100%' }}
            styles={{ body: { padding: '4px 16px 8px' } }}
          >
            <div className="activity-list">
              {ACTIVITIES.map((a, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-icon" style={{ background: a.color, color: a.iconColor }}>
                    {a.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', lineHeight: 1.3 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>{a.desc}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* API Data Display Section */}
      <Card
        title={<Text strong style={{ fontSize: 16 }}>Dữ liệu Hệ thống từ API (NV / PB / CD)</Text>}
        style={{ borderRadius: 12, marginBottom: 22 }}
      >
        <Spin spinning={sysLoading}>
          <Row gutter={24}>
            <Col span={12}>
              <Text strong style={{ marginBottom: 12, display: 'block' }}>Danh sách Nhân viên ({sysData.employees.length})</Text>
              <Table
                dataSource={sysData.employees}
                rowKey="_id"
                size="small"
                pagination={{ pageSize: 5 }}
                columns={[
                  { title: 'Mã NV', dataIndex: 'empCode', key: 'empCode' },
                  { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName' },
                  { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: s => <Tag color="blue">{s}</Tag> }
                ]}
              />
            </Col>
            <Col span={12}>
              <Row gutter={[0, 24]}>
                <Col span={24}>
                  <Text strong style={{ marginBottom: 12, display: 'block' }}>Danh sách Phòng ban ({sysData.departments.length})</Text>
                  <Table
                    dataSource={sysData.departments}
                    rowKey="_id"
                    size="small"
                    pagination={{ pageSize: 3 }}
                    columns={[
                      { title: 'Tên phòng', dataIndex: 'name', key: 'name' }
                    ]}
                  />
                </Col>
                <Col span={24}>
                  <Text strong style={{ marginBottom: 12, display: 'block' }}>Danh sách Chức danh ({sysData.positions.length})</Text>
                  <Table
                    dataSource={sysData.positions}
                    rowKey="_id"
                    size="small"
                    pagination={{ pageSize: 3 }}
                    columns={[
                      { title: 'Tên chức danh', dataIndex: 'name', key: 'name' }
                    ]}
                  />
                </Col>
              </Row>
            </Col>
          </Row>
        </Spin>
      </Card>

      {/* Quick actions */}
      <Space size={10}>
        <Button
          icon={<FileTextOutlined />}
          id="dashboard-view-expiring"
          onClick={() => onNavigate('contracts')}
          style={{ borderRadius: 8 }}
        >
          Xem danh sách hết hạn
        </Button>
        <Button
          icon={<SendOutlined />}
          id="dashboard-bulk-send"
          onClick={handleBulkSend}
          style={{ borderRadius: 8 }}
        >
          Gửi nhắc nhở hàng loạt
        </Button>
        <Button
          icon={<UploadOutlined />}
          id="dashboard-import"
          onClick={() => onNavigate('personnel')}
          style={{ borderRadius: 8 }}
        >
          Đồng bộ từ Base.vn
        </Button>
      </Space>
    </div>
  );
}
