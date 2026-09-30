import {
  DashboardOutlined,
  TeamOutlined,
  ApartmentOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  BankOutlined,
  SolutionOutlined,
  SafetyOutlined,
  UserOutlined,
  ClusterOutlined,
  GiftOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  MobileOutlined,
  LogoutOutlined,
  ThunderboltOutlined,
  LaptopOutlined,
  MailOutlined,
  FieldTimeOutlined,
  RobotOutlined,
  FileProtectOutlined,
} from '@ant-design/icons';
import { Menu, Avatar, Typography, Tag, Drawer, Tooltip } from 'antd';

const { Text } = Typography;

const ROLES = {
  SUPER_ADMIN: 'super-admin',
  HR_ADMIN: 'hr-admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  VIEWER: 'viewer',
};

const ALL_ROLES = Object.values(ROLES);

const MENU_CONFIG = [
  {
    key: 'dashboard',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
    roles: ALL_ROLES,
  },
  { type: 'divider' },
  {
    key: 'grp-core',
    type: 'group',
    label: 'NHÂN SỰ',
    roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN],
    children: [
      {
        key: 'employees',
        icon: <TeamOutlined />,
        label: 'Danh sách nhân viên',
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN],
      },
      {
        key: 'departments',
        icon: <ApartmentOutlined />,
        label: 'Phòng ban',
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN],
      },
      {
        key: 'positions',
        icon: <SolutionOutlined />,
        label: 'Chức danh',
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN],
      },
      {
        key: 'orgchart',
        icon: <ClusterOutlined />,
        label: 'Sơ đồ tổ chức',
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.MANAGER, ROLES.VIEWER],
      },
      {
        key: 'birthdays',
        icon: <GiftOutlined />,
        label: 'Sinh nhật nhân viên',
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.MANAGER],
      },
      {
        key: 'holiday-events',
        icon: <CalendarOutlined />,
        label: 'Quản lý nghỉ lễ',
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN],
      },
    ],
  },
  {
    key: 'grp-contract',
    type: 'group',
    label: 'HỢP ĐỒNG',
    roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN],
    children: [
      {
        key: 'contracts',
        icon: <FileTextOutlined />,
        label: 'Hợp đồng lao động',
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN],
      },
    ],
  },
  // { type: 'divider' },
  // {
  //   key: 'grp-ops',
  //   type: 'group',
  //   label: 'VẬN HÀNH',
  //   roles: ALL_ROLES,
  //   children: [
  //     {
  //       key: 'shifts',
  //       icon: <ClockCircleOutlined />,
  //       label: 'Ca kíp',
  //       roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.MANAGER],
  //     },
  //     {
  //       key: 'attendance',
  //       icon: <ThunderboltOutlined />,
  //       label: 'Bảng chấm công',
  //       roles: ALL_ROLES,
  //     },
  //   ],
  // },
  // {
  //   key: 'grp-ess',
  //   type: 'group',
  //   label: 'CỔNG NHÂN VIÊN (ESS)',
  //   roles: ALL_ROLES,
  //   children: [
  //     {
  //       key: 'ess/checkin',
  //       icon: <MobileOutlined />,
  //       label: 'Check-in / Check-out',
  //       roles: ALL_ROLES,
  //     },
  //     {
  //       key: 'ess/leave',
  //       icon: <LogoutOutlined />,
  //       label: 'Nghỉ phép',
  //       roles: ALL_ROLES,
  //     },
  //     {
  //       key: 'ess/overtime',
  //       icon: <FieldTimeOutlined />,
  //       label: 'Làm thêm giờ',
  //       roles: ALL_ROLES,
  //     },
  //     {
  //       key: 'ess/asset',
  //       icon: <LaptopOutlined />,
  //       label: 'Đề xuất tài sản',
  //       roles: ALL_ROLES,
  //     },
  //   ],
  // },
  // {
  //   key: 'grp-approval',
  //   type: 'group',
  //   label: 'PHÊ DUYỆT',
  //   roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.MANAGER],
  //   children: [
  //     {
  //       key: 'approvals',
  //       icon: <MailOutlined />,
  //       label: 'Hộp phê duyệt',
  //       roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.MANAGER],
  //     },
  //   ],
  // },
  { type: 'divider' },
  {
    key: 'grp-system',
    type: 'group',
    label: 'HỆ THỐNG',
    roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN],
    children: [
      {
        key: 'companies',
        icon: <BankOutlined />,
        label: 'Công ty / Pháp nhân',
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN],
      },
      {
        key: 'rbac',
        icon: <SafetyOutlined />,
        label: 'Phân quyền (RBAC)',
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN],
      },
      {
        key: 'users',
        icon: <UserOutlined />,
        label: 'Người dùng',
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN],
      },
      {
        key: 'onboarding',
        icon: <RobotOutlined />,
        label: 'Onboarding AI',
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN],
      },
      // {
      //   key: 'attendance-settings',
      //   icon: <SettingOutlined />,
      //   label: 'Cài đặt chấm công',
      //   roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN],
      // },
    ],
  },
  { type: 'divider' },
  {
    key: 'grp-invoice',
    type: 'group',
    label: 'KẾ TOÁN & HÓA ĐƠN',
    roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.MANAGER],
    children: [
      {
        key: 'invoices',
        icon: <FileProtectOutlined />,
        label: 'HĐĐT & MISA AMIS',
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.MANAGER],
      },
    ],
  },
  {
    key: 'grp-report',
    type: 'group',
    label: 'BÁO CÁO',
    roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.MANAGER, ROLES.VIEWER],
    children: [
      {
        key: 'reports',
        icon: <BarChartOutlined />,
        label: 'Báo cáo nhân sự',
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.MANAGER, ROLES.VIEWER],
      },
    ],
  },
];

