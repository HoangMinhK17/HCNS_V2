import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, DatePicker,
  Space, Tag, Tooltip, Popconfirm, Typography, Spin, Alert,
  Tabs, Row, Col, Card, Statistic, Select, message,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  SendOutlined, CalendarOutlined, BellOutlined, SmileOutlined,
  CheckCircleFilled, ClockCircleOutlined, InfoCircleOutlined,
  ThunderboltOutlined, GiftOutlined, FlagOutlined, StarFilled,
  WarningFilled, CheckCircleOutlined, NotificationOutlined,
  TeamOutlined, RobotOutlined, BankOutlined, FireOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getHolidayEvents,
  createHolidayEvent,
  updateHolidayEvent,
  deleteHolidayEvent,
  triggerHolidayEvent,
} from '../../utils/holidayEventApi';

const { Title, Text } = Typography;
const { TextArea } = Input;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmtDate = (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '—');

const getStatusBadge = (event) => {
  const now = dayjs();
  const start = dayjs(event.start_date).startOf('day');
  const diffDays = start.diff(now.startOf('day'), 'day');

  if (diffDays < 0)
    return { color: '#9ca3af', bg: '#f3f4f6', label: 'Đã qua',       icon: <FlagOutlined />,    textColor: '#9ca3af' };
  if (diffDays === 0)
    return { color: '#7c3aed', bg: '#f5f3ff', label: 'Hôm nay!',     icon: <StarFilled />,      textColor: '#7c3aed', pulse: true };
  if (diffDays <= 2)
    return { color: '#dc2626', bg: '#fef2f2', label: `Còn ${diffDays} ngày`, icon: <WarningFilled />,  textColor: '#dc2626' };
  if (diffDays <= 7)
    return { color: '#d97706', bg: '#fffbeb', label: `Còn ${diffDays} ngày`, icon: <FireOutlined />,   textColor: '#d97706' };
  return   { color: '#059669', bg: '#f0fdf4', label: `Còn ${diffDays} ngày`, icon: <CheckCircleOutlined />, textColor: '#059669' };
};

