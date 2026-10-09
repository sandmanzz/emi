import { Outlet, useNavigate } from 'react-router-dom';
import useSidebar from '../../components/useSidebar';
import SuperAdminSidebar from '../../components/SuperAdminSidebar';
import { IconMenu, IconLogout } from '../../components/icons';
import { logoutSuperAdmin } from '../../lib/superAdminAuth';

export default function SuperAdminLayout() {
  const { isMobile, visible: sidebarVisible, toggle: toggleSidebar, close: closeSidebar } = useSidebar();
  const navigate = useNavigate();

  function handleLogout() {
    logoutSuperAdmin();
    navigate('/superadmin/login', { replace: true });
  }

  return (
    <div className="sa-theme">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="header-btn" onClick={toggleSidebar} title="Toggle menu" aria-label="Toggle menu" aria-expanded={sidebarVisible}>
            <IconMenu />
          </button>
          <span className="header-title">SaaS Owner Panel</span>
        </div>
        <button className="header-btn" title="Logout" onClick={handleLogout}>
          <IconLogout />
        </button>
      </header>
      <div className="layout">
        <SuperAdminSidebar visible={sidebarVisible} mobile={isMobile} />
        {isMobile && sidebarVisible && <div className="sidebar-backdrop" onClick={closeSidebar} />}
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
