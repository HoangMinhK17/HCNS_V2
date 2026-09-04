import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Space, Typography, message,
  Popconfirm, Badge, Tabs, Modal, Input, Row, Col, Statistic, Empty, Spin,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  MailOutlined, BellOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getPendingApprovals, approveRequest } from '../../utils/essApi';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TYPE_LABEL = {
  leave:    { label: 'Nghỉ phép',    color: 'blue',   icon: '🌴' },
  overtime: { label: 'Làm thêm giờ', color: 'purple', icon: '⚡' },
  asset:    { label: 'Tài sản',      color: 'orange', icon: '🖥️' },
};

function ApprovalCard({ item, requestType, onAction, loading }) {
  const [comment, setComment] = useState('');
  const [rejectModal, setRejectModal] = useState(false);

  const handleApprove = () => onAction(requestType, item._id, 'approved', '');
  const handleReject  = () => { setRejectModal(true); };
  const confirmReject = () => {
    onAction(requestType, item._id, 'rejected', comment);
    setRejectModal(false);
    setComment('');
  };

  const emp = item.employee;
  const cfg = TYPE_LABEL[requestType] || { label: requestType, color: 'default', icon: '📋' };

  const getDetail = () => {
    if (requestType === 'leave') {
      return (
        <div style={{ marginTop: 8 }}>
          <Tag color="blue">{item.leaveType?.name}</Tag>
          <Text style={{ fontSize: 13 }}>
            {' '}{dayjs(item.fromDate).format('DD/MM')} – {dayjs(item.toDate).format('DD/MM/YYYY')}
            {' '}(<b>{item.totalDays} ngày</b>)
          </Text>
          <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>Lý do: {item.reason}</div>
        </div>
      );
    }
    if (requestType === 'overtime') {
      return (
        <div style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 13 }}>
            {dayjs(item.workDate).format('DD/MM/YYYY')} — {item.fromTime} đến {item.toTime} (<b>{item.totalHours}h</b>)
          </Text>
          <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>Lý do: {item.reason}</div>
        </div>
      );
    }
    if (requestType === 'asset') {
      return (
        <div style={{ marginTop: 8 }}>
          <Text strong>{item.assetName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}> × {item.quantity}</Text>
          <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>Lý do: {item.reason}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Card
        bordered={false}
        className="approval-card"
        style={{
          borderRadius: 14,
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
          marginBottom: 14,
          borderLeft: `4px solid ${requestType === 'leave' ? '#3b82f6' : requestType === 'overtime' ? '#8b5cf6' : '#f59e0b'}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Tag color={cfg.color} style={{ fontSize: 12 }}>{cfg.icon} {cfg.label}</Tag>
              <Text strong style={{ fontSize: 14 }}>
                {emp?.fullName || '—'}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>({emp?.empCode})</Text>
            </div>
            {getDetail()}
            <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
              Gửi lúc: {dayjs(item.submittedAt).format('HH:mm DD/MM/YYYY')}
            </div>
          </div>
          <Space>
            <Popconfirm
              title={`Phê duyệt ${cfg.label.toLowerCase()} này?`}
              onConfirm={handleApprove}
              okText="Duyệt" cancelText="Hủy"
              okButtonProps={{ style: { background: '#10b981', borderColor: '#10b981' } }}
            >
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                loading={loading}
                style={{ background: '#10b981', borderColor: '#10b981', borderRadius: 8 }}
              >
                Duyệt
              </Button>
            </Popconfirm>
            <Button
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={handleReject}
              style={{ borderRadius: 8 }}
            >
              Từ chối
            </Button>
          </Space>
        </div>
      </Card>

      <Modal title="Từ chối đề xuất" open={rejectModal}
        onOk={confirmReject} onCancel={() => setRejectModal(false)}
        okText="Xác nhận từ chối" okButtonProps={{ danger: true }}
        cancelText="Hủy">
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Vui lòng nhập lý do từ chối (tùy chọn):
        </Text>
        <TextArea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          placeholder="Lý do từ chối..."
        />
      </Modal>
    </>
  );
}

export default function ApprovalInbox() {
  const [data,    setData]    = useState({ leave: [], overtime: [], asset: [], totalPending: 0 });
  const [loading, setLoading] = useState(false);
  const [actLoading, setActLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPendingApprovals();
      setData(res.data || { leave: [], overtime: [], asset: [], totalPending: 0 });
    } catch { message.error('Không thể tải hộp phê duyệt'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (requestType, id, action, comment) => {
    setActLoading(true);
    try {
      await approveRequest(requestType, id, { action, comment });
      message.success(action === 'approved' ? '✅ Đã phê duyệt' : '❌ Đã từ chối');
      load();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi xử lý');
    } finally {
      setActLoading(false);
    }
  };

  const allItems = [
    ...data.leave.map(i => ({ ...i, _type: 'leave' })),
    ...data.overtime.map(i => ({ ...i, _type: 'overtime' })),
    ...data.asset.map(i => ({ ...i, _type: 'asset' })),
  ].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

  const displayed = activeTab === 'all' ? allItems
    : activeTab === 'leave' ? data.leave.map(i => ({ ...i, _type: 'leave' }))
    : activeTab === 'overtime' ? data.overtime.map(i => ({ ...i, _type: 'overtime' }))
    : data.asset.map(i => ({ ...i, _type: 'asset' }));

  return (
    <div style={{ padding: 'clamp(16px,3vw,24px) clamp(12px,3vw,28px)', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <MailOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            Hộp phê duyệt
            {data.totalPending > 0 && (
              <Badge count={data.totalPending} style={{ marginLeft: 10, background: '#ef4444' }} />
            )}
          </Title>
          <Text type="secondary">Phê duyệt các đề xuất từ nhân viên trong nhóm của bạn</Text>
        </div>
        <Button onClick={load} loading={loading} style={{ borderRadius: 8 }}>🔄 Làm mới</Button>
      </div>

      {/* Summary */}
      <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Tổng chờ duyệt', value: data.totalPending, color: '#ef4444', bg: '#fef2f2' },
          { label: 'Nghỉ phép', value: data.leave?.length, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Làm thêm giờ', value: data.overtime?.length, color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'Tài sản', value: data.asset?.length, color: '#f59e0b', bg: '#fffbeb' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={i}>
            <Card bordered={false} className="stat-card-hover"
              style={{ borderRadius: 14, background: s.bg, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <Statistic title={<Text style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</Text>}
                value={s.value || 0} valueStyle={{ color: s.color, fontWeight: 700, fontSize: 28 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} size="small" style={{ marginBottom: 16 }}
        items={[
          { key: 'all',      label: <Badge count={allItems.length} size="small" offset={[6,-2]}>Tất cả</Badge> },
          { key: 'leave',    label: <Badge count={data.leave?.length} size="small" offset={[6,-2]}>🌴 Nghỉ phép</Badge> },
          { key: 'overtime', label: <Badge count={data.overtime?.length} size="small" offset={[6,-2]}>⚡ OT</Badge> },
          { key: 'asset',    label: <Badge count={data.asset?.length} size="small" offset={[6,-2]}>🖥️ Tài sản</Badge> },
        ]}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : displayed.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Empty description="Không có đề xuất nào chờ phê duyệt" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      ) : (
        <div>
          {displayed.map(item => (
            <ApprovalCard
              key={item._id}
              item={item}
              requestType={item._type}
              onAction={handleAction}
              loading={actLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
