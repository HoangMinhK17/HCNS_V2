import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Typography, Button, Tag, Select, DatePicker,
  Space, Statistic, Row, Col, Badge, Tooltip, message,
  Modal, Form, Input, TimePicker,
} from 'antd';
import {
  CalendarOutlined, TeamOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ClockCircleOutlined, WarningOutlined,
  ExportOutlined, EditOutlined, FilterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAttendanceSummary, manualEditSummary } from '../../utils/attendanceApi';
import { getAllDepartments } from '../../utils/departmentApi';
import { getAllEmployeesForDropdown } from '../../utils/employeeApi';
import './AttendanceDashboard.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { MonthPicker } = DatePicker;

const STATUS_CONFIG = {
  present:     { label: 'Đủ công',     color: 'success',  icon: <CheckCircleOutlined /> },
  late:        { label: 'Đi muộn',     color: 'warning',  icon: <ClockCircleOutlined /> },
  'early-leave': { label: 'Về sớm',   color: 'orange',   icon: <ClockCircleOutlined /> },
  'late-early':{ label: 'Muộn + Sớm', color: 'error',    icon: <WarningOutlined /> },
  absent:      { label: 'Vắng',        color: 'error',    icon: <CloseCircleOutlined /> },
  'on-leave':  { label: 'Nghỉ phép',   color: 'blue',     icon: <CalendarOutlined /> },
  holiday:     { label: 'Ngày lễ',     color: 'purple',   icon: <CalendarOutlined /> },
  off:         { label: 'Nghỉ',        color: 'default',  icon: null },
  'no-schedule': { label: 'Chưa xếp', color: 'default',  icon: null },
};

