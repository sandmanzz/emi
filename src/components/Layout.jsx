import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import GlobalSearch from './GlobalSearch';
import LanguageSwitcher from './LanguageSwitcher';
import { IconMenu, IconLogout } from './icons';
import { logoutTenant, getCurrentTenantUser } from '../lib/tenantAuth';

export default function Layout() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
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
          <button className="header-btn" onClick={() => setSidebarVisible(v => !v)} title="Toggle menu">
            <IconMenu />
          </button>
          <span className="header-title">EMI Inventory</span>
        </div>
        <GlobalSearch />
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {currentUser && (
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
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
        <Sidebar visible={sidebarVisible} />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
