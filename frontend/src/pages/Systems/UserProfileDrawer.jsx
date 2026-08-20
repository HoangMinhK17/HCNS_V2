import React, { useEffect, useState } from 'react';
import {
  Drawer, Avatar, Typography, Tabs, Tag, Button, Form,
  Input, message, Spin, Space, Alert
} from 'antd';
import {
  UserOutlined, LockOutlined, PhoneOutlined,
  BankOutlined, IdcardOutlined, MailOutlined,
  SafetyCertificateOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { getEmployeeById } from '../../utils/employeeApi';
import { changePassword } from '../../utils/userApi';

const { Title, Text } = Typography;

const STATUS_MAP = {
  'Pre-Onboarding': { label: 'Thực tập sinh', color: 'cyan' },
  active: { label: 'Đang làm việc', color: 'green' },
  probation: { label: 'Thử việc', color: 'gold' },
  'maternity-leave': { label: 'Nghỉ thai sản', color: 'purple' },
  suspended: { label: 'Đình chỉ', color: 'orange' },
  inactive: { label: 'Đã nghỉ việc', color: 'red' },
  terminated: { label: 'Sa thải', color: 'volcano' },
};

const GENDER_MAP = { male: 'Nam', female: 'Nữ', other: 'Khác' };
const EDUCATION_MAP = {
  'high-school': 'THPT', college: 'Cao đẳng', university: 'Đại học',
  master: 'Thạc sĩ', phd: 'Tiến sĩ', other: 'Khác'
};
const CONTRACT_MAP = {
  probation: 'Thử việc', 'fixed-term': 'Xác định thời hạn', indefinite: 'Không xác định thời hạn'
};
const MARITAL_MAP = { single: 'Độc thân', married: 'Đã kết hôn', divorced: 'Ly hôn' };

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

const ROLE_CODE_COLORS = {
  'super-admin': '#ef4444', 'hr-admin': '#3b82f6',
  'manager': '#8b5cf6', 'employee': '#22c55e', 'viewer': '#9ca3af',
};
const ROLE_CODE_LABELS = {
  'super-admin': 'Super Admin', 'hr-admin': 'HR Admin',
  'manager': 'Quản lý', 'employee': 'Nhân viên', 'viewer': 'Xem',
};

/* ─────────────────────────────────────────────── */
export default function UserProfileDrawer({ open, onClose, user }) {
  const [employee, setEmployee] = useState(null);
  const [empLoading, setEmpLoading] = useState(false);
  const [pwForm] = Form.useForm();
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setPwSuccess(false);
    pwForm.resetFields();
    const empId = user.employee?._id || user.employee;
    if (empId) {
      fetchEmployee(empId);
    } else {
      setEmployee(null);
    }
  }, [open, user]);

  const fetchEmployee = async (id) => {
    setEmpLoading(true);
    try {
      const res = await getEmployeeById(id);
      if (res.success) setEmployee(res.data);
    } catch (e) {
      console.error('Lỗi tải thông tin nhân viên', e);
    } finally {
      setEmpLoading(false);
    }
  };

  const handleChangePassword = async (values) => {
    setPwLoading(true);
    try {
      const res = await changePassword(user._id, {
        password: values.newPassword,
        oldPassword: values.oldPassword
      });
      if (res.success) {
        setPwSuccess(true);
        pwForm.resetFields();
        message.success(res.message || 'Đổi mật khẩu thành công!');
      } else {
        message.error(res.message || 'Đổi mật khẩu thất bại');
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'Không thể đổi mật khẩu lúc này');
    } finally {
      setPwLoading(false);
    }
  };

  const roleColor = ROLE_CODE_COLORS[user?.roleCode] || '#1677ff';
  const status = STATUS_MAP[employee?.status];
  const avatarLetter = (user?.fullName || user?.username || 'U')[0].toUpperCase();

  const tabItems = [
    {
      key: 'profile',
      label: <span><IdcardOutlined style={{ marginRight: 4 }} />Thông tin cá nhân</span>,
      children: empLoading
        ? <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
        : employee ? <EmployeeInfo employee={employee} /> : <NoEmployee />,
    },
    {
      key: 'work',
      label: <span><BankOutlined style={{ marginRight: 4 }} />Công việc</span>,
      children: empLoading
        ? <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
        : employee ? <WorkInfo employee={employee} /> : <NoEmployee />,
    },
    {
      key: 'password',
      label: <span><LockOutlined style={{ marginRight: 4 }} />Đổi mật khẩu</span>,
      children: (
        <ChangePasswordTab
          form={pwForm}
          loading={pwLoading}
          success={pwSuccess}
          onFinish={handleChangePassword}
          onReset={() => setPwSuccess(false)}
        />
      ),
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={520}
      styles={{ body: { padding: 0, background: '#f8fafc' }, header: { display: 'none' } }}
      destroyOnClose
    >
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${roleColor}18 0%, #ffffff 60%)`,
        borderBottom: '1px solid #e5e7eb',
        padding: '24px 20px 18px',
        position: 'relative',
      }}>
        <Button
          type="text" size="small" onClick={onClose}
          style={{
            position: 'absolute', top: 10, right: 10,
            color: '#9ca3af', fontSize: 16, lineHeight: 1,
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >✕</Button>

        <Space size={16} align="start">
          <Avatar
            size={68}
            style={{
              background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`,
              fontSize: 26, fontWeight: 700,
              border: `3px solid ${roleColor}33`,
              flexShrink: 0,
              boxShadow: `0 4px 14px ${roleColor}33`,
            }}
          >
            {avatarLetter}
          </Avatar>
          <div style={{ paddingTop: 2 }}>
            <Title level={4} style={{ margin: 0, color: '#111827', lineHeight: 1.3 }}>
              {user?.fullName || user?.username}
            </Title>
            <Space size={6} style={{ marginTop: 6, flexWrap: 'wrap' }}>
              <Tag
                style={{
                  background: roleColor, color: '#fff',
                  borderRadius: 20, fontWeight: 600, fontSize: 11, border: 'none',
                  padding: '1px 10px',
                }}
              >
                {ROLE_CODE_LABELS[user?.roleCode] || user?.roleCode}
              </Tag>
              {status && (
                <Tag color={status.color} style={{ borderRadius: 20, fontSize: 11 }}>
                  {status.label}
                </Tag>
              )}
            </Space>
            {employee && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                {employee.department?.name && (
                  <span>{employee.department.name}</span>
                )}
                {employee.position?.name && (
                  <span style={{ marginLeft: 6, color: '#9ca3af' }}>· {employee.position.name}</span>
                )}
              </div>
            )}
            {user?.email && (
              <div style={{ marginTop: 4, fontSize: 12, color: '#9ca3af' }}>
                <MailOutlined style={{ marginRight: 4 }} />{user.email}
              </div>
            )}
          </div>
        </Space>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 16px 32px' }}>
        <Tabs defaultActiveKey="profile" size="small" style={{ marginTop: 4 }} items={tabItems} />
      </div>
    </Drawer>
  );
}

/* ── Tab 1: Thông tin cá nhân ── */
function EmployeeInfo({ employee }) {
  return (
    <div style={{ marginTop: 8 }}>
      <SectionCard title="Thông tin cơ bản" icon={<UserOutlined />}>
        <InfoRow label="Mã NV" value={<Tag color="blue" style={{ borderRadius: 6 }}>{employee.empCode}</Tag>} />
        <InfoRow label="Họ và tên" value={<strong>{employee.fullName}</strong>} />
        <InfoRow label="Giới tính" value={GENDER_MAP[employee.gender]} />
        <InfoRow label="Ngày sinh" value={fmtDate(employee.birthday)} />
        <InfoRow label="Nơi sinh" value={employee.placeOfBirth} />
        <InfoRow label="Quốc tịch" value={employee.nationality} />
        <InfoRow label="Dân tộc" value={employee.ethnicity} />
        <InfoRow label="Tôn giáo" value={employee.religion} />
        <InfoRow label="Hôn nhân" value={MARITAL_MAP[employee.maritalStatus]} />
      </SectionCard>

      <SectionCard title="Liên hệ & CCCD" icon={<PhoneOutlined />}>
        <InfoRow label="Số CCCD" value={employee.nationalId} />
        <InfoRow label="Ngày cấp" value={fmtDate(employee.nationalIdIssuedDate)} />
        <InfoRow label="Nơi cấp" value={employee.nationalIdIssuedPlace} />
        <InfoRow label="Điện thoại" value={employee.phone} />
        <InfoRow label="Email CQ" value={employee.email} />
        <InfoRow label="Email CN" value={employee.personalEmail} />
        <InfoRow label="Địa chỉ TT" value={employee.permanentAddress} />
        <InfoRow label="Chỗ ở HT" value={employee.currentAddress} />
      </SectionCard>

      <SectionCard title="Học vấn" icon={<SafetyCertificateOutlined />}>
        <InfoRow label="Trình độ" value={EDUCATION_MAP[employee.educationLevel]} />
        <InfoRow label="Chuyên ngành" value={employee.major} />
        <InfoRow label="Trường TN" value={employee.graduatedSchool} />
        <InfoRow label="Năm TN" value={employee.graduatedYear} />
      </SectionCard>
    </div>
  );
}

/* ── Tab 2: Công việc ── */
function WorkInfo({ employee }) {
  return (
    <div style={{ marginTop: 8 }}>
      <SectionCard title="Vị trí & Hợp đồng" icon={<BankOutlined />}>
        <InfoRow label="Công ty" value={employee.company?.name} />
        <InfoRow label="Phòng ban" value={employee.department?.name} />
        <InfoRow label="Chức danh" value={employee.position?.name} />
        <InfoRow label="Chức vụ" value={employee.positionName} />
        <InfoRow label="Quản lý" value={employee.reportsTo?.fullName} />
        <InfoRow label="Nơi làm việc" value={employee.workLocation} />
        <InfoRow label="Ngày thử việc" value={fmtDate(employee.startDate)} />
        <InfoRow label="Ngày chính thức" value={fmtDate(employee.officialDate)} />
        <InfoRow label="Loại HĐ" value={CONTRACT_MAP[employee.contractType]} />
        <InfoRow label="Số HĐ" value={employee.contractNo} />
        <InfoRow label="Từ ngày HĐ" value={fmtDate(employee.contractStartDate)} />
        <InfoRow label="Đến ngày HĐ" value={fmtDate(employee.endDateOfContract)} />
      </SectionCard>

      <SectionCard title="Bảo hiểm & Thuế" icon={<SafetyCertificateOutlined />}>
        <InfoRow label="Mã số thuế" value={employee.taxCode} />
        <InfoRow label="Sổ BHXH" value={employee.socialInsuranceNo} />
        <InfoRow label="Thẻ BHYT" value={employee.healthInsuranceNo} />
        <InfoRow label="Ngày tham gia" value={fmtDate(employee.socialInsuranceDate)} />
      </SectionCard>

      {employee.bankAccounts?.length > 0 && (
        <SectionCard title="Tài khoản ngân hàng" icon={<BankOutlined />}>
          {employee.bankAccounts.map((b, i) => (
            <div key={i} style={{
              background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
              marginBottom: 8, border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontWeight: 600, color: '#1677ff', fontSize: 13 }}>{b.bankName}</div>
              {b.bankBranch && <div style={{ color: '#6b7280', fontSize: 12 }}>{b.bankBranch}</div>}
              <div style={{ fontFamily: 'monospace', fontSize: 14, marginTop: 4, color: '#111827', letterSpacing: 1 }}>
                {b.accountNumber}
              </div>
              {b.accountName && (
                <div style={{ color: '#374151', fontSize: 12, marginTop: 2 }}>{b.accountName}</div>
              )}
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  );
}

/* ── Tab 3: Đổi mật khẩu ── */
function ChangePasswordTab({ form, loading, success, onFinish, onReset }) {
  return (
    <div style={{ marginTop: 16 }}>
      {success ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <CheckCircleOutlined style={{ fontSize: 56, color: '#22c55e', marginBottom: 14 }} />
          <Title level={4} style={{ color: '#111827', margin: 0 }}>Đổi mật khẩu thành công!</Title>
          <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
            Mật khẩu mới của bạn đã được cập nhật an toàn.
          </Text>
          <Button
            type="primary" style={{ marginTop: 22, borderRadius: 8, height: 40, paddingInline: 28 }}
            onClick={onReset}
          >
            Đổi lại mật khẩu
          </Button>
        </div>
      ) : (
        <div style={{
          background: '#fff', borderRadius: 12, padding: '24px 20px',
          border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <LockOutlined style={{ color: '#1677ff', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>Thay đổi mật khẩu</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Mật khẩu tối thiểu 6 ký tự</div>
            </div>
          </div>

          <Alert
            type="info" showIcon
            message="Bảo mật tài khoản"
            description="Nên đặt mật khẩu mạnh gồm chữ hoa, chữ thường, số và ký tự đặc biệt."
            style={{ marginBottom: 20, borderRadius: 8, fontSize: 12 }}
          />

          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="oldPassword" label="Mật khẩu cũ"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu cũ!' },
                { min: 6, message: 'Tối thiểu 6 ký tự!' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Nhập mật khẩu cũ"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
            <Form.Item
              name="newPassword" label="Mật khẩu mới"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                { min: 6, message: 'Tối thiểu 6 ký tự!' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Nhập mật khẩu mới"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword" label="Xác nhận mật khẩu"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Nhập lại mật khẩu mới"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Button
              type="primary" htmlType="submit" block size="large"
              loading={loading} icon={<LockOutlined />}
              style={{ borderRadius: 8, fontWeight: 600, marginTop: 6, height: 44 }}
            >
              Cập nhật mật khẩu
            </Button>
          </Form>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */
function SectionCard({ title, icon, children }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, marginBottom: 12,
      border: '1px solid #e5e7eb', overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px', background: '#f8fafc',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', gap: 8,
        fontWeight: 600, color: '#374151', fontSize: 13,
      }}>
        <span style={{ color: '#1677ff' }}>{icon}</span>
        {title}
      </div>
      <div style={{ padding: '6px 14px' }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '7px 0', borderBottom: '1px dashed #f0f0f0', gap: 12,
    }}>
      <span style={{ color: '#9ca3af', fontSize: 12, minWidth: 100, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#111827', fontSize: 13, textAlign: 'right', wordBreak: 'break-word' }}>
        {value}
      </span>
    </div>
  );
}

function NoEmployee() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9ca3af' }}>
      <UserOutlined style={{ fontSize: 44, marginBottom: 14, display: 'block' }} />
      <div style={{ fontWeight: 600, color: '#6b7280', fontSize: 14 }}>Chưa liên kết hồ sơ nhân viên</div>
      <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>
        Liên hệ admin để liên kết tài khoản với hồ sơ nhân viên.
      </div>
    </div>
  );
}