import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Space, Modal, Form, Input,
  InputNumber, Switch, Typography, message, Popconfirm, Row, Col,
  DatePicker, Tabs, Select, Tooltip, Badge, Collapse,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  EnvironmentOutlined, CalendarOutlined, ApartmentOutlined,
  CheckCircleOutlined, BellOutlined, UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getLocations, createLocation, updateLocation, deleteLocation,
  getHolidays, createHoliday, updateHoliday, deleteHoliday,
  getApprovalFlows, createApprovalFlow, updateApprovalFlow, deleteApprovalFlow,
} from '../../utils/settingsApi';

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

// ─────────────────────────────────────────────────────────────────────
// Panel 1: GPS Locations
// ─────────────────────────────────────────────────────────────────────
function LocationsPanel() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getLocations(); setData(r.data || []); } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (record = null) => {
    setEditing(record);
    record ? form.setFieldsValue({ ...record }) : form.resetFields();
    setModal(true);
  };

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      if (editing) {
        await updateLocation(editing._id, vals);
        message.success('Đã cập nhật địa điểm');
      } else {
        await createLocation(vals);
        message.success('Đã thêm địa điểm');
      }
      setModal(false);
      load();
    } catch (err) {
      if (err.response) message.error(err.response.data?.message || 'Lỗi');
    }
  };

  const handleDelete = async (id) => {
    await deleteLocation(id);
    message.success('Đã vô hiệu hóa');
    load();
  };

  const autoFillGPS = () => {
    if (!navigator.geolocation) { message.error('Trình duyệt không hỗ trợ GPS'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        form.setFieldsValue({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        message.success(`Đã lấy tọa độ: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
      },
      () => message.error('Không thể lấy GPS')
    );
  };

  const columns = [
    {
      title: 'Tên địa điểm',
      dataIndex: 'name',
      render: (name, r) => (
        <div>
          <Text strong>{name}</Text>
          {!r.isActive && <Tag color="default" style={{ marginLeft: 8 }}>Vô hiệu</Tag>}
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.address}</div>
        </div>
      ),
    },
    {
      title: 'Tọa độ',
      render: (_, r) => (
        <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
          {r.latitude?.toFixed(6)}, {r.longitude?.toFixed(6)}
        </Text>
      ),
    },
    {
      title: 'Bán kính',
      dataIndex: 'allowedRadius',
      align: 'center',
      render: r => <Tag color="blue">{r}m</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      align: 'center',
      render: v => v
        ? <Tag color="success">Hoạt động</Tag>
        : <Tag color="default">Vô hiệu</Tag>,
    },
    {
      title: '',
      width: 90,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Popconfirm title="Vô hiệu hóa địa điểm này?" onConfirm={() => handleDelete(r._id)} okText="Xác nhận">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>📍 Tọa độ GPS văn phòng / chi nhánh</Text>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Nhân viên phải ở trong bán kính cho phép để chấm công</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ borderRadius: 8 }}>
          Thêm địa điểm
        </Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="_id" loading={loading} size="small" pagination={false} />

      <Modal title={editing ? 'Sửa địa điểm' : 'Thêm địa điểm mới'} open={modal}
        onOk={handleSave} onCancel={() => setModal(false)} okText="Lưu" cancelText="Hủy">
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="Tên địa điểm" name="name" rules={[{ required: true }]}>
            <Input placeholder="VD: Văn phòng Hà Nội" />
          </Form.Item>
          <Form.Item label="Địa chỉ" name="address">
            <Input placeholder="Địa chỉ đầy đủ..." />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <Form.Item label="Vĩ độ (Latitude)" name="latitude" rules={[{ required: true }]} style={{ flex: 1, margin: 0 }}>
              <InputNumber style={{ width: '100%' }} step={0.000001} precision={6} placeholder="10.762622" />
            </Form.Item>
            <Form.Item label="Kinh độ (Longitude)" name="longitude" rules={[{ required: true }]} style={{ flex: 1, margin: 0 }}>
              <InputNumber style={{ width: '100%' }} step={0.000001} precision={6} placeholder="106.660172" />
            </Form.Item>
            <Button icon={<EnvironmentOutlined />} onClick={autoFillGPS} style={{ marginBottom: 0, borderRadius: 8 }}>
              Lấy GPS
            </Button>
          </div>
          <Form.Item label="Bán kính cho phép (mét)" name="allowedRadius" initialValue={100} style={{ marginTop: 16 }}>
            <InputNumber min={10} max={5000} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Panel 2: Holiday Calendar
// ─────────────────────────────────────────────────────────────────────
function HolidaysPanel() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const year = dayjs().year();

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getHolidays({ year }); setData(r.data || []); } catch {}
    finally { setLoading(false); }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const openModal = (record = null) => {
    setEditing(record);
    record
      ? form.setFieldsValue({ ...record, date: dayjs(record.date) })
      : form.resetFields();
    setModal(true);
  };

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      const payload = { ...vals, date: vals.date.toISOString() };
      if (editing) {
        await updateHoliday(editing._id, payload);
        message.success('Đã cập nhật ngày lễ');
      } else {
        await createHoliday(payload);
        message.success('Đã thêm ngày lễ');
      }
      setModal(false);
      load();
    } catch (err) {
      if (err.response) message.error(err.response.data?.message || 'Lỗi');
    }
  };

  const handleDelete = async (id) => {
    await deleteHoliday(id);
    message.success('Đã xóa');
    load();
  };

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      render: d => <Text strong>{dayjs(d).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Tên ngày lễ',
      dataIndex: 'name',
      render: (name, r) => (
        <div>
          <Text strong>{name}</Text>
          {r.isRecurringYearly && <Tag color="purple" style={{ marginLeft: 8, fontSize: 10 }}>Hàng năm</Tag>}
          {r.isHalfDay && <Tag color="orange" style={{ marginLeft: 4, fontSize: 10 }}>Nửa ngày</Tag>}
        </div>
      ),
    },
    { title: 'Thứ', dataIndex: 'date', render: d => dayjs(d).format('dddd') },
    {
      title: '',
      width: 90,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Popconfirm title="Xóa ngày lễ này?" onConfirm={() => handleDelete(r._id)} okText="Xóa">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>🎉 Lịch nghỉ lễ năm {year}</Text>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Các ngày lễ sẽ được trừ khỏi số ngày nghỉ phép tính được</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ borderRadius: 8 }}>
          Thêm ngày lễ
        </Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="_id" loading={loading} size="small" pagination={false} />

      <Modal title={editing ? 'Sửa ngày lễ' : 'Thêm ngày lễ'} open={modal}
        onOk={handleSave} onCancel={() => setModal(false)} okText="Lưu" cancelText="Hủy">
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Ngày lễ" name="date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Tên ngày lễ" name="name" rules={[{ required: true }]}>
                <Input placeholder="VD: Tết Nguyên Đán" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Lặp lại hàng năm?" name="isRecurringYearly" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Nghỉ nửa ngày?" name="isHalfDay" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers cho ApprovalFlow
// ─────────────────────────────────────────────────────────────────────
const APPROVER_TYPE_OPTIONS = [
  { value: 'direct-manager',    label: '👤 Quản lý trực tiếp (reportsTo)' },
  { value: 'department-manager',label: '🏢 Trưởng phòng' },
  { value: 'hr',                label: '📋 HR' },
  { value: 'ceo',               label: '👑 Giám đốc (CEO)' },
  { value: 'specific-employee', label: '🔍 Người cụ thể' },
];

const REQUEST_TYPE_OPTIONS = [
  { value: 'leave',    label: '🌴 Nghỉ phép' },
  { value: 'overtime', label: '⚡ Làm thêm giờ' },
  { value: 'asset',   label: '🖥️ Tài sản' },
];

const REQUEST_TYPE_COLOR = { leave: 'green', overtime: 'orange', asset: 'blue' };

// Render danh sách step đẹp
function StepBadges({ steps = [] }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {steps.map((s, i) => (
        <Tooltip
          key={i}
          title={`Deadline: ${s.deadlineHours}h${s.canSkipIfNoManager ? ' · Có thể bỏ qua' : ''}`}
        >
          <Tag
            icon={s.notifyOnly ? <BellOutlined /> : <CheckCircleOutlined />}
            color={s.notifyOnly ? 'default' : 'processing'}
            style={{ fontSize: 11 }}
          >
            {`B${s.step}: `}
            {APPROVER_TYPE_OPTIONS.find(o => o.value === s.approverType)?.label || s.approverType}
            {s.notifyOnly && ' (Notify)'}
          </Tag>
        </Tooltip>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Panel 3: Approval Flows
// ─────────────────────────────────────────────────────────────────────

// Default 2 bước chuẩn
const DEFAULT_STEPS = [
  { step: 1, label: 'Quản lý trực tiếp', approverType: 'direct-manager', notifyOnly: false, deadlineHours: 48, canSkipIfNoManager: true },
  { step: 2, label: 'HR theo dõi',       approverType: 'hr',             notifyOnly: true,  deadlineHours: 24, canSkipIfNoManager: false },
];

function ApprovalFlowsPanel() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [steps, setSteps]     = useState(DEFAULT_STEPS);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getApprovalFlows(); setData(r.data || []); } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (record = null) => {
    setEditing(record);
    if (record) {
      form.setFieldsValue({
        name: record.name,
        requestType: record.requestType,
        isDefault: record.isDefault,
      });
      setSteps(record.steps || []);
    } else {
      form.resetFields();
      setSteps(DEFAULT_STEPS);
    }
    setModal(true);
  };

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      if (editing) {
        await updateApprovalFlow(editing._id, { ...vals, steps });
        message.success('Đã cập nhật luồng phê duyệt');
      } else {
        await createApprovalFlow({ ...vals, steps });
        message.success('Đã tạo luồng phê duyệt');
      }
      setModal(false);
      load();
    } catch (err) {
      if (err.response) message.error(err.response.data?.message || 'Lỗi lưu luồng');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteApprovalFlow(id);
      message.success('Đã xóa luồng phê duyệt');
      load();
    } catch (err) {
      if (err.response) message.error(err.response.data?.message || 'Lỗi khi xóa luồng');
    }
  };

  const addStep = () => {
    setSteps(prev => [
      ...prev,
      {
        step: prev.length + 1,
        label: '',
        approverType: 'hr',
        notifyOnly: false,
        deadlineHours: 48,
        canSkipIfNoManager: false,
      },
    ]);
  };

  const removeStep = (idx) => {
    setSteps(prev =>
      prev
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, step: i + 1 }))
    );
  };

  const updateStep = (idx, field, value) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const columns = [
    {
      title: 'Tên luồng',
      dataIndex: 'name',
      render: (name, r) => (
        <div>
          <Text strong>{name}</Text>
          {r.isDefault && <Tag color="gold" style={{ marginLeft: 8, fontSize: 10 }}>Mặc định</Tag>}
          {!r.isActive && <Tag color="default" style={{ marginLeft: 4, fontSize: 10 }}>Vô hiệu</Tag>}
        </div>
      ),
    },
    {
      title: 'Loại yêu cầu',
      dataIndex: 'requestType',
      width: 150,
      render: t => (
        <Tag color={REQUEST_TYPE_COLOR[t]}>
          {REQUEST_TYPE_OPTIONS.find(o => o.value === t)?.label || t}
        </Tag>
      ),
    },
    {
      title: 'Các bước phê duyệt',
      dataIndex: 'steps',
      render: steps => <StepBadges steps={steps} />,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      align: 'center',
      width: 110,
      render: v => v
        ? <Badge status="success" text="Hoạt động" />
        : <Badge status="default" text="Vô hiệu" />,
    },
    {
      title: '',
      width: 90,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Popconfirm title="Xóa luồng phê duyệt này?" onConfirm={() => handleDelete(r._id)} okText="Xóa">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>🔀 Luồng phê duyệt (Approval Flows)</Text>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            Cấu hình các bước phê duyệt cho từng loại yêu cầu (nghỉ phép, OT, tài sản)
          </div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ borderRadius: 8 }}>
          Tạo luồng mới
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="_id"
        loading={loading}
        size="small"
        pagination={false}
        locale={{ emptyText: '📭 Chưa có luồng phê duyệt nào. Hãy tạo luồng đầu tiên!' }}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editing ? "Sửa luồng phê duyệt" : "Tạo luồng phê duyệt mới"}
        open={modal}
        onOk={handleSave}
        onCancel={() => setModal(false)}
        okText={editing ? "Lưu" : "Tạo luồng"}
        cancelText="Hủy"
        width={680}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item label="Tên luồng" name="name" rules={[{ required: true, message: 'Nhập tên luồng' }]}>
                <Input placeholder="VD: Phê duyệt nghỉ phép 2 tầng" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="Loại yêu cầu" name="requestType" rules={[{ required: true, message: 'Chọn loại' }]}>
                <Select placeholder="Chọn loại yêu cầu">
                  {REQUEST_TYPE_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Đặt làm mặc định?" name="isDefault" valuePropName="checked" initialValue={false}>
                <Switch checkedChildren="Mặc định" unCheckedChildren="Không" />
              </Form.Item>
            </Col>
          </Row>

          {/* Steps Builder */}
          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text strong style={{ fontSize: 13 }}>🔢 Các bước phê duyệt</Text>
              <Button size="small" icon={<PlusOutlined />} onClick={addStep}>Thêm bước</Button>
            </div>

            {steps.map((step, idx) => (
              <Card
                key={idx}
                size="small"
                style={{
                  marginBottom: 10,
                  borderRadius: 10,
                  border: '1.5px solid',
                  borderColor: step.notifyOnly ? '#e5e7eb' : '#bfdbfe',
                  background: step.notifyOnly ? '#fafafa' : '#eff6ff',
                }}
                bodyStyle={{ padding: '10px 14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Step number */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: step.notifyOnly ? '#9ca3af' : '#1677ff',
                    color: '#fff', fontWeight: 700, fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {step.step}
                  </div>

                  {/* Label */}
                  <Input
                    placeholder={`Tên bước ${step.step}`}
                    value={step.label}
                    onChange={e => updateStep(idx, 'label', e.target.value)}
                    style={{ flex: 1, minWidth: 130 }}
                    size="small"
                  />

                  {/* Approver type */}
                  <Select
                    value={step.approverType}
                    onChange={v => updateStep(idx, 'approverType', v)}
                    style={{ minWidth: 200 }}
                    size="small"
                  >
                    {APPROVER_TYPE_OPTIONS.map(o => <Option key={o.value} value={o.value}>{o.label}</Option>)}
                  </Select>

                  {/* Deadline */}
                  <Tooltip title="Số giờ tối đa để phê duyệt">
                    <InputNumber
                      min={1}
                      max={720}
                      value={step.deadlineHours}
                      onChange={v => updateStep(idx, 'deadlineHours', v)}
                      addonAfter="giờ"
                      size="small"
                      style={{ width: 110 }}
                    />
                  </Tooltip>

                  {/* Notify only */}
                  <Tooltip title="Chỉ nhận thông báo, không cần phê duyệt">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <BellOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                      <Switch
                        size="small"
                        checked={step.notifyOnly}
                        onChange={v => updateStep(idx, 'notifyOnly', v)}
                      />
                    </div>
                  </Tooltip>

                  {/* Skip if no manager */}
                  <Tooltip title="Bỏ qua bước này nếu không tìm thấy người phê duyệt">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <UserOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                      <Switch
                        size="small"
                        checked={step.canSkipIfNoManager}
                        onChange={v => updateStep(idx, 'canSkipIfNoManager', v)}
                      />
                    </div>
                  </Tooltip>

                  {/* Remove step */}
                  {steps.length > 1 && (
                    <Popconfirm title="Xóa bước này?" onConfirm={() => removeStep(idx)} okText="Xóa">
                      <Button size="small" danger icon={<DeleteOutlined />} type="text" />
                    </Popconfirm>
                  )}
                </div>

                {/* Legend dưới step */}
                <div style={{ marginTop: 4, fontSize: 11, color: '#9ca3af', paddingLeft: 38 }}>
                  {step.notifyOnly
                    ? '🔔 Chỉ gửi thông báo, không yêu cầu hành động'
                    : '✅ Yêu cầu phê duyệt / từ chối'}
                  {step.canSkipIfNoManager && ' · ⏩ Tự bỏ qua nếu không có người phê duyệt'}
                </div>
              </Card>
            ))}
          </div>
        </Form>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Main Settings Page (Tabs)
// ─────────────────────────────────────────────────────────────────────
const TAB_ITEMS = [
  {
    key: 'gps',
    label: (
      <span>
        <EnvironmentOutlined /> GPS & Địa điểm
      </span>
    ),
    children: (
      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <LocationsPanel />
      </Card>
    ),
  },
  {
    key: 'holidays',
    label: (
      <span>
        <CalendarOutlined /> Lịch nghỉ lễ
      </span>
    ),
    children: (
      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <HolidaysPanel />
      </Card>
    ),
  },
  {
    key: 'approval-flows',
    label: (
      <span>
        <ApartmentOutlined /> Luồng phê duyệt
      </span>
    ),
    children: (
      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <ApprovalFlowsPanel />
      </Card>
    ),
  },
];

export default function AttendanceSettings() {
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>⚙️ Cài đặt chấm công</Title>
        <Text type="secondary">Cấu hình tọa độ GPS, ngày nghỉ lễ và luồng phê duyệt</Text>
      </div>

      <Tabs
        defaultActiveKey="gps"
        type="card"
        size="middle"
        items={TAB_ITEMS}
        style={{ '--ant-tabs-card-height': '40px' }}
      />
    </div>
  );
}
