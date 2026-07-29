import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Select, DatePicker, Space, Modal,
  Form, Input, Typography, message, Popconfirm, Descriptions, Badge,
  Tabs, Progress, Row, Col, Statistic,
} from 'antd';
import {
  PlusOutlined, SendOutlined, CloseOutlined, EyeOutlined,
  CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getLeaveTypes, getMyLeaveBalance, createLeaveRequest,
  getMyLeaveRequests, submitRequest, cancelRequest,
} from '../../utils/essApi';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const STATUS_TAG = {
  draft:     { color: 'default',  label: 'Nháp' },
  pending:   { color: 'processing', label: 'Chờ duyệt' },
  approved:  { color: 'success', label: 'Đã duyệt' },
  rejected:  { color: 'error',   label: 'Từ chối' },
  cancelled: { color: 'default', label: 'Đã hủy' },
};

export default function LeaveManagement() {
  const [leaveTypes,  setLeaveTypes]  = useState([]);
  const [balances,    setBalances]    = useState([]);
  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [typeRes, balRes, reqRes] = await Promise.all([
        getLeaveTypes(),
        getMyLeaveBalance(),
        getMyLeaveRequests(),
      ]);
      setLeaveTypes(typeRes?.data || []);
      setBalances(balRes?.data || []);
      setRequests(reqRes?.data || []);
    } catch { message.error('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      const vals = await form.validateFields();
      const [from, to] = vals.dateRange;
      await createLeaveRequest({
        leaveTypeId: vals.leaveTypeId,
        fromDate: from.toISOString(),
        toDate:   to.toISOString(),
        halfDay:  vals.halfDay || 'full',
        reason:   vals.reason,
      });
      message.success('Đã tạo đơn nghỉ phép');
      setModalOpen(false);
      form.resetFields();
      load();
    } catch (err) {
      if (err.response) message.error(err.response.data?.message || 'Lỗi tạo đơn');
    }
  };

  const handleSubmit = async (id) => {
    setSubmitting(true);
    try {
      await submitRequest('leave', id);
      message.success('Đã gửi đơn, đang chờ phê duyệt');
      load();
    } catch (err) { message.error(err.response?.data?.message || 'Lỗi gửi đơn'); }
    finally { setSubmitting(false); }
  };

  const handleCancel = async (id) => {
    try {
      await cancelRequest('leave', id, { cancelReason: 'Nhân viên tự hủy' });
      message.success('Đã hủy đơn');
      load();
    } catch (err) { message.error(err.response?.data?.message || 'Lỗi hủy'); }
  };

  const filteredRequests = activeTab === 'all' ? requests : requests.filter(r => r.status === activeTab);

  const columns = [
    {
      title: 'Loại phép',
      dataIndex: 'leaveType',
      render: lt => <Tag color="blue">{lt?.name || '—'}</Tag>,
    },
    {
      title: 'Từ ngày',
      dataIndex: 'fromDate',
      render: d => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: 'Đến ngày',
      dataIndex: 'toDate',
      render: d => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: 'Số ngày',
      dataIndex: 'totalDays',
      align: 'center',
      render: d => <Text strong>{d}</Text>,
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      ellipsis: true,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: s => {
        const cfg = STATUS_TAG[s] || { color: 'default', label: s };
        return <Badge status={cfg.color === 'success' ? 'success' : cfg.color === 'error' ? 'error' : cfg.color === 'processing' ? 'processing' : 'default'} text={<Tag color={cfg.color}>{cfg.label}</Tag>} />;
      },
    },
    {
      title: 'Thao tác',
      width: 150,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailModal(true); }}>Xem</Button>
          {r.status === 'draft' && (
            <Popconfirm title="Gửi đơn đi?" onConfirm={() => handleSubmit(r._id)} okText="Gửi" cancelText="Hủy">
              <Button size="small" type="primary" icon={<SendOutlined />} loading={submitting}>Gửi</Button>
            </Popconfirm>
          )}
          {['draft', 'pending'].includes(r.status) && (
            <Popconfirm title="Hủy đơn này?" onConfirm={() => handleCancel(r._id)} okText="Hủy đơn" cancelText="Không">
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
          <Title level={3} style={{ margin: 0 }}>🌴 Nghỉ phép</Title>
          <Text type="secondary">Xin nghỉ phép và theo dõi trạng thái đơn</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ borderRadius: 8 }}>
          Xin nghỉ phép
        </Button>
      </div>

      {/* Leave Balance Cards */}
      {balances.length > 0 && (
        <Row gutter={14} style={{ marginBottom: 20 }}>
          {balances.map(b => {
            const remaining = (b.allocated || 0) + (b.carryOver || 0) + (b.adjustment || 0) - (b.used || 0) - (b.pending || 0);
            const pct = b.allocated > 0 ? Math.round((b.used / b.allocated) * 100) : 0;
            return (
              <Col span={6} key={b._id}>
                <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <Text strong style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>
                    {b.leaveType?.name}
                  </Text>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <span style={{ fontSize: 28, fontWeight: 800, color: '#1677ff' }}>{remaining}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>/ {b.allocated} ngày</span>
                    </div>
                  </div>
                  <Progress percent={pct} size="small" strokeColor="#1677ff" showInfo={false} style={{ marginTop: 6 }} />
                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>Đã dùng: {b.used || 0} · Chờ: {b.pending || 0}</Text>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Requests Table */}
      <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} size="small" style={{ marginBottom: 16 }}
          items={[
            { key: 'all', label: 'Tất cả' },
            { key: 'pending', label: <Badge count={requests.filter(r=>r.status==='pending').length} size="small" offset={[6,-2]}>Chờ duyệt</Badge> },
            { key: 'approved', label: 'Đã duyệt' },
            { key: 'draft', label: 'Nháp' },
          ]}
        />
        <Table columns={columns} dataSource={filteredRequests} rowKey="_id"
          loading={loading} size="small"
          pagination={{ pageSize: 10, showTotal: t => `${t} đơn` }}
        />
      </Card>

      {/* Create Modal */}
      <Modal title="Xin nghỉ phép" open={modalOpen} onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        okText="Tạo đơn" cancelText="Hủy" width={520}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Loại phép" name="leaveTypeId" rules={[{ required: true, message: 'Chọn loại phép' }]}>
            <Select placeholder="Chọn loại phép" style={{ borderRadius: 8 }}>
              {leaveTypes.map(lt => (
                <Option key={lt._id} value={lt._id}>
                  {lt.name} {lt.isPaid ? '(Có lương)' : '(Không lương)'}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Khoảng thời gian" name="dateRange" rules={[{ required: true, message: 'Chọn ngày' }]}>
            <RangePicker style={{ width: '100%', borderRadius: 8 }} format="DD/MM/YYYY"
              disabledDate={d => d && d < dayjs().startOf('day')} />
          </Form.Item>
          <Form.Item label="Loại nghỉ" name="halfDay" initialValue="full">
            <Select>
              <Option value="full">Cả ngày</Option>
              <Option value="morning">Buổi sáng</Option>
              <Option value="afternoon">Buổi chiều</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Lý do" name="reason" rules={[{ required: true, message: 'Nhập lý do' }]}>
            <Input.TextArea rows={3} placeholder="Nhập lý do nghỉ phép..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal title="Chi tiết đơn nghỉ phép" open={detailModal}
        onCancel={() => setDetailModal(false)} footer={null} width={560}>
        {selected && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Loại phép">{selected.leaveType?.name}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={STATUS_TAG[selected.status]?.color}>{STATUS_TAG[selected.status]?.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Từ ngày">{dayjs(selected.fromDate).format('DD/MM/YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Đến ngày">{dayjs(selected.toDate).format('DD/MM/YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Số ngày" span={2}><Text strong>{selected.totalDays} ngày</Text></Descriptions.Item>
            <Descriptions.Item label="Lý do" span={2}>{selected.reason}</Descriptions.Item>
            {selected.approvalHistory?.length > 0 && (
              <Descriptions.Item label="Lịch sử duyệt" span={2}>
                {selected.approvalHistory.map((h, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <Tag color={h.action === 'approved' ? 'success' : h.action === 'rejected' ? 'error' : 'default'}>
                      Bước {h.step}: {h.action === 'approved' ? 'Đã duyệt' : h.action === 'rejected' ? 'Từ chối' : 'Ghi nhận'}
                    </Tag>
                    {h.comment && <Text type="secondary" style={{ fontSize: 12 }}> — {h.comment}</Text>}
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                      {dayjs(h.actionAt).format('HH:mm DD/MM')}
                    </Text>
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
