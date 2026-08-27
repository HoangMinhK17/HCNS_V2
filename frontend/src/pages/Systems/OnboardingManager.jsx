import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Tabs, Table, Typography, Space, Button, Tag, Upload, Input,
  message, Popconfirm, Avatar, Tooltip, Badge, Spin, Empty, Modal,
  Descriptions, Alert,
} from 'antd';
import {
  UploadOutlined, DeleteOutlined, SendOutlined, FileTextOutlined,
  UserOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ReloadOutlined, WhatsAppOutlined, EditOutlined, SaveOutlined,
  CloseOutlined, FileOutlined, CloudUploadOutlined,
} from '@ant-design/icons';
import {
  getOnboardingSettings,
  updateOnboardingSettings,
  uploadOnboardingDocument,
  deleteOnboardingDocument,
  getOnboardingEmployees,
  sendOnboardingZalo,
} from '../../utils/onboardingApi';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ─── Status badge helper ──────────────────────────────────────────────────────
const statusConfig = {
  'Pre-Onboarding': { color: 'cyan',   label: 'Pre-Onboarding' },
  'probation':      { color: 'orange', label: 'Thử việc'        },
  'active':         { color: 'green',  label: 'Đang làm việc'   },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OnboardingManager() {
  // ── State: Settings & Documents
  const [settings, setSettings]         = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [templateValue, setTemplateValue]     = useState('');
  const [savingTemplate, setSavingTemplate]   = useState(false);
  const [uploading, setUploading]       = useState(false);

  // ── State: Employees
  const [employees, setEmployees]       = useState([]);
  const [loadingEmps, setLoadingEmps]   = useState(true);
  const [sendingId, setSendingId]       = useState(null);

  // ─── Load data ──────────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await getOnboardingSettings();
      if (res.success) {
        setSettings(res.data);
        setTemplateValue(res.data.welcomeMessageTemplate || '');
      }
    } catch {
      message.error('Không thể tải cài đặt onboarding');
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoadingEmps(true);
    try {
      const res = await getOnboardingEmployees();
      if (res.success) setEmployees(res.data);
    } catch {
      message.error('Không thể tải danh sách nhân viên onboarding');
    } finally {
      setLoadingEmps(false);
    }
  }, []);

  useEffect(() => { loadSettings(); loadEmployees(); }, []);

  // ─── Document Upload ─────────────────────────────────────────────────────────
  const handleUpload = async ({ file }) => {
    if (uploading) return;
    setUploading(true);
    try {
      const res = await uploadOnboardingDocument(file);
      if (res.success) {
        message.success(`Đã tải lên: ${file.name}`);
        setSettings(res.data);
        setTemplateValue(res.data.welcomeMessageTemplate || templateValue);
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Tải file thất bại');
    } finally {
      setUploading(false);
    }
    return false; // Prevent antd auto upload
  };

  // ─── Document Delete ─────────────────────────────────────────────────────────
  const handleDeleteDoc = async (docId) => {
    try {
      await deleteOnboardingDocument(docId);
      message.success('Đã xóa tài liệu');
      await loadSettings();
    } catch (e) {
      message.error(e?.response?.data?.message || 'Xóa tài liệu thất bại');
    }
  };

  // ─── Save Template ───────────────────────────────────────────────────────────
  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
      const res = await updateOnboardingSettings({ welcomeMessageTemplate: templateValue });
      if (res.success) {
        setSettings(res.data);
        setEditingTemplate(false);
        message.success('Đã lưu mẫu tin nhắn');
      }
    } catch {
      message.error('Lưu thất bại');
    } finally {
      setSavingTemplate(false);
    }
  };

  // ─── Send Onboarding Zalo ────────────────────────────────────────────────────
  const handleSendZalo = async (employeeId, name) => {
    setSendingId(employeeId);
    try {
      const res = await sendOnboardingZalo(employeeId);
      if (res.success) {
        message.success(`Đã gửi Zalo onboarding cho ${name}`);
        await loadEmployees();
      }
    } catch (e) {
      message.error(e?.response?.data?.message || 'Gửi Zalo thất bại');
    } finally {
      setSendingId(null);
    }
  };

  // ─── Documents Tab ───────────────────────────────────────────────────────────
  const renderDocumentsTab = () => (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {/* Upload Area */}
      <Card
        style={{
          border: '2px dashed #4096ff',
          borderRadius: 16,
          background: 'linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%)',
        }}
        bodyStyle={{ padding: '32px 24px', textAlign: 'center' }}
      >
        <CloudUploadOutlined style={{ fontSize: 48, color: '#4096ff', marginBottom: 12 }} />
        <Title level={4} style={{ color: '#1677ff', marginBottom: 8 }}>
          Tải lên tài liệu Onboarding
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 20 }}>
          Hỗ trợ: PDF, DOCX, XLSX, PNG, JPG · Tối đa 20MB mỗi file
        </Paragraph>
        <Upload
          beforeUpload={(file) => { handleUpload({ file }); return false; }}
          showUploadList={false}
          multiple={false}
          accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
        >
          <Button
            type="primary"
            icon={<UploadOutlined />}
            size="large"
            loading={uploading}
            style={{ borderRadius: 8, paddingInline: 32 }}
          >
            {uploading ? 'Đang tải lên...' : 'Chọn File'}
          </Button>
        </Upload>
      </Card>

      {/* Document List */}
      <Card
        title={
          <Space>
            <FileTextOutlined style={{ color: '#1677ff' }} />
            <span>Tài liệu đã tải lên ({settings?.documents?.length || 0})</span>
          </Space>
        }
        styles={{ body: { padding: '0 0 8px' } }}
        style={{ borderRadius: 12 }}
      >
        {loadingSettings ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : !settings?.documents?.length ? (
          <Empty description="Chưa có tài liệu nào" style={{ padding: '40px 0' }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div style={{ padding: '0 16px' }}>
            {settings.documents.map((doc) => (
              <div
                key={doc._id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', margin: '8px 0',
                  background: '#fafafa', borderRadius: 10,
                  border: '1px solid #f0f0f0',
                  transition: 'box-shadow .2s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <Space>
                  <div style={{
                    width: 40, height: 40, borderRadius: 8,
                    background: 'linear-gradient(135deg, #4096ff, #0958d9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FileOutlined style={{ color: '#fff', fontSize: 18 }} />
                  </div>
                  <div>
                    <Text strong style={{ display: 'block', fontSize: 14 }}>{doc.fileName}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {doc.mimeType || '—'} ·{' '}
                      {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : '—'} ·{' '}
                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('vi-VN') : '—'}
                    </Text>
                  </div>
                </Space>
                <Space>
                  <Tooltip title="Mở link xem file">
                    <Button
                      type="link"
                      size="small"
                      href={doc.fileUrl}
                      target="_blank"
                      icon={<FileTextOutlined />}
                    >
                      Xem
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    title="Xác nhận xóa tài liệu?"
                    description="Tài liệu sẽ bị xóa khỏi Supabase Storage."
                    onConfirm={() => handleDeleteDoc(doc._id)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger size="small" icon={<DeleteOutlined />}>Xóa</Button>
                  </Popconfirm>
                </Space>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Message Template */}
      <Card
        title={
          <Space>
            <WhatsAppOutlined style={{ color: '#52c41a' }} />
            <span>Mẫu tin nhắn Zalo</span>
          </Space>
        }
        extra={
          editingTemplate ? (
            <Space>
              <Button
                icon={<CloseOutlined />}
                onClick={() => { setEditingTemplate(false); setTemplateValue(settings?.welcomeMessageTemplate || ''); }}
              >Hủy</Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={savingTemplate}
                onClick={handleSaveTemplate}
              >Lưu mẫu</Button>
            </Space>
          ) : (
            <Button icon={<EditOutlined />} onClick={() => setEditingTemplate(true)}>Chỉnh sửa</Button>
          )
        }
        style={{ borderRadius: 12 }}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
          message={
            <span>
              Sử dụng biến: <Text code>{'{fullName}'}</Text> — tên nhân viên,{' '}
              <Text code>{'{empCode}'}</Text> — mã nhân viên,{' '}
              <Text code>{'{documentsBlock}'}</Text> — danh sách link tài liệu (tự động điền)
            </span>
          }
        />
        {editingTemplate ? (
          <TextArea
            rows={10}
            value={templateValue}
            onChange={e => setTemplateValue(e.target.value)}
            style={{ fontFamily: 'monospace', borderRadius: 8 }}
            placeholder="Nhập mẫu tin nhắn..."
          />
        ) : (
          <div style={{
            background: '#f6f8fa', borderRadius: 8, padding: '16px 20px',
            border: '1px solid #e0e0e0', whiteSpace: 'pre-wrap',
            fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7, minHeight: 120,
          }}>
            {settings?.welcomeMessageTemplate || <Text type="secondary">(Chưa có mẫu)</Text>}
          </div>
        )}
      </Card>
    </Space>
  );

  // ─── Employees Tab ───────────────────────────────────────────────────────────
  const pendingEmployees = employees.filter(e => !e.onboardingZaloSent);
  const sentEmployees    = employees.filter(e => e.onboardingZaloSent);

  const columns = (isSent) => [
    {
      title: 'Nhân viên',
      key: 'name',
      render: (_, r) => (
        <Space>
          <Avatar
            src={r.avatar}
            icon={<UserOutlined />}
            style={{ background: '#4096ff', flexShrink: 0 }}
          />
          <div>
            <Text strong style={{ display: 'block' }}>{r.fullName}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.empCode}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Phòng ban / Chức vụ',
      key: 'dept',
      render: (_, r) => (
        <div>
          <Text style={{ display: 'block' }}>{r.department?.name || '—'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.position?.name || '—'}</Text>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (s) => {
        const cfg = statusConfig[s] || { color: 'default', label: s };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (v) => v || <Text type="secondary">Chưa có</Text>,
    },
    isSent
      ? {
          title: 'Đã gửi lúc',
          dataIndex: 'onboardingZaloSentAt',
          key: 'sentAt',
          render: (v) =>
            v ? (
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text style={{ fontSize: 12 }}>{new Date(v).toLocaleString('vi-VN')}</Text>
              </Space>
            ) : '—',
        }
      : {
          title: 'Ngày vào',
          dataIndex: 'startDate',
          key: 'startDate',
          render: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '—',
        },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center',
      render: (_, r) => (
        <Popconfirm
          title={isSent ? 'Gửi lại tin nhắn onboarding?' : 'Gửi Zalo onboarding?'}
          description={`Sẽ gửi tới số: ${r.phone || 'Chưa có SĐT'}`}
          onConfirm={() => handleSendZalo(r._id, r.fullName)}
          okText="Gửi ngay"
          cancelText="Hủy"
          disabled={!r.phone}
        >
          <Tooltip title={!r.phone ? 'Nhân viên chưa có SĐT' : isSent ? 'Gửi lại' : 'Gửi Zalo'}>
            <Button
              type={isSent ? 'default' : 'primary'}
              icon={<SendOutlined />}
              size="small"
              loading={sendingId === r._id}
              disabled={!r.phone}
              style={{ borderRadius: 6 }}
            >
              {isSent ? 'Gửi lại' : 'Gửi Zalo'}
            </Button>
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  const renderEmployeesTab = () => (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card style={{ borderRadius: 12, border: '1.5px solid #fff1b8', background: '#fffbe6' }} bodyStyle={{ padding: '20px 24px' }}>
          <Space>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, #fa8c16, #ffa940)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ClockCircleOutlined style={{ color: '#fff', fontSize: 22 }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>Chờ gửi Zalo</Text>
              <Title level={2} style={{ margin: 0, color: '#d46b08' }}>{pendingEmployees.length}</Title>
            </div>
          </Space>
        </Card>
        <Card style={{ borderRadius: 12, border: '1.5px solid #b7eb8f', background: '#f6ffed' }} bodyStyle={{ padding: '20px 24px' }}>
          <Space>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, #52c41a, #73d13d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircleOutlined style={{ color: '#fff', fontSize: 22 }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>Đã gửi</Text>
              <Title level={2} style={{ margin: 0, color: '#389e0d' }}>{sentEmployees.length}</Title>
            </div>
          </Space>
        </Card>
      </div>

      {/* Pending Table */}
      <Card
        title={
          <Space>
            <Badge size="default" color="#fa8c16">
              <ClockCircleOutlined style={{ fontSize: 18, color: '#fa8c16' }} />
            </Badge>
            <span>Chưa gửi tài liệu Onboarding</span>
          </Space>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadEmployees} loading={loadingEmps}>
            Làm mới
          </Button>
        }
        style={{ borderRadius: 12 }}
      >
        <Table
          dataSource={pendingEmployees}
          columns={columns(false)}
          rowKey="_id"
          loading={loadingEmps}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: <Empty description="🎉 Tất cả đã được gửi tài liệu!" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          size="middle"
          rowClassName={(r) => !r.phone ? 'row-no-phone' : ''}
        />
      </Card>

      {/* Sent Table */}
      <Card
        title={
          <Space>
            <CheckCircleOutlined style={{ fontSize: 18, color: '#52c41a' }} />
            <span>Đã gửi tài liệu Onboarding</span>
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        <Table
          dataSource={sentEmployees}
          columns={columns(true)}
          rowKey="_id"
          loading={loadingEmps}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: <Empty description="Chưa có ai được gửi" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          size="middle"
        />
      </Card>
    </Space>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Page Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1677ff 0%, #0050b3 100%)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FileTextOutlined style={{ color: '#fff', fontSize: 28 }} />
        </div>
        <div>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            Quản lý Onboarding Tự động
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
            Tải lên tài liệu & tự động gửi qua Zalo cho nhân viên mới (Pre-Onboarding / Thử việc)
          </Text>
        </div>
      </div>

      {/* Cron Info Alert */}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 20, borderRadius: 10 }}
        message={
          <span>
            <strong> Cron Job tự động</strong> chạy mỗi ngày lúc <strong>08:30</strong> —
            tự động quét và gửi Zalo cho tất cả nhân viên <Tag color="cyan">Pre-Onboarding</Tag>
            chưa nhận được tài liệu. Mỗi người chỉ nhận <strong>1 lần</strong>.
          </span>
        }
      />

      <Tabs
        defaultActiveKey="documents"
        size="large"
        style={{ background: '#fff', borderRadius: 12, padding: '0 16px' }}
        items={[
          {
            key: 'documents',
            label: (
              <Space>
                <FileTextOutlined />
                Tài liệu & Mẫu tin nhắn
              </Space>
            ),
            children: (
              <div style={{ paddingBottom: 16 }}>
                {loadingSettings ? (
                  <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
                ) : (
                  renderDocumentsTab()
                )}
              </div>
            ),
          },
          {
            key: 'employees',
            label: (
              <Space>
                <Badge count={pendingEmployees.length} size="small" color="#fa8c16" offset={[4, -2]}>
                  <UserOutlined />
                </Badge>
                Danh sách Onboarding
              </Space>
            ),
            children: (
              <div style={{ paddingBottom: 16 }}>
                {renderEmployeesTab()}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
