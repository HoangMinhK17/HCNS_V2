import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Space, Modal, Form, Input,
  Select, DatePicker, Typography, message, Popconfirm, Descriptions, Row, Col, Badge,
} from 'antd';
import { PlusOutlined, SendOutlined, CloseOutlined, EyeOutlined, CrownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createAssetRequest, getMyAssetRequests, submitRequest, cancelRequest } from '../../utils/essApi';

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_TAG = {
  draft: { color: 'default', label: 'Nháp' },
  pending: { color: 'processing', label: 'Chờ duyệt' },
  approved: { color: 'success', label: 'Đã duyệt' },
  rejected: { color: 'error', label: 'Từ chối' },
  cancelled: { color: 'default', label: 'Đã hủy' },
  fulfilled: { color: 'green', label: 'Đã cấp phát' },
};

const REQUEST_TYPE = {
  new: { label: '🆕 Cấp mới', color: 'blue' },
  repair: { label: '🔧 Sửa chữa', color: 'orange' },
  replace: { label: '🔄 Thay thế', color: 'purple' },
  return: { label: '↩️ Trả lại', color: 'default' },
};

const URGENCY = {
  low: { label: 'Thấp', color: 'default' },
  medium: { label: 'Bình thường', color: 'orange' },
  high: { label: 'Khẩn cấp', color: 'red' },
};

// Đọc user từ localStorage
const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
};

const ADMIN_ROLES = ['super-admin', 'hr-admin'];