const ROLE_DISPLAY = {
  'super-admin': { label: 'Super Admin', color: 'red' },
  'hr-admin': { label: 'HR Admin', color: 'blue' },
  'manager': { label: 'Quản lý', color: 'purple' },
  'employee': { label: 'Nhân viên', color: 'green' },
  'viewer': { label: 'Xem', color: 'default' },
};

function filterMenuByRole(items, userRole) {
  const result = [];

  for (const item of items) {
    if (item.type === 'divider') {
      result.push(item);
      continue;
    }

    if (item.roles && !item.roles.includes(userRole)) {
      continue; 
    }
    if (item.type === 'group' && item.children) {
      const filteredChildren = item.children.filter(
        (child) => !child.roles || child.roles.includes(userRole)
      );

      if (filteredChildren.length > 0) {
        const { roles: _roles, ...rest } = item;
        result.push({ ...rest, children: filteredChildren.map(({ roles: _r, ...c }) => c) });
      }
      continue;
    }

    const { roles: _roles, ...rest } = item;
    result.push(rest);
  }
  return result.filter((item, idx, arr) => {
    if (item.type !== 'divider') return true;
    const prev = arr[idx - 1];
    const next = arr[idx + 1];
    if (!prev) return false; 
    if (!next) return false; 
    if (prev.type === 'divider') return false;
    return true;
  });
}

