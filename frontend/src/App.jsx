import { useState, useEffect } from 'react';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import './styles/global.css';

import Navbar  from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login   from './pages/Auth/Login';
import ROUTES  from './routes';

const NotFoundPage = ({ navigate }) => (
  <div style={{ padding: '80px 32px', textAlign: 'center' }}>
    <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
    <h2 style={{ color: '#374151' }}>Trang đang được xây dựng</h2>
    <p style={{ color: '#6b7280', marginTop: 8 }}>Chức năng này sẽ ra mắt sớm.</p>
    <button
      onClick={() => navigate('dashboard')}
      style={{
        marginTop: 20, padding: '8px 20px', background: '#1677ff', color: '#fff',
        border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
      }}
    >
      ← Về Dashboard
    </button>
  </div>
);

const getCurrentPath = () => window.location.pathname.replace(/^\//, '') || 'dashboard';

const flattenRoutes = (routes, parentPath = '', parentSidebarKey = null) => {
  return routes.reduce((acc, route) => {
    const fullPath = parentPath ? `${parentPath}/${route.path}` : route.path;
    const sidebarKey = route.sidebarKey || parentSidebarKey || fullPath;
    
    acc.push({
      ...route,
      path: fullPath,
      sidebarKey,
    });
    
    if (route.children) {
      acc.push(...flattenRoutes(route.children, fullPath, sidebarKey));
    }
    return acc;
  }, []);
};

const FLATTENED_ROUTES = flattenRoutes(ROUTES);

export default function App() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath);
  const [selectedEmployee, setSelectedEmployee] = useState(() => window.history.state?.employee || null);
  // Kiểm tra token trong localStorage để xác định trạng thái đăng nhập
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('accessToken'));

  useEffect(() => {
    const handlePopState = (e) => {
      setCurrentPath(getCurrentPath());
      if (e.state?.employee) setSelectedEmployee(e.state.employee);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path, employee = null) => {
    setCurrentPath(path);
    setSelectedEmployee(path.endsWith('renewal') ? employee : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.location.pathname !== `/${path}`) {
      window.history.pushState({ employee }, '', `/${path}`);
    }
  };

  const handleLoginSuccess = (user) => {
    setIsLoggedIn(true);
    navigate('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
  };

  const activeRoute = FLATTENED_ROUTES.find((r) => r.path === currentPath);
  const sidebarKey  = activeRoute?.sidebarKey ?? currentPath;

  const PageComponent = activeRoute
    ? activeRoute.component({ navigate, employee: selectedEmployee })
    : <NotFoundPage navigate={navigate} />;

  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
      }}
    >
      {/* Nếu chưa đăng nhập: hiển thị trang Login */}
      {!isLoggedIn ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          <Navbar onLogout={handleLogout} />
          <Sidebar activePage={sidebarKey} onNavigate={navigate} />
          <main style={{
            marginLeft: 220,
            marginTop: 60,
            minHeight: 'calc(100vh - 60px)',
            background: '#f5f6fa',
          }}>
            {PageComponent}
          </main>
        </>
      )}
    </ConfigProvider>
  );
}
