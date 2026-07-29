import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Space, Modal, Form, Input,
  Select, DatePicker, Typography, message, Popconfirm, Descriptions, Badge,
  Row, Col, Statistic,
} from 'antd';
import { PlusOutlined, SendOutlined, CloseOutlined, EyeOutlined, ThunderboltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  createOvertimeRequest, getMyOvertimeRequests,
  submitRequest, cancelRequest,
} from '../../utils/essApi';

const { Title, Text } = Typography;
const { Option } = Select;
const { TimePicker } = DatePicker;

const STATUS_TAG = {
  draft:     { color: 'default',    label: 'Nháp' },
  pending:   { color: 'processing', label: 'Chờ duyệt' },
  approved:  { color: 'success',    label: 'Đã duyệt' },
  rejected:  { color: 'error',      label: 'Từ chối' },
  cancelled: { color: 'default',    label: 'Đã hủy' },
};

const OT_TYPE = {
  weekday: { label: 'Ngày thường', color: 'blue' },
  weekend: { label: 'Cuối tuần',   color: 'purple' },
  holiday: { label: 'Ngày lễ',     color: 'red' },
};

const COMP_TYPE = {
  pay:   { label: 'Trả tiền OT',   color: 'gold' },
  leave: { label: 'Nghỉ bù',       color: 'green' },
};

