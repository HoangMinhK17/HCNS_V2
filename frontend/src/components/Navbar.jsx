import { useState } from 'react';
import {
  BellOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
  UserOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Input, Badge, Avatar, Tooltip, Button, Space, Typography, message } from 'antd';
import { logout } from '../utils/userApi';
import UserProfileDrawer from '../pages/Systems/UserProfileDrawer';

const { Text } = Typography;

const storedUser = () => {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
};

const ROLE_CODE_COLORS = {
  'super-admin': '#ef4444',
  'hr-admin': '#3b82f6',
  'manager': '#8b5cf6',
  'employee': '#22c55e',
  'viewer': '#9ca3af',
};


export default function Navbar({ onSearch, onLogout }) {
  const user = storedUser();
  const [profileOpen, setProfileOpen] = useState(false);

  const roleColor = ROLE_CODE_COLORS[user?.roleCode] || '#1677ff';
  const avatarLetter = (user?.fullName || user?.username || 'U')[0].toUpperCase();

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 60,
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', padding: '0 24px',
        zIndex: 100, gap: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
          <div style={{
            width: 32, height: 32, background: '#1677ff', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 15,
          }}>H</div>
          <Text strong style={{ fontSize: 15, color: '#1677ff' }}>HRM Portal</Text>
        </div>

        {/* Search */}
        <Input
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          placeholder="Tìm kiếm hợp đồng, nhân sự..."
          style={{ maxWidth: 400, flex: 1, borderRadius: 8, background: '#f3f4f6', border: 'none' }}
          onChange={e => onSearch?.(e.target.value)}
          id="navbar-search"
          variant="filled"
        />

        {/* Actions */}
        <Space style={{ marginLeft: 'auto' }} size={4}>
          <Tooltip title="Thông báo">
            <Badge count={5} size="small">
              <Button
                shape="circle"
                icon={<BellOutlined />}
                type="text"
                size="large"
                id="navbar-bell"
                style={{ color: '#6b7280' }}
              />
            </Badge>
          </Tooltip>

          <Tooltip title="Trợ giúp">
            <Button
              shape="circle"
              icon={<QuestionCircleOutlined />}
              type="text"
              size="large"
              id="navbar-help"
              style={{ color: '#6b7280' }}
            />
          </Tooltip>

          <div style={{ width: 1, height: 28, background: '#e5e7eb', margin: '0 4px' }} />

          {/* Avatar + Tên — click để mở profile */}
          <Tooltip title="Xem hồ sơ & đổi mật khẩu" placement="bottomRight">
            <Space
              size={8}
              id="navbar-profile"
              onClick={() => setProfileOpen(true)}
              style={{
                padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                transition: 'background 0.18s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Avatar
                style={{
                  background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`,
                  fontSize: 13,
                  fontWeight: 700,
                  boxShadow: `0 2px 8px ${roleColor}44`,
                }}
                icon={!avatarLetter && <UserOutlined />}
                size={34}
              >
                {avatarLetter}
              </Avatar>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>
                  {user?.fullName || user?.username || 'Người dùng'}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {user?.roleCode || 'Nhân viên'}
                </div>
              </div>
            </Space>
          </Tooltip>

          <Button
            icon={<LogoutOutlined />}
            id="navbar-logout"
            style={{ borderRadius: 8 }}
            onClick={async () => {
              try { await logout(); } catch (_) {}
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              message.success('Đã đăng xuất');
              onLogout?.();
            }}
          >
            Logout
          </Button>
        </Space>
      </div>

      {/* Profile Drawer */}
      <UserProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
      />
    </>
  );
}
