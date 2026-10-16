import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import EventPage from './pages/EventPage';
import EventDetailPage from './pages/EventDetailPage';
import EventSummaryPage from './pages/EventSummaryPage';
import EventCalendarPage from './pages/EventCalendarPage';
import StockOpnameReportPage from './pages/StockOpnameReportPage';
import WarehousePage from './pages/WarehousePage';
import WarehouseDetailPage from './pages/WarehouseDetailPage';
import WarehouseInventoryPage from './pages/WarehouseInventoryPage';
import EventInventoryPage from './pages/EventInventoryPage';
import InventoryPage from './pages/InventoryPage';
import InventoryDetailPage from './pages/InventoryDetailPage';
import SyncInventoryPage from './pages/SyncInventoryPage';
import AreaPage from './pages/AreaPage';
import AreaDetailPage from './pages/AreaDetailPage';
import SubAreaPage from './pages/SubAreaPage';
import EventStatusPage from './pages/EventStatusPage';
import CategoryPage from './pages/CategoryPage';
import CategoryDetailPage from './pages/CategoryDetailPage';
import UnitPage from './pages/UnitPage';
import VendorPage from './pages/VendorPage';
import VendorDetailPage from './pages/VendorDetailPage';
import LoanVendorDetailPage from './pages/LoanVendorDetailPage';
import UnitDetailPage from './pages/UnitDetailPage';
import PlaceholderPage from './pages/PlaceholderPage';
import AIAnalyzerPage from './pages/AIAnalyzerPage';
import MainDashboardPage from './pages/DashboardPage';
import InventoryReportPage from './pages/InventoryReportPage';
import OverviewReportPage from './pages/OverviewReportPage';
import LogPage from './pages/LogPage';
import UsersPage from './pages/UsersPage';
import RequireAuth from './components/RequireAuth';
import RequireTenantAuth from './components/RequireTenantAuth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import PRDPage from './pages/PRDPage';
import StockOpnamePage from './pages/StockOpnamePage';
import UpgradePage from './pages/UpgradePage';
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin';
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import DashboardPage from './pages/superadmin/DashboardPage';
import CustomersPage from './pages/superadmin/CustomersPage';
import PaymentsPage from './pages/superadmin/PaymentsPage';
import PricingPage from './pages/superadmin/PricingPage';
import DefaultCategoriesPage from './pages/superadmin/DefaultCategoriesPage';
import DefaultUnitsPage from './pages/superadmin/DefaultUnitsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route path="/superadmin/login" element={<SuperAdminLogin />} />
        <Route path="/superadmin" element={<RequireAuth><SuperAdminLayout /></RequireAuth>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="categories" element={<DefaultCategoriesPage />} />
          <Route path="units" element={<DefaultUnitsPage />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
        <Route path="/" element={<RequireTenantAuth><Layout /></RequireTenantAuth>}>
          <Route index element={<Navigate to="/event" replace />} />
          <Route path="prd" element={<PRDPage />} />
          <Route path="stock-opname" element={<StockOpnamePage />} />
          <Route path="stock-opname-report" element={<StockOpnameReportPage />} />
          <Route path="upgrade" element={<UpgradePage />} />
          <Route path="dashboard" element={<MainDashboardPage />} />
          <Route path="inventory-report" element={<InventoryReportPage />} />
          <Route path="overview-report" element={<OverviewReportPage />} />
          <Route path="event" element={<EventPage />} />
          <Route path="event-detail" element={<EventDetailPage />} />
          <Route path="event-summary" element={<EventSummaryPage />} />
          <Route path="event-calendar" element={<EventCalendarPage />} />
          <Route path="warehouse" element={<WarehousePage />} />
          <Route path="warehouse-detail" element={<WarehouseDetailPage />} />
          <Route path="warehouse-inventory" element={<WarehouseInventoryPage />} />
          <Route path="event-inventory" element={<EventInventoryPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory-detail" element={<InventoryDetailPage />} />
          <Route path="sync-inventory" element={<SyncInventoryPage />} />
          {/* Item Loan (we lent our items out) was removed 2026-10-16: a loan always means WE rent. Old links land on Loan. */}
          <Route path="item-loan" element={<Navigate to="/loan?tab=items" replace />} />
          <Route path="item-loan-detail" element={<Navigate to="/loan?tab=items" replace />} />
          <Route path="area" element={<AreaPage />} />
          <Route path="area-detail" element={<AreaDetailPage />} />
          <Route path="sub-area" element={<SubAreaPage />} />
          <Route path="event-status" element={<EventStatusPage />} />
          <Route path="category" element={<CategoryPage />} />
          <Route path="category-detail" element={<CategoryDetailPage />} />
          <Route path="unit" element={<UnitPage />} />
          <Route path="vendor" element={<VendorPage key="production" kind="production" />} />
          <Route path="loan" element={<VendorPage key="loan" kind="loan" />} />
          <Route path="loan-vendor-detail" element={<LoanVendorDetailPage />} />
          <Route path="vendor-detail" element={<VendorDetailPage />} />
          <Route path="unit-detail" element={<UnitDetailPage />} />
          <Route path="ai-analyzer" element={<AIAnalyzerPage />} />
          <Route path="qr-code" element={<PlaceholderPage title="QR Code" />} />
          <Route path="log" element={<LogPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="*" element={<Navigate to="/event" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