export default function Sidebar({
  activePage,
  onNavigate,
  isMobile = false,
  mobileOpen = false,
  onCloseMobile,
  collapsed = false,
}) {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  })();

  const userRole = user?.roleCode || ROLES.EMPLOYEE;
  const roleDisplay = ROLE_DISPLAY[userRole] || { label: userRole, color: 'default' };

  const filteredMenuItems = filterMenuByRole(MENU_CONFIG, userRole);

  const resolveKey = (path) => {
    if (path?.startsWith('contracts/')) return 'contracts';
    if (path?.startsWith('ess/')) return path;
    return path;
  };

  const getAvatarInitial = () => {
    const name = user?.fullName || user?.username || '';
    return name.charAt(0).toUpperCase() || 'U';
  };

  const userAvatarBg = roleDisplay.color === 'red' ? '#ff4d4f'
    : roleDisplay.color === 'blue' ? '#1677ff'
      : roleDisplay.color === 'purple' ? '#7c3aed'
        : roleDisplay.color === 'green' ? '#16a34a'
          : '#6b7280';

  // TRƯỜNG HỢP 1: MÀN HÌNH RESPONSIVE (MOBILE / TABLET)
  // Hiển thị dạng Ant Design Drawer thụt thò trượt ra từ bên trái khi bấm 3 dấu gạch
  if (isMobile) {
    return (
      <Drawer
        placement="left"
        open={mobileOpen}
        onClose={onCloseMobile}
        width={275}
        styles={{
          body: {
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          },
          header: {
            padding: '12px 16px',
            borderBottom: '1px solid #f0f2f5',
          },
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, background: '#1677ff', borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14,
            }}>H</div>
            <Text strong style={{ fontSize: 15, color: '#1677ff' }}>HRM Portal</Text>
          </div>
        }
      >
        {/* User Card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px 12px',
          background: '#fafbfc',
          borderBottom: '1px solid #f0f2f5',
        }}>
          <Avatar
            style={{
              background: userAvatarBg,
              fontWeight: 700,
              flexShrink: 0,
            }}
            size={36}
          >
            {getAvatarInitial()}
          </Avatar>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <Text
              strong
              ellipsis
              style={{ fontSize: 13, display: 'block', color: '#1f2937', marginBottom: 2 }}
            >
              {user?.fullName || user?.username || 'Người dùng'}
            </Text>
            <Tag
              color={roleDisplay.color}
              style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}
            >
              {roleDisplay.label}
            </Tag>
          </div>
        </div>

        {/* Menu list với thanh cuộn mượt */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Menu
            mode="inline"
            selectedKeys={[resolveKey(activePage)]}
            onClick={({ key }) => {
              onNavigate(key);
              onCloseMobile?.(); // Tự động đóng Drawer sau khi chọn để nhường chỗ xem thông tin
            }}
            items={filteredMenuItems}
            style={{ border: 'none', fontSize: 13 }}
          />
        </div>

        {/* Footer info */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #f0f2f5',
          fontSize: 11, color: '#9ca3af', textAlign: 'center',
          background: '#fff',
        }}>
          FMS HRM v2.0 · Mobile Nav
        </div>
      </Drawer>
    );
  }

  // TRƯỜNG HỢP 2: MÀN HÌNH DESKTOP
  // Cho phép thu gọn (collapsed = 72px) hoặc mở rộng (220px) mượt mà
  return (
    <div style={{
      position: 'fixed',
      top: 60, left: 0,
      width: collapsed ? 72 : 220,
      height: 'calc(100vh - 60px)',
      background: '#fff',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 90,
      transition: 'width 0.22s cubic-bezier(0.2, 0, 0, 1)',
      overflowX: 'hidden',
    }}>
      {/* User Info Header */}
      {!collapsed ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px 12px',
          borderBottom: '1px solid #f3f4f6',
          minWidth: 220,
        }}>
          <Avatar
            style={{
              background: userAvatarBg,
              fontWeight: 700,
              flexShrink: 0,
            }}
            size={36}
          >
            {getAvatarInitial()}
          </Avatar>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <Text
              strong
              ellipsis
              style={{ fontSize: 13, display: 'block', color: '#1f2937', marginBottom: 2 }}
            >
              {user?.fullName || user?.username || 'Người dùng'}
            </Text>
            <Tag
              color={roleDisplay.color}
              style={{ fontSize: 10, lineHeight: '16px', padding: '0 6px', margin: 0 }}
            >
              {roleDisplay.label}
            </Tag>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '14px 0 12px',
          borderBottom: '1px solid #f3f4f6',
        }}>
          <Tooltip title={`${user?.fullName || user?.username || 'Người dùng'} (${roleDisplay.label})`} placement="right">
            <Avatar
              style={{
                background: userAvatarBg,
                fontWeight: 700,
              }}
              size={34}
            >
              {getAvatarInitial()}
            </Avatar>
          </Tooltip>
        </div>
      )}

      {/* Menu List */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Menu
          mode="inline"
          inlineCollapsed={collapsed}
          selectedKeys={[resolveKey(activePage)]}
          onClick={({ key }) => onNavigate(key)}
          items={filteredMenuItems}
          style={{ border: 'none', fontSize: 13 }}
        />
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid #f3f4f6',
        fontSize: 11, color: '#9ca3af', textAlign: 'center',
        whiteSpace: 'nowrap', overflow: 'hidden',
      }}>
        {!collapsed ? 'FMS HRM v2.0 · Phase 2' : 'v2.0'}
      </div>
    </div>
  );
}
