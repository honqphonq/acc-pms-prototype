import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { PageSkeleton } from "@/components/common/LoadingState";
import LoginPage from "@/pages/auth/LoginPage";
import { PlanIndexRedirect } from "@/pages/construction/PlanPage";

const Dashboard = lazy(() => import("@/pages/dashboard/DashboardPage"));
const ProjectList = lazy(() => import("@/pages/projects/ProjectListPage"));
const ProjectDetail = lazy(() => import("@/pages/projects/ProjectDetailPage"));
const Contracts = lazy(() => import("@/pages/projects/ContractsPage"));
const Plan = lazy(() => import("@/pages/construction/PlanPage"));
const TaskDetail = lazy(() => import("@/pages/construction/TaskDetailPage"));
const Logs = lazy(() => import("@/pages/construction/LogsPage"));
const RequestDetail = lazy(() => import("@/pages/materials/RequestDetailPage"));
const RequestForm = lazy(() => import("@/pages/materials/RequestFormPage"));
const Catalog = lazy(() => import("@/pages/materials/CatalogPage"));
const EquipmentList = lazy(() => import("@/pages/equipment/EquipmentListPage"));
const EquipmentDetail = lazy(() => import("@/pages/equipment/EquipmentDetailPage"));
const Shifts = lazy(() => import("@/pages/equipment/ShiftsPage"));
const Maintenance = lazy(() => import("@/pages/equipment/MaintenancePage"));
const AcceptanceList = lazy(() => import("@/pages/acceptance/AcceptanceListPage"));
const AcceptanceDetail = lazy(() => import("@/pages/acceptance/AcceptanceDetailPage"));
const Reconcile = lazy(() => import("@/pages/acceptance/ReconcilePage"));
const Settlement = lazy(() => import("@/pages/payments/SettlementPage"));
const Reports = lazy(() => import("@/pages/reports/ReportsPage"));
const Alerts = lazy(() => import("@/pages/reports/AlertsPage"));
const Admin = lazy(() => import("@/pages/admin/AdminPage"));
const Guide = lazy(() => import("@/pages/admin/GuidePage"));
const NotFound = lazy(() => import("@/pages/admin/NotFoundPage"));
const Methods = lazy(() => import("@/pages/construction/MethodsPage"));
const Staff = lazy(() => import("@/pages/construction/StaffPage"));
const Documents = lazy(() => import("@/pages/construction/DocumentsPage"));
const Operators = lazy(() => import("@/pages/equipment/OperatorsPage"));
const Repairs = lazy(() => import("@/pages/equipment/RepairsPage"));
const Disposal = lazy(() => import("@/pages/equipment/DisposalPage"));
const Incidents = lazy(() => import("@/pages/equipment/IncidentsPage"));
const Estimate = lazy(() => import("@/pages/finance/EstimatePage"));
const Costs = lazy(() => import("@/pages/finance/CostsPage"));
const CdtPayments = lazy(() => import("@/pages/finance/CdtPaymentsPage"));
const ValuePg = lazy(() => import("@/pages/finance/ValuePage"));
const Debts = lazy(() => import("@/pages/finance/DebtsPage"));
const StockHub = lazy(() => import("@/pages/materials/StockHubPage"));
const ProjectStock = lazy(() => import("@/pages/materials/StockHubPage").then((m) => ({ default: m.ProjectStockPage })));
const Directives = lazy(() => import("@/pages/directives/DirectivesPage"));
const Account = lazy(() => import("@/pages/auth/AccountPage"));

/** Đường dẫn cũ của phân hệ vật tư → kho dự án */
function ToStock({ tab }: { tab?: string }) {
  const project = new URLSearchParams(useLocation().search).get("project");
  return <Navigate to={project ? `/materials/stock/${project}${tab ? `?tab=${tab}` : ""}` : "/materials/stock"} replace />;
}

