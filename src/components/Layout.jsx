import { Outlet, useNavigate } from 'react-router-dom';
import useSidebar from './useSidebar';
import Sidebar from './Sidebar';
import GlobalSearch from './GlobalSearch';
import LanguageSwitcher from './LanguageSwitcher';
import UpgradeCTA from './UpgradeCTA';
import { IconMenu, IconLogout } from './icons';
import { logoutTenant, getCurrentTenantUser } from '../lib/tenantAuth';

export default function Layout() {
  const { isMobile, visible: sidebarVisible, toggle: toggleSidebar, close: closeSidebar } = useSidebar();
  const navigate = useNavigate();
  const currentUser = getCurrentTenantUser();

  function handleLogout() {
    logoutTenant();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <header className="header">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button className="header-btn" onClick={toggleSidebar} title="Toggle menu" aria-label="Toggle menu" aria-expanded={sidebarVisible}>
            <IconMenu />
          </button>
          <span className="header-title">EMI Inventory</span>
        </div>
        <GlobalSearch />
        <div className="header-right">
          <UpgradeCTA />
          {currentUser && (
            <span className="header-user" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
              {currentUser.name} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>· {currentUser.role}</span>
            </span>
          )}
          <LanguageSwitcher />
          <button className="header-btn" title="Logout" onClick={handleLogout}>
            <IconLogout />
          </button>
        </div>
      </header>
      <div className="layout">
        <Sidebar visible={sidebarVisible} mobile={isMobile} />
        {isMobile && sidebarVisible && <div className="sidebar-backdrop" onClick={closeSidebar} />}
        <main className="main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