export default function OvertimeManagement() {
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [detailModal,setDetailModal]= useState(false);
  const [selected,   setSelected]   = useState(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyOvertimeRequests();
      setRequests(res?.data || []);
    } catch (err) { message.error('Không thể tải dữ liệu: ' + (err.message || String(err))); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      const vals = await form.validateFields();
      await createOvertimeRequest({
        workDate:         vals.workDate.toISOString(),
        fromTime:         vals.fromTime.format('HH:mm'),
        toTime:           vals.toTime.format('HH:mm'),
        reason:           vals.reason,
        compensationType: vals.compensationType || 'pay',
      });
      message.success('Đã tạo đơn OT');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (err) {
      if (err.response) message.error(err.response.data?.message || 'Lỗi tạo đơn');
    }
  };

  const handleSubmit = async (id) => {
    try {
      await submitRequest('overtime', id);
      message.success('Đã gửi đơn OT');
      load();
    } catch (err) { message.error(err.response?.data?.message || 'Lỗi gửi'); }
  };

  const handleCancel = async (id) => {
    try {
      await cancelRequest('overtime', id, {});
      message.success('Đã hủy');
      load();
    } catch (err) { message.error(err.response?.data?.message || 'Lỗi hủy'); }
  };

  // Stats
  const totalHours = requests.filter(r => r.status === 'approved').reduce((s, r) => s + (r.totalHours || 0), 0);
  const pending = requests.filter(r => r.status === 'pending').length;

  const columns = [
    {
      title: 'Ngày OT',
      dataIndex: 'workDate',
      render: d => <Text strong>{dayjs(d).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Giờ',
      render: (_, r) => <Text>{r.fromTime} – {r.toTime}</Text>,
    },
    {
      title: 'Tổng giờ',
      dataIndex: 'totalHours',
      align: 'center',
      render: h => <Tag color="blue">{h}h</Tag>,
    },
    {
      title: 'Loại OT',
      dataIndex: 'otType',
      render: t => <Tag color={OT_TYPE[t]?.color}>{OT_TYPE[t]?.label}</Tag>,
    },
    {
      title: 'Bồi thường',
      dataIndex: 'compensationType',
      render: t => <Tag color={COMP_TYPE[t]?.color}>{COMP_TYPE[t]?.label}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: s => {
        const cfg = STATUS_TAG[s] || { color: 'default', label: s };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      width: 150,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailModal(true); }}>Xem</Button>
          {r.status === 'draft' && (
            <Popconfirm title="Gửi đơn?" onConfirm={() => handleSubmit(r._id)} okText="Gửi">
              <Button size="small" type="primary" icon={<SendOutlined />}>Gửi</Button>
            </Popconfirm>
          )}
          {['draft','pending'].includes(r.status) && (
            <Popconfirm title="Hủy đơn?" onConfirm={() => handleCancel(r._id)} okText="Hủy đơn">
              <Button size="small" danger icon={<CloseOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>⚡ Làm thêm giờ (OT)</Title>
          <Text type="secondary">Đăng ký và theo dõi giờ làm thêm</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ borderRadius: 8 }}>
          Đăng ký OT
        </Button>
      </div>

      {/* Stats */}
      <Row gutter={14} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 14, background: '#fffbeb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic title={<Text style={{ fontSize: 12, color: '#6b7280' }}>OT tháng này (đã duyệt)</Text>}
              value={totalHours} suffix="giờ" valueStyle={{ color: '#f59e0b', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 14, background: '#eff6ff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic title={<Text style={{ fontSize: 12, color: '#6b7280' }}>Chờ phê duyệt</Text>}
              value={pending} suffix="đơn" valueStyle={{ color: '#1677ff', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 14, background: '#f0fdf4', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic title={<Text style={{ fontSize: 12, color: '#6b7280' }}>Tổng đơn</Text>}
              value={requests.length} suffix="đơn" valueStyle={{ color: '#10b981', fontWeight: 700 }} />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table columns={columns} dataSource={requests} rowKey="_id" loading={loading} size="small"
          pagination={{ pageSize: 10 }} />
      </Card>

      {/* Create Modal */}
      <Modal title="Đăng ký làm thêm giờ" open={modalOpen}
        onOk={handleCreate} onCancel={() => { setModalOpen(false); form.resetFields(); }}
        okText="Tạo đơn" cancelText="Hủy" width={480}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Ngày làm OT" name="workDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Bắt đầu" name="fromTime" rules={[{ required: true }]}>
                <DatePicker.TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Kết thúc" name="toTime" rules={[{ required: true }]}>
                <DatePicker.TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Hình thức bồi thường" name="compensationType" initialValue="pay">
            <Select>
              <Option value="pay">💰 Trả tiền OT</Option>
              <Option value="leave">🌴 Nghỉ bù</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Lý do OT" name="reason" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Mô tả công việc cần làm thêm..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal title="Chi tiết OT" open={detailModal} onCancel={() => setDetailModal(false)} footer={null}>
        {selected && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 12 }}>
            <Descriptions.Item label="Ngày">{dayjs(selected.workDate).format('DD/MM/YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Giờ">{selected.fromTime} – {selected.toTime} ({selected.totalHours}h)</Descriptions.Item>
            <Descriptions.Item label="Loại OT"><Tag color={OT_TYPE[selected.otType]?.color}>{OT_TYPE[selected.otType]?.label}</Tag></Descriptions.Item>
            <Descriptions.Item label="Bồi thường"><Tag color={COMP_TYPE[selected.compensationType]?.color}>{COMP_TYPE[selected.compensationType]?.label}</Tag></Descriptions.Item>
            <Descriptions.Item label="Trạng thái" span={2}><Tag color={STATUS_TAG[selected.status]?.color}>{STATUS_TAG[selected.status]?.label}</Tag></Descriptions.Item>
            <Descriptions.Item label="Lý do" span={2}>{selected.reason}</Descriptions.Item>
            {selected.approvalHistory?.length > 0 && (
              <Descriptions.Item label="Lịch sử" span={2}>
                {selected.approvalHistory.map((h, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    <Tag color={h.action === 'approved' ? 'success' : h.action === 'rejected' ? 'error' : 'default'}>
                      Bước {h.step}: {h.action === 'approved' ? 'Duyệt' : h.action === 'rejected' ? 'Từ chối' : 'Ghi nhận'}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}> {dayjs(h.actionAt).format('HH:mm DD/MM')}</Text>
                  </div>
                ))}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