const S = ({ children }: { children: ReactNode }) => <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<S><Dashboard /></S>} />
        <Route path="directives" element={<S><Directives /></S>} />
        <Route path="projects" element={<S><ProjectList /></S>} />
        <Route path="projects/packages" element={<Navigate to="/projects/contracts" replace />} />
        <Route path="projects/contracts" element={<S><Contracts /></S>} />
        <Route path="projects/:id" element={<S><ProjectDetail /></S>} />
        <Route path="construction" element={<Navigate to="/construction/plan" replace />} />
        <Route path="construction/plan" element={<PlanIndexRedirect />} />
        <Route path="construction/plan/:projectId" element={<S><Plan /></S>} />
        <Route path="construction/plan/:projectId/task/:taskId" element={<S><TaskDetail /></S>} />
        <Route path="construction/logs" element={<S><Logs /></S>} />
        <Route path="construction/methods" element={<S><Methods /></S>} />
        <Route path="construction/staff" element={<S><Staff /></S>} />
        <Route path="construction/documents" element={<S><Documents /></S>} />
        <Route path="construction/value-report" element={<Navigate to="/finance/value" replace />} />
        <Route path="materials" element={<Navigate to="/materials/stock" replace />} />
        <Route path="materials/stock" element={<S><StockHub /></S>} />
        <Route path="materials/stock/:projectId" element={<S><ProjectStock /></S>} />
        <Route path="materials/inventory" element={<ToStock />} />
        <Route path="materials/requests" element={<ToStock tab="de_xuat" />} />
        <Route path="materials/requests/new" element={<S><RequestForm /></S>} />
        <Route path="materials/requests/:id" element={<S><RequestDetail /></S>} />
        <Route path="materials/requests/:id/edit" element={<S><RequestForm /></S>} />
        <Route path="materials/transactions" element={<ToStock tab="nhap" />} />
        <Route path="materials/receipts" element={<ToStock tab="nhap" />} />
        <Route path="materials/issues" element={<ToStock tab="xuat" />} />
        <Route path="materials/catalog" element={<S><Catalog /></S>} />
        <Route path="materials/suppliers" element={<Navigate to="/finance/debts?tab=danh-muc" replace />} />
        <Route path="equipment" element={<Navigate to="/equipment/list" replace />} />
        <Route path="equipment/list" element={<S><EquipmentList /></S>} />
        <Route path="equipment/dispatch" element={<Navigate to="/equipment/list" replace />} />
        <Route path="equipment/shifts" element={<S><Shifts /></S>} />
        <Route path="equipment/maintenance" element={<S><Maintenance /></S>} />
        <Route path="equipment/operators" element={<S><Operators /></S>} />
        <Route path="equipment/repairs" element={<S><Repairs /></S>} />
        <Route path="equipment/disposal" element={<S><Disposal /></S>} />
        <Route path="equipment/incidents" element={<S><Incidents /></S>} />
        <Route path="equipment/routes" element={<Navigate to="/equipment/list" replace />} />
        <Route path="equipment/:id" element={<S><EquipmentDetail /></S>} />
        <Route path="finance" element={<Navigate to="/materials/stock" replace />} />
        <Route path="finance/estimate" element={<S><Estimate /></S>} />
        <Route path="finance/costs" element={<S><Costs /></S>} />
        <Route path="finance/payments" element={<S><CdtPayments /></S>} />
        <Route path="finance/value" element={<S><ValuePg /></S>} />
        <Route path="finance/suppliers" element={<Navigate to="/finance/debts?tab=danh-muc" replace />} />
        <Route path="finance/debts" element={<S><Debts /></S>} />
        <Route path="account" element={<S><Account /></S>} />
        <Route path="acceptance" element={<S><AcceptanceList /></S>} />
        <Route path="acceptance/reconcile" element={<S><Reconcile /></S>} />
        <Route path="acceptance/:id" element={<S><AcceptanceDetail /></S>} />
        <Route path="payments" element={<Navigate to="/finance/payments" replace />} />
        <Route path="payments/settlement" element={<S><Settlement /></S>} />
        <Route path="reports" element={<S><Reports /></S>} />
        <Route path="alerts" element={<S><Alerts /></S>} />
        <Route path="admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="admin/:section" element={<S><Admin /></S>} />
        <Route path="guide" element={<S><Guide /></S>} />
        <Route path="*" element={<S><NotFound /></S>} />
      </Route>
    </Routes>
  );
}