// ─────────────────────────────────────────────────────────────────────────────
// FORM MODAL: Tạo / Chỉnh sửa sự kiện
// ─────────────────────────────────────────────────────────────────────────────
function HolidayEventFormModal({ open, onClose, onSaved, initial }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isEdit = !!initial?._id;

  useEffect(() => {
    if (open) {
      if (initial) {
        form.setFieldsValue({
          title:                 initial.title,
          start_date:            initial.start_date        ? dayjs(initial.start_date)        : null,
          end_date:              initial.end_date          ? dayjs(initial.end_date)          : null,
          back_to_work_date:     initial.back_to_work_date ? dayjs(initial.back_to_work_date) : null,
          notify_advance_days:   initial.notify_advance_days ?? 2,
          announcement_template: initial.announcement_template || '',
          wish_template:         initial.wish_template         || '',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ notify_advance_days: 2 });
      }
    }
  }, [open, initial, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const payload = {
        title:                 values.title,
        start_date:            values.start_date?.toISOString(),
        end_date:              values.end_date?.toISOString(),
        back_to_work_date:     values.back_to_work_date?.toISOString() || null,
        notify_advance_days:   values.notify_advance_days,
        announcement_template: values.announcement_template,
        wish_template:         values.wish_template,
      };

      if (isEdit) {
        await updateHolidayEvent(initial._id, payload);
        message.success('Cập nhật sự kiện thành công!');
      } else {
        await createHolidayEvent(payload);
        message.success('Tạo sự kiện nghỉ lễ thành công!');
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(`Thao tác thất bại: ${err?.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={isEdit ? 'Cập nhật' : 'Tạo sự kiện'}
      cancelText="Huỷ"
      confirmLoading={loading}
      title={
        <Space>
          <GiftOutlined style={{ color: '#1677ff', fontSize: 18 }} />
          <span style={{ fontWeight: 700 }}>
            {isEdit ? 'Chỉnh sửa sự kiện nghỉ lễ' : 'Tạo sự kiện nghỉ lễ mới'}
          </span>
        </Space>
      }
      width={680}
      destroyOnClose
    >
      <Form form={form} layout="vertical" size="middle" style={{ marginTop: 16 }}>
        {/* Tên sự kiện */}
        <Form.Item
          name="title"
          label="Tên sự kiện nghỉ lễ"
          rules={[{ required: true, message: 'Vui lòng nhập tên sự kiện' }]}
        >
          <Input
            placeholder="VD: Nghỉ lễ Quốc khánh 2/9"
            prefix={<CalendarOutlined style={{ color: '#9ca3af' }} />}
          />
        </Form.Item>

        {/* Ngày tháng */}
        <Row gutter={[12, 0]}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="start_date"
              label="Ngày bắt đầu nghỉ"
              rules={[{ required: true, message: 'Bắt buộc' }]}
            >
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="end_date"
              label="Ngày kết thúc nghỉ"
              rules={[{ required: true, message: 'Bắt buộc' }]}
            >
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="back_to_work_date" label="Ngày đi làm lại">
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Tuỳ chọn" />
            </Form.Item>
          </Col>
        </Row>

        {/* Số ngày báo trước */}
        <Form.Item
          name="notify_advance_days"
          label={
            <span>
              Báo trước{' '}
              <Text type="secondary" style={{ fontSize: 12 }}>(số ngày trước ngày bắt đầu nghỉ)</Text>
            </span>
          }
          rules={[{ required: true, message: 'Bắt buộc' }]}
        >
          <InputNumber min={0} max={30} addonAfter="ngày" style={{ width: 170 }} />
        </Form.Item>

        {/* Template thông báo */}
        <Form.Item
          name="announcement_template"
          label={
            <Space size={6}>
              <NotificationOutlined style={{ color: '#1677ff' }} />
              <span>Nội dung thông báo lịch nghỉ</span>
              <Tooltip title="Placeholder hỗ trợ: {{title}}, {{start_date}}, {{end_date}}, {{back_to_work_date}}">
                <InfoCircleOutlined style={{ color: '#9ca3af' }} />
              </Tooltip>
            </Space>
          }
        >
          <TextArea
            rows={4}
            placeholder="VD: Công ty xin thông báo lịch nghỉ lễ {{title}} từ ngày {{start_date}} đến {{end_date}}. Ngày đi làm lại: {{back_to_work_date}}."
          />
        </Form.Item>

        {/* Template lời chúc */}
        <Form.Item
          name="wish_template"
          label={
            <Space size={6}>
              <SmileOutlined style={{ color: '#7c3aed' }} />
              <span>Nội dung lời chúc ngày nghỉ lễ</span>
              <Tooltip title="Placeholder hỗ trợ: {{title}}, {{start_date}}">
                <InfoCircleOutlined style={{ color: '#9ca3af' }} />
              </Tooltip>
            </Space>
          }
        >
          <TextArea
            rows={4}
            placeholder="VD: Chúc tất cả có kỳ nghỉ {{title}} vui vẻ, an lành và hạnh phúc!"
          />
        </Form.Item>

        {/* Ghi chú placeholder */}
        <div style={{
          background: '#eff6ff', border: '1px solid #dbeafe',
          borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: '#1e40af',
        }}>
          <InfoCircleOutlined style={{ marginRight: 6 }} />
          <strong>Placeholder hỗ trợ:</strong>{' '}
          <code>{'{{title}}'}</code> = tên sự kiện,{' '}
          <code>{'{{start_date}}'}</code> = ngày bắt đầu nghỉ,{' '}
          <code>{'{{end_date}}'}</code> = ngày kết thúc,{' '}
          <code>{'{{back_to_work_date}}'}</code> = ngày đi làm lại
        </div>
      </Form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER MODAL: Kích hoạt gửi thủ công
// ─────────────────────────────────────────────────────────────────────────────
function TriggerModal({ open, onClose, event, onDone }) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('both');

  const handleTrigger = async () => {
    setLoading(true);
    try {
      const res = await triggerHolidayEvent(event._id, type);
      message.success(`Đã gửi thành công đến ${res.recipients} nhân viên!`);
      onDone();
      onClose();
    } catch (err) {
      message.error(`Gửi thất bại: ${err?.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleTrigger}
      okText="Xác nhận gửi"
      cancelText="Huỷ"
      confirmLoading={loading}
      okButtonProps={{ icon: <SendOutlined /> }}
      title={
        <Space>
          <ThunderboltOutlined style={{ color: '#f97316', fontSize: 18 }} />
          <span style={{ fontWeight: 700 }}>Kích hoạt gửi thủ công</span>
        </Space>
      }
      width={480}
    >
      <div style={{ marginTop: 12 }}>
        <Alert
          type="warning"
          showIcon
          icon={<WarningFilled />}
          message="Hành động này sẽ gửi Zalo ngay lập tức đến toàn bộ nhân viên active có số điện thoại. Chỉ dùng để test."
          style={{ marginBottom: 16, borderRadius: 8 }}
        />

        <div style={{ marginBottom: 8 }}>
          <Text type="secondary">Sự kiện: </Text>
          <Text strong>{event.title}</Text>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">Thời gian: </Text>
          <Text>{fmtDate(event.start_date)} – {fmtDate(event.end_date)}</Text>
        </div>

        <Form layout="vertical">
          <Form.Item label="Loại gửi">
            <Select
              value={type}
              onChange={setType}
              options={[
                {
                  value: 'both',
                  label: (
                    <Space>
                      <NotificationOutlined style={{ color: '#1677ff' }} />
                      <SmileOutlined style={{ color: '#7c3aed' }} />
                      Gửi cả 2 (Thông báo + Lời chúc)
                    </Space>
                  ),
                },
                {
                  value: 'announcement',
                  label: (
                    <Space>
                      <NotificationOutlined style={{ color: '#1677ff' }} />
                      Chỉ gửi Thông báo lịch nghỉ
                    </Space>
                  ),
                },
                {
                  value: 'wish',
                  label: (
                    <Space>
                      <SmileOutlined style={{ color: '#7c3aed' }} />
                      Chỉ gửi Lời chúc
                    </Space>
                  ),
                },
              ]}
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE CARD: Hiển thị lịch sự kiện sắp tới
// ─────────────────────────────────────────────────────────────────────────────
function EventTimeline({ events }) {
  const upcoming = events
    .filter((e) => dayjs(e.end_date).isAfter(dayjs().subtract(1, 'day')))
    .slice(0, 5);

  if (upcoming.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
        <CalendarOutlined style={{ fontSize: 36, marginBottom: 8, display: 'block' }} />
        <Text type="secondary">Chưa có sự kiện nghỉ lễ nào sắp tới</Text>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {upcoming.map((event) => {
        const status = getStatusBadge(event);
        const notifyDate = dayjs(event.start_date).subtract(event.notify_advance_days, 'day');
        return (
          <div
            key={event._id}
            style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              padding: '14px 16px',
              background: status.bg,
              borderRadius: 10,
              border: `1px solid ${status.color}22`,
              borderLeft: `4px solid ${status.color}`,
              flexWrap: 'wrap',
            }}
          >
            {/* Icon trạng thái */}
            <div style={{
              fontSize: 20, color: status.color,
              marginTop: 2, flexShrink: 0,
              animation: status.pulse ? 'pulse-icon 1.5s ease-in-out infinite' : undefined,
            }}>
              {status.icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 6 }}>
                {event.title}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                <Space size={4}>
                  <CalendarOutlined />
                  <span>{fmtDate(event.start_date)} – {fmtDate(event.end_date)}</span>
                </Space>
                {event.back_to_work_date && (
                  <Space size={4}>
                    <BankOutlined />
                    <span>Đi làm lại: {fmtDate(event.back_to_work_date)}</span>
                  </Space>
                )}
                <Space size={4}>
                  <BellOutlined />
                  <span>Gửi thông báo: {fmtDate(notifyDate.toDate())}</span>
                </Space>
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{
                display: 'inline-block',
                background: status.color + '18',
                color: status.color,
                borderRadius: 20, padding: '2px 10px',
                fontSize: 12, fontWeight: 700,
              }}>
                {status.label}
              </span>
              <div style={{ marginTop: 6, display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {event.is_notified && (
                  <Tooltip title={`Đã gửi thông báo lúc ${event.notified_at ? dayjs(event.notified_at).format('HH:mm DD/MM') : ''} (${event.notified_count || 0} người)`}>
                    <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                      <BellOutlined /> Đã thông báo
                    </Tag>
                  </Tooltip>
                )}
                {event.is_wished && (
                  <Tooltip title={`Đã gửi lời chúc lúc ${event.wished_at ? dayjs(event.wished_at).format('HH:mm DD/MM') : ''} (${event.wished_count || 0} người)`}>
                    <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>
                      <SmileOutlined /> Đã chúc
                    </Tag>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function HolidayEventPage() {
  const [events, setEvents]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // Pagination & Stats
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [stats, setStats]       = useState({ upcomingCount: 0, notNotifiedCount: 0, notWishedCount: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  // Modal states
  const [formOpen, setFormOpen]         = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [triggerOpen, setTriggerOpen]   = useState(false);
  const [triggerEvent, setTriggerEvent] = useState(null);

  // Filter
  const [yearFilter, setYearFilter] = useState(null);

  // Reset page to 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [yearFilter]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: pageSize };
      if (yearFilter) params.year = yearFilter;
      const res = await getHolidayEvents(params);
      if (res.success) {
        setEvents(res.data || []);
        setTotal(res.total || 0);
        if (res.stats) setStats(res.stats);
        if (res.upcomingEvents) setUpcomingEvents(res.upcomingEvents);
      } else {
        setError('Không thể tải dữ liệu sự kiện.');
      }
    } catch (err) {
      setError(`Lỗi kết nối server: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [yearFilter, page, pageSize]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Stats
  const { upcomingCount, notNotifiedCount, notWishedCount } = stats;

  const handleDelete = async (id) => {
    try {
      await deleteHolidayEvent(id);
      message.success('Xóa sự kiện thành công!');
      fetchEvents();
    } catch (err) {
      message.error(`Xóa thất bại: ${err?.response?.data?.message || err.message}`);
    }
  };

  const handleResetStatus = async (event) => {
    try {
      await updateHolidayEvent(event._id, { is_notified: false, is_wished: false, notified_count: 0, wished_count: 0, notified_at: null, wished_at: null });
      message.success('Đã reset trạng thái gửi!');
      fetchEvents();
    } catch (err) {
      message.error('Reset thất bại');
    }
  };

  // ── Table Columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Sự kiện nghỉ lễ',
      dataIndex: 'title',
      render: (title, r) => {
        const status = getStatusBadge(r);
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ color: status.color, fontSize: 16 }}>{status.icon}</span>
              <Text strong style={{ fontSize: 13.5, color: '#111827' }}>{title}</Text>
            </div>
            <span style={{
              display: 'inline-block',
              background: status.bg, color: status.color,
              borderRadius: 12, padding: '1px 10px', fontWeight: 600, fontSize: 12,
            }}>
              {status.label}
            </span>
          </div>
        );
      },
    },
    {
      title: 'Thời gian nghỉ',
      render: (_, r) => (
        <div style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Space size={6}>
            <CalendarOutlined style={{ color: '#9ca3af' }} />
            <Text type="secondary">Bắt đầu:</Text>
            <Text strong>{fmtDate(r.start_date)}</Text>
          </Space>
          <Space size={6}>
            <FlagOutlined style={{ color: '#9ca3af' }} />
            <Text type="secondary">Kết thúc:</Text>
            <Text>{fmtDate(r.end_date)}</Text>
          </Space>
          {r.back_to_work_date && (
            <Space size={6}>
              <BankOutlined style={{ color: '#9ca3af' }} />
              <Text type="secondary">Đi làm lại:</Text>
              <Text>{fmtDate(r.back_to_work_date)}</Text>
            </Space>
          )}
        </div>
      ),
    },
    {
      title: 'Cài đặt thông báo',
      render: (_, r) => {
        const notifyDate = dayjs(r.start_date).subtract(r.notify_advance_days, 'day');
        return (
          <div style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Space size={6}>
              <ClockCircleOutlined style={{ color: '#9ca3af' }} />
              <Text type="secondary">Báo trước:</Text>
              <Text strong style={{ color: '#1677ff' }}>{r.notify_advance_days} ngày</Text>
            </Space>
            <Space size={6}>
              <BellOutlined style={{ color: '#9ca3af' }} />
              <Text type="secondary">Gửi lúc:</Text>
              <Text>{fmtDate(notifyDate.toDate())}</Text>
            </Space>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái gửi',
      render: (_, r) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <Tooltip
            title={
              r.is_notified
                ? `Đã gửi thông báo lúc ${r.notified_at ? dayjs(r.notified_at).format('HH:mm DD/MM/YYYY') : 'N/A'} đến ${r.notified_count || 0} người`
                : 'Chưa gửi thông báo lịch nghỉ'
            }
          >
            <Tag
              icon={r.is_notified ? <CheckCircleFilled /> : <ClockCircleOutlined />}
              color={r.is_notified ? 'blue' : 'default'}
              style={{ cursor: 'default', fontWeight: 600, fontSize: 11.5 }}
            >
              {r.is_notified ? `Đã thông báo (${r.notified_count || 0})` : 'Chưa thông báo'}
            </Tag>
          </Tooltip>

          <Tooltip
            title={
              r.is_wished
                ? `Đã gửi lời chúc lúc ${r.wished_at ? dayjs(r.wished_at).format('HH:mm DD/MM/YYYY') : 'N/A'} đến ${r.wished_count || 0} người`
                : 'Chưa gửi lời chúc'
            }
          >
            <Tag
              icon={r.is_wished ? <CheckCircleFilled /> : <ClockCircleOutlined />}
              color={r.is_wished ? 'purple' : 'default'}
              style={{ cursor: 'default', fontWeight: 600, fontSize: 11.5 }}
            >
              {r.is_wished ? `Đã chúc (${r.wished_count || 0})` : 'Chưa chúc'}
            </Tag>
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Thao tác',
      width: 160,
      render: (_, r) => (
        <Space size={5} wrap>
          <Tooltip title="Chỉnh sửa">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => { setEditingEvent(r); setFormOpen(true); }}
              style={{ borderRadius: 6 }}
            />
          </Tooltip>

          <Tooltip title="Kích hoạt gửi Zalo ngay (test)">
            <Button
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => { setTriggerEvent(r); setTriggerOpen(true); }}
              style={{ borderRadius: 6, borderColor: '#f97316', color: '#f97316' }}
            />
          </Tooltip>

          {(r.is_notified || r.is_wished) && (
            <Popconfirm
              title="Reset trạng thái gửi?"
              description="is_notified và is_wished sẽ về false, cron job sẽ gửi lại."
              onConfirm={() => handleResetStatus(r)}
              okText="Reset"
              okButtonProps={{ danger: true }}
              cancelText="Huỷ"
            >
              <Tooltip title="Reset trạng thái (cho phép gửi lại)">
                <Button size="small" icon={<ReloadOutlined />} style={{ borderRadius: 6 }} />
              </Tooltip>
            </Popconfirm>
          )}

          <Popconfirm
            title="Xóa sự kiện nghỉ lễ?"
            description="Hành động này không thể hoàn tác."
            onConfirm={() => handleDelete(r._id)}
            okText="Xóa"
            okButtonProps={{ danger: true }}
            cancelText="Huỷ"
          >
            <Tooltip title="Xóa">
              <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Year filter options ────────────────────────────────────────────────────
  const currentYear = dayjs().year();
  const yearOptions = [
    { value: null, label: 'Tất cả năm' },
    ...Array.from({ length: 4 }, (_, i) => ({
      value: currentYear - 1 + i,
      label: `Năm ${currentYear - 1 + i}`,
    })),
  ];

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabItems = [
    {
      key: '1',
      label: (
        <Space>
          <CalendarOutlined />
          Danh sách sự kiện
        </Space>
      ),
      children: (
        <>
          {/* Toolbar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10,
          }}>
            <Space size={10} wrap>
              <Select
                value={yearFilter}
                onChange={setYearFilter}
                options={yearOptions}
                style={{ width: 160 }}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchEvents}
                loading={loading}
                style={{ borderRadius: 8 }}
              >
                Làm mới
              </Button>
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setEditingEvent(null); setFormOpen(true); }}
              style={{ borderRadius: 8 }}
            >
              Tạo sự kiện nghỉ lễ
            </Button>
          </div>

          {/* Error */}
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginBottom: 16, borderRadius: 10 }}
              action={<Button size="small" onClick={fetchEvents}>Thử lại</Button>}
            />
          )}

          {/* Table */}
          <Spin spinning={loading} tip="Đang tải dữ liệu...">
            <Table
              dataSource={events.map((e) => ({ ...e, key: e._id }))}
              columns={columns}
              pagination={{
                current: page,
                pageSize: pageSize,
                total: total,
                onChange: (p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                },
                showSizeChanger: true,
                showTotal: (totalCount) => `${totalCount} sự kiện`,
                style: { padding: '0 16px' },
              }}
              style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              scroll={{ x: 900 }}
              size="middle"
              locale={{
                emptyText: (
                  <div style={{ padding: '48px 0', color: '#9ca3af', fontSize: 14 }}>
                    <CalendarOutlined style={{ fontSize: 36, color: '#d1d5db', display: 'block', marginBottom: 10 }} />
                    Chưa có sự kiện nghỉ lễ nào được tạo
                  </div>
                ),
              }}
            />
          </Spin>
        </>
      ),
    },
    {
      key: '2',
      label: (
        <Space>
          <BellOutlined />
          Timeline &amp; Trạng thái
        </Space>
      ),
      children: (
        <div style={{ width: '100%', maxWidth: '100%' }}>
          {/* Stats */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={8}>
              <Card style={{ borderRadius: 12, border: '1px solid #dbeafe' }}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 12.5 }}>Sự kiện sắp tới</Text>}
                  value={upcomingCount}
                  valueStyle={{ color: '#1677ff', fontWeight: 700 }}
                  prefix={<CalendarOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{ borderRadius: 12, border: '1px solid #fde8d0' }}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 12.5 }}>Chờ thông báo</Text>}
                  value={notNotifiedCount}
                  valueStyle={{ color: '#f97316', fontWeight: 700 }}
                  prefix={<BellOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{ borderRadius: 12, border: '1px solid #e9d5ff' }}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 12.5 }}>Chờ lời chúc hôm nay</Text>}
                  value={notWishedCount}
                  valueStyle={{ color: '#7c3aed', fontWeight: 700 }}
                  prefix={<GiftOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* Giải thích cron */}
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 10, padding: '14px 16px', marginBottom: 16,
          }}>
            <Space style={{ marginBottom: 8 }}>
              <RobotOutlined style={{ color: '#1677ff', fontSize: 15 }} />
              <Text strong style={{ fontSize: 13 }}>Cách cron job hoạt động (chạy 08:00 mỗi ngày):</Text>
            </Space>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: '#475569', paddingLeft: 22 }}>
              <Space size={6}>
                <NotificationOutlined style={{ color: '#1677ff' }} />
                <span>
                  <strong>Thông báo:</strong> khi{' '}
                  <code>(start_date - hôm nay == notify_advance_days)</code> và chưa gửi
                  → gửi announcement_template
                </span>
              </Space>
              <Space size={6}>
                <SmileOutlined style={{ color: '#7c3aed' }} />
                <span>
                  <strong>Lời chúc:</strong> khi{' '}
                  <code>hôm nay == start_date</code> và chưa gửi
                  → gửi wish_template
                </span>
              </Space>
              <Space size={6}>
                <CheckCircleFilled style={{ color: '#059669' }} />
                <span>
                  Sau khi gửi: cập nhật{' '}
                  <code>is_notified / is_wished = true</code> để không gửi lại
                </span>
              </Space>
              <Space size={6}>
                <TeamOutlined style={{ color: '#6b7280' }} />
                <span>
                  Gửi đến toàn bộ nhân viên <strong>active</strong> có số điện thoại qua <strong>Zalo CRM Campaign</strong>
                </span>
              </Space>
            </div>
          </div>

          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
            <CalendarOutlined style={{ marginRight: 6, color: '#1677ff' }} />
            Sự kiện sắp tới (5 gần nhất)
          </Text>
          <Spin spinning={loading}>
            <EventTimeline events={upcomingEvents} />
          </Spin>
        </div>
      ),
    },
  ];

  return (
    <>
      <style>{`
        @keyframes pulse-icon {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }
      `}</style>

      <div style={{ padding: 'clamp(16px, 3vw, 28px) clamp(12px, 3vw, 32px)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
              <GiftOutlined style={{ marginRight: 8, color: '#1677ff' }} />
              Quản lý Sự kiện Nghỉ lễ
            </Title>
            <div style={{ marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#eff6ff', border: '1px solid #dbeafe',
                borderRadius: 8, padding: '4px 12px',
                fontSize: 12.5, color: '#1677ff', fontWeight: 500,
              }}>
                <RobotOutlined />
                AI tự động gửi thông báo & lời chúc qua Zalo – Cron Job 08:00 mỗi ngày
              </span>
            </div>
          </div>
        </div>

        <Tabs defaultActiveKey="1" items={tabItems} />
      </div>

      {/* Form Modal */}
      <HolidayEventFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingEvent(null); }}
        onSaved={fetchEvents}
        initial={editingEvent}
      />

      {/* Trigger Modal */}
      <TriggerModal
        open={triggerOpen}
        onClose={() => { setTriggerOpen(false); setTriggerEvent(null); }}
        event={triggerEvent}
        onDone={fetchEvents}
      />
    </>
  );
}
