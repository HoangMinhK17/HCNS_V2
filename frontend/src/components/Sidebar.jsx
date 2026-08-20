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
} from '@ant-design/icons';
import { Menu, Avatar, Typography, Tag } from 'antd';

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
      // {
      //   key: 'attendance-settings',
      //   icon: <SettingOutlined />,
      //   label: 'Cài đặt chấm công',
      //   roles: [ROLES.SUPER_ADMIN, ROLES.HR_ADMIN],
      // },
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

export default function Sidebar({ activePage, onNavigate }) {
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

  return (
    <div style={{
      position: 'fixed',
      top: 60, left: 0,
      width: 220,
      height: 'calc(100vh - 60px)',
      background: '#fff',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 90,
      overflowY: 'auto',
    }}>
      {/* User Info */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px 12px',
        borderBottom: '1px solid #f3f4f6',
      }}>
        <Avatar
          style={{
            background: roleDisplay.color === 'red' ? '#ff4d4f'
              : roleDisplay.color === 'blue' ? '#1677ff'
                : roleDisplay.color === 'purple' ? '#7c3aed'
                  : roleDisplay.color === 'green' ? '#16a34a'
                    : '#6b7280',
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

      <Menu
        mode="inline"
        selectedKeys={[resolveKey(activePage)]}
        onClick={({ key }) => onNavigate(key)}
        items={filteredMenuItems}
        style={{ border: 'none', flex: 1, fontSize: 13 }}
      />

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #f3f4f6',
        fontSize: 11, color: '#9ca3af', textAlign: 'center',
      }}>
        FMS HRM v2.0 · Phase 2
      </div>
    </div>
  );
}
