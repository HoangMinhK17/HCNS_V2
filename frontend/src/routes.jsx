// Phase 1
import Dashboard      from './pages/Auth/Dashboard';
import PersonnelImport from './pages/PersonnelImport';
import ContractsList  from './pages/Contract/ContractsList';
import ContractRenewal from './pages/Contract/ContractRenewal';
import OrgChart       from './pages/Hrm/OrgChart';
import BirthdayPage   from './pages/Hrm/BirthdayPage';
import HolidayEventPage from './pages/Hrm/HolidayEventPage';
import EmployeesList  from './pages/Hrm/EmployeesList';
import DepartmentsList from './pages/Hrm/DepartmentsList';
import PositionsList  from './pages/Hrm/PositionsList';
import UsersList      from './pages/Systems/UsersList';
import RolesList      from './pages/Systems/RolesList';
import CompanyProfile from './pages/Systems/CompanyProfile';
import OnboardingManager from './pages/Systems/OnboardingManager';

// Phase 2 – Operations & ESS
import CheckinPortal      from './pages/ESS/CheckinPortal';
import LeaveManagement    from './pages/ESS/LeaveManagement';
import OvertimeManagement from './pages/ESS/OvertimeManagement';
import AssetRequestPage   from './pages/ESS/AssetRequestPage';
import AttendanceDashboard from './pages/Attendance/AttendanceDashboard';
import ShiftManagement    from './pages/Attendance/ShiftManagement';
import ApprovalInbox      from './pages/Approval/ApprovalInbox';
import AttendanceSettings from './pages/Attendance/AttendanceSettings';

const ROUTES = [
  {
    path: 'dashboard',
    sidebarKey: 'dashboard',
    component: ({ navigate }) => <Dashboard onNavigate={navigate} />,
  },
  {
    path: 'employees',
    sidebarKey: 'employees',
    component: ({ navigate }) => <EmployeesList onNavigate={navigate} />,
  },
  {
    path: 'departments',
    sidebarKey: 'departments',
    component: ({ navigate }) => <DepartmentsList onNavigate={navigate} />,
  },
  {
    path: 'positions',
    sidebarKey: 'positions',
    component: ({ navigate }) => <PositionsList onNavigate={navigate} />,
  },
  {
    path: 'personnel',
    sidebarKey: 'personnel',
    component: ({ navigate }) => <PersonnelImport onNavigate={navigate} />,
  },
  {
    path: 'orgchart',
    sidebarKey: 'orgchart',
    component: ({ navigate }) => <OrgChart onNavigate={navigate} />,
  },
  {
    path: 'birthdays',
    sidebarKey: 'birthdays',
    component: ({ navigate }) => <BirthdayPage onNavigate={navigate} />,
  },
  {
    path: 'holiday-events',
    sidebarKey: 'holiday-events',
    component: ({ navigate }) => <HolidayEventPage onNavigate={navigate} />,
  },
  {
    path: 'contracts',
    sidebarKey: 'contracts',
    component: ({ navigate }) => <ContractsList onNavigate={navigate} />,
    children: [
      {
        path: 'renewal',
        component: ({ navigate, employee }) => (
          <ContractRenewal employee={employee} onNavigate={navigate} />
        ),
      },
    ],
  },
  {
    path: 'users',
    sidebarKey: 'users',
    component: ({ navigate }) => <UsersList onNavigate={navigate} />,
  },
  {
    path: 'rbac',
    sidebarKey: 'rbac',
    component: ({ navigate }) => <RolesList onNavigate={navigate} />,
  },
  {
    path: 'companies',
    sidebarKey: 'companies',
    component: ({ navigate }) => <CompanyProfile onNavigate={navigate} />,
  },
  {
    path: 'onboarding',
    sidebarKey: 'onboarding',
    component: ({ navigate }) => <OnboardingManager onNavigate={navigate} />,
  },

  // ── Phase 2 Routes ──────────────────────────────────────────
  {
    path: 'shifts',
    sidebarKey: 'shifts',
    component: ({ navigate }) => <ShiftManagement onNavigate={navigate} />,
  },
  {
    path: 'attendance',
    sidebarKey: 'attendance',
    component: ({ navigate }) => <AttendanceDashboard onNavigate={navigate} />,
  },
  {
    path: 'ess/checkin',
    sidebarKey: 'ess/checkin',
    component: ({ navigate }) => <CheckinPortal onNavigate={navigate} />,
  },
  {
    path: 'ess/leave',
    sidebarKey: 'ess/leave',
    component: ({ navigate }) => <LeaveManagement onNavigate={navigate} />,
  },
  {
    path: 'ess/overtime',
    sidebarKey: 'ess/overtime',
    component: ({ navigate }) => <OvertimeManagement onNavigate={navigate} />,
  },
  {
    path: 'ess/asset',
    sidebarKey: 'ess/asset',
    component: ({ navigate }) => <AssetRequestPage onNavigate={navigate} />,
  },
  {
    path: 'approvals',
    sidebarKey: 'approvals',
    component: ({ navigate }) => <ApprovalInbox onNavigate={navigate} />,
  },
  {
    path: 'attendance-settings',
    sidebarKey: 'attendance-settings',
    component: ({ navigate }) => <AttendanceSettings onNavigate={navigate} />,
  },
];

export default ROUTES;

