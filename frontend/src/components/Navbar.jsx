import { useState } from 'react';
import {
  BellOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
  UserOutlined,
  SearchOutlined,
  MenuOutlined,
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


export default function Navbar({ onSearch, onLogout, onToggleSidebar, isMobile, sidebarOpen, onNavigate }) {
  const user = storedUser();
  const [profileOpen, setProfileOpen] = useState(false);

  const roleColor = ROLE_CODE_COLORS[user?.roleCode] || '#1677ff';
  const avatarLetter = (user?.fullName || user?.username || 'U')[0].toUpperCase();

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 60,
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', padding: '0 clamp(10px, 2vw, 20px)',
        zIndex: 100, gap: 'clamp(8px, 1.5vw, 16px)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {/* Nút 3 dấu gạch (Hamburger Menu) để thụt thò Navbar / Sidebar */}
        <Tooltip title={isMobile ? (sidebarOpen ? 'Đóng menu' : 'Mở menu chức năng') : (sidebarOpen ? 'Thu gọn menu' : 'Mở rộng menu')}>
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: 18, color: '#374151' }} />}
            onClick={onToggleSidebar}
            id="btn-toggle-sidebar"
            aria-label="Toggle Menu"
            style={{
              width: 38,
              height: 38,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              flexShrink: 0,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          />
        </Tooltip>

        {/* Logo */}
        <div
          onClick={() => onNavigate?.('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          <div style={{
            width: 32, height: 32, background: '#1677ff', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 15,
            boxShadow: '0 2px 6px rgba(22, 119, 255, 0.3)',
          }}>H</div>
          <Text strong style={{ fontSize: 15, color: '#1677ff', letterSpacing: -0.2 }}>
            HRM Portal
          </Text>
        </div>

        {/* Search Input - linh hoạt theo kích thước màn hình */}
        <div style={{ flex: 1, maxWidth: 360, minWidth: 100 }} className="navbar-search-wrapper">
          <Input
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder="Tìm kiếm hợp đồng, nhân sự..."
            style={{ borderRadius: 8, background: '#f3f4f6', border: 'none' }}
            onChange={e => onSearch?.(e.target.value)}
            id="navbar-search"
            variant="filled"
          />
        </div>

        {/* Actions */}
        <Space style={{ marginLeft: 'auto', flexShrink: 0 }} size={6}>
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
              className="navbar-help-btn"
              style={{ color: '#6b7280' }}
            />
          </Tooltip>

          <div style={{ width: 1, height: 26, background: '#e5e7eb', margin: '0 2px' }} />

          {/* Avatar + Tên — click để mở profile */}
          <Tooltip title="Xem hồ sơ & đổi mật khẩu" placement="bottomRight">
            <Space
              size={8}
              id="navbar-profile"
              onClick={() => setProfileOpen(true)}
              style={{
                padding: '4px 8px', borderRadius: 8, cursor: 'pointer',
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
                  flexShrink: 0,
                }}
                icon={!avatarLetter && <UserOutlined />}
                size={34}
              >
                {avatarLetter}
              </Avatar>
              <div className="navbar-user-text" style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>
                  {user?.fullName || user?.username || 'Người dùng'}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {user?.roleCode || 'Nhân viên'}
                </div>
              </div>
            </Space>
          </Tooltip>

          <Tooltip title="Đăng xuất">
            <Button
              icon={<LogoutOutlined />}
              id="navbar-logout"
              danger
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
              <span className="navbar-logout-text">Logout</span>
            </Button>
          </Tooltip>
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
