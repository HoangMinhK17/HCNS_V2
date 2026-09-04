import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Space, Modal, Form, Input, Select,
  DatePicker, Typography, message, Popconfirm, Calendar, Badge,
  Row, Col, Tooltip, Empty,
} from 'antd';
import {
  PlusOutlined, CalendarOutlined, TableOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getSchedule, assignShifts } from '../../utils/shiftApi';
import { getAllEmployeesForDropdown } from '../../utils/employeeApi';
import { getAllDepartments } from '../../utils/departmentApi';

const { Title, Text } = Typography;
const { Option } = Select;

// Shift color palette
const SHIFT_COLORS = ['#1677ff', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

export default function ShiftManagement() {
  const [schedule,   setSchedule]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [employees,  setEmployees]  = useState([]);
  const [departments,setDepts]      = useState([]);
  const [viewMode,   setViewMode]   = useState('table'); // 'table' | 'calendar'

  const [month, setMonth] = useState(dayjs());
  const [deptId, setDeptId] = useState(null);

  const [assignModal, setAssignModal] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month: month.month() + 1, year: month.year() };
      if (deptId) params.departmentId = deptId;
      const res = await getSchedule(params);
      setSchedule(res.data || []);
    } catch { message.error('Không thể tải lịch ca'); }
    finally { setLoading(false); }
  }, [month, deptId]);

  useEffect(() => {
    getAllEmployeesForDropdown().then(r => setEmployees(r.data.data || [])).catch(() => {});
    getAllDepartments().then(r => setDepts(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async () => {
    try {
      const vals = await form.validateFields();
      const dates = vals.dateRange ?
        Array.from({ length: vals.dateRange[1].diff(vals.dateRange[0], 'day') + 1 },
          (_, i) => vals.dateRange[0].add(i, 'day').toISOString()) :
        [vals.workDate?.toISOString()].filter(Boolean);

      const assignments = vals.employeeIds.flatMap(empId =>
        dates.map(date => ({
          employeeId: empId,
          shiftTemplateId: vals.shiftTemplateId,
          workDate: date,
          isOff: vals.isOff || false,
          note: vals.note,
        }))
      );

      await assignShifts(assignments);
      message.success(`Đã phân ${assignments.length} lịch ca`);
      setAssignModal(false);
      form.resetFields();
      load();
    } catch (err) {
      if (err.response) message.error(err.response.data?.message || 'Lỗi phân ca');
    }
  };

  // Group schedule by date for calendar view
  const scheduleByDate = {};
  schedule.forEach(s => {
    const d = dayjs(s.workDate).format('YYYY-MM-DD');
    if (!scheduleByDate[d]) scheduleByDate[d] = [];
    scheduleByDate[d].push(s);
  });

  const calendarCellRender = (value) => {
    const key = value.format('YYYY-MM-DD');
    const items = scheduleByDate[key] || [];
    return items.slice(0, 3).map((item, i) => (
      <Tooltip key={i} title={`${item.employee?.fullName} — ${item.shiftTemplate?.name || 'Nghỉ'}`}>
        <div style={{
          fontSize: 10,
          borderRadius: 3,
          padding: '1px 4px',
          marginBottom: 2,
          background: item.isOff ? '#f3f4f6' : (item.shiftTemplate?.color || '#1677ff') + '22',
          color: item.isOff ? '#9ca3af' : item.shiftTemplate?.color || '#1677ff',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.employee?.fullName?.split(' ').slice(-1)[0]} — {item.isOff ? 'Nghỉ' : item.shiftTemplate?.name || '?'}
        </div>
      </Tooltip>
    ));
  };

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'workDate',
      width: 110,
      sorter: (a, b) => new Date(a.workDate) - new Date(b.workDate),
      render: d => <Text strong>{dayjs(d).format('DD/MM/YYYY (ddd)')}</Text>,
    },
    {
      title: 'Nhân viên',
      dataIndex: 'employee',
      render: emp => emp ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: '#1677ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0,
          }}>{emp.fullName?.[0]}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.fullName}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{emp.empCode}</div>
          </div>
        </div>
      ) : '—',
    },
    {
      title: 'Ca làm việc',
      dataIndex: 'shiftTemplate',
      render: (s, r) => r.isOff ? (
        <Tag color="default">Ngày nghỉ</Tag>
      ) : s ? (
        <Tag color="blue" style={{ fontSize: 12 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: s.color || '#1677ff', marginRight: 6 }} />
          {s.name} ({s.startTime}–{s.endTime})
        </Tag>
      ) : (
        <Tag color="default">Chưa xếp ca</Tag>
      ),
    },
    {
      title: 'Giờ công',
      dataIndex: ['shiftTemplate', 'workingHours'],
      align: 'center',
      render: h => h ? `${h}h` : '—',
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      ellipsis: true,
      render: n => n || '—',
    },
  ];

  return (
    <div style={{ padding: 'clamp(16px,3vw,24px) clamp(12px,3vw,28px)', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>📅 Lịch ca kíp</Title>
          <Text type="secondary">Xem và phân công ca làm việc cho nhân viên</Text>
        </div>
        <Space>
          <Button
            icon={viewMode === 'table' ? <CalendarOutlined /> : <TableOutlined />}
            onClick={() => setViewMode(v => v === 'table' ? 'calendar' : 'table')}
            style={{ borderRadius: 8 }}
          >
            {viewMode === 'table' ? 'Xem lịch' : 'Xem bảng'}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAssignModal(true)} style={{ borderRadius: 8 }}>
            Phân ca
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <Card bordered={false} style={{ borderRadius: 14, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Space wrap>
          <DatePicker picker="month" value={month} onChange={v => setMonth(v || dayjs())}
            format="MM/YYYY" style={{ borderRadius: 8 }} />
          <Select allowClear placeholder="Phòng ban" style={{ width: 200 }} onChange={v => setDeptId(v)}>
            {departments.map(d => <Option key={d._id} value={d._id}>{d.name}</Option>)}
          </Select>
          <Button onClick={load} type="primary" style={{ borderRadius: 8 }}>Tìm</Button>
        </Space>
      </Card>

      {/* Content */}
      {viewMode === 'table' ? (
        <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Table
            columns={columns}
            dataSource={schedule}
            rowKey="_id"
            loading={loading}
            size="small"
            pagination={{ pageSize: 20, showTotal: t => `${t} bản ghi` }}
          />
        </Card>
      ) : (
        <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Calendar
            value={month}
            cellRender={calendarCellRender}
            headerRender={({ value, onChange }) => (
              <div style={{ padding: '8px 16px', display: 'flex', gap: 12 }}>
                <DatePicker picker="month" value={value} onChange={v => { onChange(v); setMonth(v); }}
                  format="MM/YYYY" allowClear={false} />
              </div>
            )}
          />
        </Card>
      )}

      {/* Assign Modal */}
      <Modal title="Phân ca làm việc" open={assignModal}
        onOk={handleAssign} onCancel={() => { setAssignModal(false); form.resetFields(); }}
        okText="Phân ca" cancelText="Hủy" width={540}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Nhân viên" name="employeeIds" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
            <Select mode="multiple" placeholder="Chọn nhân viên" showSearch allowClear
              filterOption={(input, opt) => opt.children?.toLowerCase().includes(input.toLowerCase())}>
              {employees.map(e => <Option key={e._id} value={e._id}>{e.fullName} ({e.empCode})</Option>)}
            </Select>
          </Form.Item>
          <Row gutter={[12, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label="Khoảng ngày" name="dateRange" rules={[{ required: true }]}>
                <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Ngày nghỉ?" name="isOff" initialValue={false}>
                <Select>
                  <Option value={false}>Có đi làm</Option>
                  <Option value={true}>Ngày nghỉ</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Ghi chú" name="note">
            <Input placeholder="Ghi chú thêm..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