export default function AssetRequestPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState(undefined);
  const [form] = Form.useForm();

  const user = getStoredUser();
  const isAdmin = ADMIN_ROLES.includes(user?.roleCode);

  const load = useCallback(async (status) => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      const res = await getMyAssetRequests(params);
      setRequests(res?.data || []);
    } catch {
      message.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFilterStatus = (val) => {
    setFilterStatus(val);
    load(val);
  };

  const handleCreate = async () => {
    try {
      const vals = await form.validateFields();
      await createAssetRequest({
        requestType: vals.requestType,
        assetName: vals.assetName,
        assetCode: vals.assetCode,
        quantity: vals.quantity || 1,
        reason: vals.reason,
        urgency: vals.urgency || 'medium',
        expectedDate: vals.expectedDate?.toISOString(),
      });
      message.success('Đã tạo đề xuất tài sản');
      setModalOpen(false);
      form.resetFields();
      load(filterStatus);
    } catch (err) {
      if (err.response) message.error(err.response.data?.message || 'Lỗi tạo đề xuất');
    }
  };

  // Optimistic update: cập nhật status trong state ngay lập tức, không reload cả table
  const updateLocalStatus = (id, newStatus) => {
    setRequests(prev => prev.map(r => r._id === id ? { ...r, status: newStatus } : r));
  };

  const handleSubmit = async (id) => {
    updateLocalStatus(id, 'pending'); // Cập nhật ngay, không đợi API
    try {
      await submitRequest('asset', id);
      message.success('Đã gửi đề xuất');
    } catch (err) {
      updateLocalStatus(id, 'draft'); // Rollback nếu API lỗi
      message.error(err.response?.data?.message || 'Lỗi gửi');
    }
  };

  const handleCancel = async (id) => {
    updateLocalStatus(id, 'cancelled'); // Cập nhật ngay, không đợi API
    try {
      await cancelRequest('asset', id, {});
      message.success('Đã hủy đề xuất');
    } catch (err) {
      // Rollback: reload lại từ server
      load(filterStatus);
      message.error(err.response?.data?.message || 'Lỗi hủy');
    }
  };

  // ── Cột base (tất cả role đều thấy) ────────────────────────────
  const baseColumns = [
    {
      title: 'Tài sản',
      dataIndex: 'assetName',
      render: (name, r) => (
        <div>
          <Text strong>{name}</Text>
          {r.assetCode && (
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>#{r.assetCode}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Loại đề xuất',
      dataIndex: 'requestType',
      render: t => <Tag color={REQUEST_TYPE[t]?.color}>{REQUEST_TYPE[t]?.label}</Tag>,
    },
    { title: 'SL', dataIndex: 'quantity', align: 'center', width: 55 },
    {
      title: 'Mức độ',
      dataIndex: 'urgency',
      render: u => <Tag color={URGENCY[u]?.color}>{URGENCY[u]?.label}</Tag>,
    },
    {
      title: 'Cần trước',
      dataIndex: 'expectedDate',
      render: d => d ? dayjs(d).format('DD/MM/YYYY') : '—',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: s => <Badge status={STATUS_TAG[s]?.color === 'processing' ? 'processing' : undefined}
        text={<Tag color={STATUS_TAG[s]?.color}>{STATUS_TAG[s]?.label}</Tag>} />,
    },
  ];

  // ── Cột chỉ admin thấy: tên nhân viên + người tạo ──────────────
  const adminColumns = [
    {
      title: 'Nhân viên',
      dataIndex: 'employee',
      render: emp => emp ? (
        <div>
          <Text strong style={{ fontSize: 13 }}>{emp.fullName || '—'}</Text>
          {emp.employeeCode && (
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>#{emp.employeeCode}</Text>
          )}
        </div>
      ) : '—',
    },
    {
      title: 'Người tạo',
      dataIndex: 'createdBy',
      render: cb => cb ? (
        <Text style={{ fontSize: 12, color: '#6b7280' }}>{cb.username || cb.email || '—'}</Text>
      ) : '—',
    },
  ];

  // ── Cột thao tác ────────────────────────────────────────────────
  const actionColumn = {
    title: 'Thao tác',
    width: 150,
    render: (_, r) => (
      <Space size={4}>
        <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelected(r); setDetailModal(true); }}>
          Xem
        </Button>
        {r.status === 'draft' && (
          <Popconfirm title="Gửi đề xuất này?" onConfirm={() => handleSubmit(r._id)} okText="Gửi" cancelText="Không">
            <Button size="small" type="primary" icon={<SendOutlined />}>Gửi</Button>
          </Popconfirm>
        )}
        {['draft', 'pending'].includes(r.status) && (
          <Popconfirm title="Hủy đề xuất?" onConfirm={() => handleCancel(r._id)} okText="Hủy" cancelText="Không">
            <Button size="small" danger icon={<CloseOutlined />} />
          </Popconfirm>
        )}
      </Space>
    ),
  };

  // Ghép cột theo role
  const columns = isAdmin
    ? [...baseColumns.slice(0, 1), ...adminColumns, ...baseColumns.slice(1), actionColumn]
    : [...baseColumns, actionColumn];

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            🖥️ Đề xuất tài sản
            {isAdmin && (
              <Tag color="gold" icon={<CrownOutlined />} style={{ marginLeft: 10, fontSize: 12, verticalAlign: 'middle' }}>
                Chế độ Admin – Xem tất cả
              </Tag>
            )}
          </Title>
          <Text type="secondary">
            {isAdmin
              ? 'Danh sách toàn bộ đề xuất tài sản của công ty'
              : 'Xin cấp phát, sửa chữa hoặc trả lại tài sản công ty'}
          </Text>
        </div>
        <Space>
          {/* Filter trạng thái */}
          <Select
            allowClear
            placeholder="Lọc trạng thái"
            style={{ width: 150 }}
            value={filterStatus}
            onChange={handleFilterStatus}
          >
            {Object.entries(STATUS_TAG).map(([k, v]) => (
              <Option key={k} value={k}>{v.label}</Option>
            ))}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ borderRadius: 8 }}>
            Tạo đề xuất
          </Button>
        </Space>
      </div>

      <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="_id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 10, showTotal: (t) => `Tổng ${t} đề xuất` }}
          locale={{ emptyText: '📭 Chưa có đề xuất tài sản nào' }}
        />
      </Card>

      {/* Create Modal */}
      <Modal
        title="Đề xuất tài sản mới"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        okText="Tạo" cancelText="Hủy" width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Loại đề xuất" name="requestType" rules={[{ required: true, message: 'Vui lòng chọn loại' }]}>
                <Select placeholder="Chọn loại">
                  {Object.entries(REQUEST_TYPE).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Mức độ ưu tiên" name="urgency" initialValue="medium">
                <Select>
                  {Object.entries(URGENCY).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item label="Tên tài sản" name="assetName" rules={[{ required: true, message: 'Vui lòng nhập tên tài sản' }]}>
                <Input placeholder="VD: Laptop Dell XPS 15, Ghế công thái học..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Số lượng" name="quantity" initialValue={1}>
                <Input type="number" min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Mã tài sản hiện tại (nếu có)" name="assetCode">
            <Input placeholder="VD: ASSET-001" />
          </Form.Item>
          <Form.Item label="Cần trước ngày" name="expectedDate">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="Lý do / Mô tả" name="reason" rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}>
            <Input.TextArea rows={3} placeholder="Mô tả nhu cầu sử dụng..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title="Chi tiết đề xuất tài sản"
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={null}
        width={540}
      >
        {selected && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 12 }}>
            <Descriptions.Item label="Tên tài sản" span={2}>
              <Text strong>{selected.assetName}</Text>
            </Descriptions.Item>
            {isAdmin && selected.employee && (
              <Descriptions.Item label="Nhân viên" span={2}>
                {selected.employee.fullName || '—'}
                {selected.employee.employeeCode && ` (#${selected.employee.employeeCode})`}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Loại">
              <Tag color={REQUEST_TYPE[selected.requestType]?.color}>{REQUEST_TYPE[selected.requestType]?.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Mức độ">
              <Tag color={URGENCY[selected.urgency]?.color}>{URGENCY[selected.urgency]?.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Số lượng">{selected.quantity}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={STATUS_TAG[selected.status]?.color}>{STATUS_TAG[selected.status]?.label}</Tag>
            </Descriptions.Item>
            {selected.assetCode && (
              <Descriptions.Item label="Mã tài sản" span={2}>#{selected.assetCode}</Descriptions.Item>
            )}
            {selected.expectedDate && (
              <Descriptions.Item label="Cần trước" span={2}>
                {dayjs(selected.expectedDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Lý do" span={2}>{selected.reason}</Descriptions.Item>
            {selected.fulfilledNote && (
              <Descriptions.Item label="Ghi chú cấp phát" span={2}>{selected.fulfilledNote}</Descriptions.Item>
            )}
            {isAdmin && selected.createdBy && (
              <Descriptions.Item label="Người tạo" span={2}>
                {selected.createdBy.username || selected.createdBy.email}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Ngày tạo" span={2}>
              {dayjs(selected.createdAt).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            {selected.status === 'cancelled' && selected.cancelledAt && (
              <Descriptions.Item label="Ngày hủy" span={2}>
                {dayjs(selected.cancelledAt).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            )}
            {selected.status === 'completed' && selected.fulfilledAt && (
              <Descriptions.Item label="Ngày cấp phát" span={2}>
                {dayjs(selected.fulfilledAt).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