export default function AttendanceDashboard() {
  const [data,        setData]       = useState([]);
  const [loading,     setLoading]    = useState(false);
  const [pagination,  setPagination] = useState({ current: 1, pageSize: 25, total: 0 });
  const [departments, setDepts]      = useState([]);
  const [employees,   setEmployees]  = useState([]);

  const [month, setMonth] = useState(dayjs());
  const [deptId,   setDeptId]   = useState(null);
  const [empId,    setEmpId]    = useState(null);

  // Stats
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, leave: 0 });

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [editForm] = Form.useForm();

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        month: month.month() + 1,
        year: month.year(),
        page,
        limit: pagination.pageSize,
      };
      if (deptId) params.departmentId = deptId;
      if (empId)  params.employeeId  = empId;

      const res = await getAttendanceSummary(params);
      const rows = res.data || [];
      setData(rows);
      setPagination(prev => ({ ...prev, total: res.pagination?.total || 0, current: page }));

      // Tính stats
      const s = { present: 0, late: 0, absent: 0, leave: 0 };
      rows.forEach(r => {
        if (r.status === 'present') s.present++;
        else if (r.status === 'late' || r.status === 'early-leave' || r.status === 'late-early') s.late++;
        else if (r.status === 'absent') s.absent++;
        else if (r.status === 'on-leave') s.leave++;
      });
      setStats(s);
    } catch { message.error('Không thể tải dữ liệu chấm công'); }
    finally { setLoading(false); }
  }, [month, deptId, empId, pagination.pageSize]);

  useEffect(() => {
    getAllDepartments().then(r => setDepts(r.data.data || [])).catch(() => {});
    getAllEmployeesForDropdown().then(r => setEmployees(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchData(1); }, [month, deptId, empId]);

  const openEdit = (record) => {
    setEditRecord(record);
    editForm.setFieldsValue({
      checkInTime:  record.checkInTime  ? dayjs(record.checkInTime)  : null,
      checkOutTime: record.checkOutTime ? dayjs(record.checkOutTime) : null,
      status: record.status,
      note: record.note,
    });
    setEditModal(true);
  };

  const handleEdit = async () => {
    try {
      const vals = await editForm.validateFields();
      await manualEditSummary(editRecord._id, {
        checkInTime:  vals.checkInTime?.toISOString(),
        checkOutTime: vals.checkOutTime?.toISOString(),
        status: vals.status,
        note: vals.note,
      });
      message.success('Đã cập nhật chấm công');
      setEditModal(false);
      fetchData(pagination.current);
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi cập nhật');
    }
  };

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'workDate',
      width: 110,
      render: d => (
        <Text strong style={{ fontSize: 13 }}>
          {dayjs(d).format('DD/MM/YYYY')}
        </Text>
      ),
    },
    {
      title: 'Nhân viên',
      dataIndex: 'employee',
      width: 180,
      render: emp => emp ? (
        <div className="att-emp-cell">
          <div className="att-avatar" style={{ background: '#1677ff' }}>
            {emp.fullName?.[0] || 'N'}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.fullName}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{emp.empCode}</div>
          </div>
        </div>
      ) : '—',
    },
    {
      title: 'Ca',
      dataIndex: 'shiftTemplate',
      width: 120,
      render: s => s ? <Tag color="blue" style={{ fontSize: 11 }}>{s.name}</Tag> : <Tag>—</Tag>,
    },
    {
      title: 'Check-in',
      dataIndex: 'checkInTime',
      width: 90,
      align: 'center',
      render: t => t ? (
        <Text strong style={{ color: '#10b981' }}>
          {dayjs(t).format('HH:mm')}
        </Text>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Check-out',
      dataIndex: 'checkOutTime',
      width: 90,
      align: 'center',
      render: t => t ? (
        <Text strong style={{ color: '#f59e0b' }}>
          {dayjs(t).format('HH:mm')}
        </Text>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Thực làm',
      dataIndex: 'actualWorkMinutes',
      width: 90,
      align: 'center',
      render: m => m ? `${Math.floor(m/60)}h${m%60 ? ` ${m%60}m` : ''}` : '—',
    },
    {
      title: 'Muộn',
      dataIndex: 'lateMinutes',
      width: 70,
      align: 'center',
      render: m => m > 0 ? <Tag color="orange">{m}m</Tag> : '—',
    },
    {
      title: 'OT',
      dataIndex: 'overtimeMinutes',
      width: 70,
      align: 'center',
      render: m => m > 0 ? <Tag color="purple">{m}m</Tag> : '—',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      render: s => {
        const cfg = STATUS_CONFIG[s] || { label: s, color: 'default' };
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
      },
    },
    {
      title: '',
      width: 50,
      align: 'center',
      render: (_, record) => !record.lockedAt && (
        <Tooltip title="Sửa thủ công">
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="att-page">
      {/* Header */}
      <div className="att-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>📊 Bảng chấm công</Title>
          <Text type="secondary">Quản lý và theo dõi chấm công nhân viên</Text>
        </div>
        <Button icon={<ExportOutlined />} style={{ borderRadius: 8 }}>Xuất Excel</Button>
      </div>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {[
          { title: 'Đủ công', value: stats.present, color: '#10b981', bg: '#f0fdf4' },
          { title: 'Đi muộn / Về sớm', value: stats.late, color: '#f59e0b', bg: '#fffbeb' },
          { title: 'Vắng mặt', value: stats.absent, color: '#ef4444', bg: '#fef2f2' },
          { title: 'Nghỉ phép', value: stats.leave, color: '#6366f1', bg: '#f5f3ff' },
        ].map((s, i) => (
          <Col span={6} key={i}>
            <Card bordered={false} className="stat-card-hover"
              style={{ borderRadius: 14, background: s.bg, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <Statistic title={<Text style={{ fontSize: 12, color: '#6b7280' }}>{s.title}</Text>}
                value={s.value} valueStyle={{ color: s.color, fontWeight: 700, fontSize: 28 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <Card bordered={false} style={{ borderRadius: 14, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Space wrap>
          <DatePicker picker="month" value={month} onChange={v => setMonth(v || dayjs())}
            format="MM/YYYY" style={{ borderRadius: 8 }} />
          <Select allowClear placeholder="Phòng ban" style={{ width: 200, borderRadius: 8 }}
            onChange={v => setDeptId(v)} value={deptId}>
            {departments.map(d => <Option key={d._id} value={d._id}>{d.name}</Option>)}
          </Select>
          <Select allowClear showSearch placeholder="Nhân viên" style={{ width: 220 }}
            onChange={v => setEmpId(v)} value={empId}
            filterOption={(input, opt) => opt.children?.toLowerCase().includes(input.toLowerCase())}>
            {employees.map(e => <Option key={e._id} value={e._id}>{e.fullName} ({e.empCode})</Option>)}
          </Select>
          <Button icon={<FilterOutlined />} onClick={() => fetchData(1)} type="primary" style={{ borderRadius: 8 }}>
            Lọc
          </Button>
        </Space>
      </Card>

      {/* Table */}
      <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          size="small"
          pagination={{
            ...pagination,
            showSizeChanger: false,
            showTotal: t => `${t} bản ghi`,
            onChange: fetchData,
          }}
          rowClassName={r => r.status === 'absent' ? 'row-absent' : r.isOnLeave ? 'row-leave' : ''}
          scroll={{ x: 900 }}
        />
      </Card>

      {/* Edit Modal */}
      <Modal title="Chỉnh sửa chấm công thủ công" open={editModal}
        onOk={handleEdit} onCancel={() => setEditModal(false)}
        okText="Lưu" cancelText="Hủy">
        <Form form={editForm} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Check-in" name="checkInTime">
                <DatePicker showTime format="HH:mm DD/MM" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Check-out" name="checkOutTime">
                <DatePicker showTime format="HH:mm DD/MM" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Trạng thái" name="status">
            <Select>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <Option key={k} value={k}>{v.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
