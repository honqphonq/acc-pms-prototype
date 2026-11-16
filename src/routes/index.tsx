import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { PageSkeleton } from "@/components/common/LoadingState";
import LoginPage from "@/pages/auth/LoginPage";
import { PlanIndexRedirect } from "@/pages/construction/PlanPage";

const Dashboard = lazy(() => import("@/pages/dashboard/DashboardPage"));
const ProjectList = lazy(() => import("@/pages/projects/ProjectListPage"));
const ProjectDetail = lazy(() => import("@/pages/projects/ProjectDetailPage"));
const Packages = lazy(() => import("@/pages/projects/PackagesPage"));
const Contracts = lazy(() => import("@/pages/projects/ContractsPage"));
const Plan = lazy(() => import("@/pages/construction/PlanPage"));
const TaskDetail = lazy(() => import("@/pages/construction/TaskDetailPage"));
const Logs = lazy(() => import("@/pages/construction/LogsPage"));
const ValueReport = lazy(() => import("@/pages/construction/ValueReportPage"));
const Inventory = lazy(() => import("@/pages/materials/InventoryPage"));
const RequestList = lazy(() => import("@/pages/materials/RequestListPage"));
const RequestDetail = lazy(() => import("@/pages/materials/RequestDetailPage"));
const RequestForm = lazy(() => import("@/pages/materials/RequestFormPage"));
const Transactions = lazy(() => import("@/pages/materials/TransactionsPage"));
const Catalog = lazy(() => import("@/pages/materials/CatalogPage"));
const Suppliers = lazy(() => import("@/pages/materials/SuppliersPage"));
const EquipmentList = lazy(() => import("@/pages/equipment/EquipmentListPage"));
const EquipmentDetail = lazy(() => import("@/pages/equipment/EquipmentDetailPage"));
const Dispatch = lazy(() => import("@/pages/equipment/DispatchPage"));
const Shifts = lazy(() => import("@/pages/equipment/ShiftsPage"));
const Maintenance = lazy(() => import("@/pages/equipment/MaintenancePage"));
const AcceptanceList = lazy(() => import("@/pages/acceptance/AcceptanceListPage"));
const AcceptanceDetail = lazy(() => import("@/pages/acceptance/AcceptanceDetailPage"));
const Reconcile = lazy(() => import("@/pages/acceptance/ReconcilePage"));
const Payments = lazy(() => import("@/pages/payments/PaymentsPage"));
const Settlement = lazy(() => import("@/pages/payments/SettlementPage"));
const Reports = lazy(() => import("@/pages/reports/ReportsPage"));
const Alerts = lazy(() => import("@/pages/reports/AlertsPage"));
const Admin = lazy(() => import("@/pages/admin/AdminPage"));
const Guide = lazy(() => import("@/pages/admin/GuidePage"));
const NotFound = lazy(() => import("@/pages/admin/NotFoundPage"));

const S = ({ children }: { children: ReactNode }) => <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<S><Dashboard /></S>} />
        <Route path="projects" element={<S><ProjectList /></S>} />
        <Route path="projects/packages" element={<S><Packages /></S>} />
        <Route path="projects/contracts" element={<S><Contracts /></S>} />
        <Route path="projects/:id" element={<S><ProjectDetail /></S>} />
        <Route path="construction" element={<Navigate to="/construction/plan" replace />} />
        <Route path="construction/plan" element={<PlanIndexRedirect />} />
        <Route path="construction/plan/:projectId" element={<S><Plan /></S>} />
        <Route path="construction/plan/:projectId/task/:taskId" element={<S><TaskDetail /></S>} />
        <Route path="construction/logs" element={<S><Logs /></S>} />
        <Route path="construction/value-report" element={<S><ValueReport /></S>} />
        <Route path="materials" element={<Navigate to="/materials/inventory" replace />} />
        <Route path="materials/inventory" element={<S><Inventory /></S>} />
        <Route path="materials/requests" element={<S><RequestList /></S>} />
        <Route path="materials/requests/new" element={<S><RequestForm /></S>} />
        <Route path="materials/requests/:id" element={<S><RequestDetail /></S>} />
        <Route path="materials/requests/:id/edit" element={<S><RequestForm /></S>} />
        <Route path="materials/transactions" element={<S><Transactions /></S>} />
        <Route path="materials/catalog" element={<S><Catalog /></S>} />
        <Route path="materials/suppliers" element={<S><Suppliers /></S>} />
        <Route path="equipment" element={<Navigate to="/equipment/list" replace />} />
        <Route path="equipment/list" element={<S><EquipmentList /></S>} />
        <Route path="equipment/dispatch" element={<S><Dispatch /></S>} />
        <Route path="equipment/shifts" element={<S><Shifts /></S>} />
        <Route path="equipment/maintenance" element={<S><Maintenance /></S>} />
        <Route path="equipment/:id" element={<S><EquipmentDetail /></S>} />
        <Route path="finance" element={<Navigate to="/acceptance" replace />} />
        <Route path="acceptance" element={<S><AcceptanceList /></S>} />
        <Route path="acceptance/reconcile" element={<S><Reconcile /></S>} />
        <Route path="acceptance/:id" element={<S><AcceptanceDetail /></S>} />
        <Route path="payments" element={<S><Payments /></S>} />
        <Route path="payments/settlement" element={<S><Settlement /></S>} />
        <Route path="reports" element={<S><Reports /></S>} />
        <Route path="alerts" element={<S><Alerts /></S>} />
        <Route path="admin" element={<S><Admin /></S>} />
        <Route path="guide" element={<S><Guide /></S>} />
        <Route path="*" element={<S><NotFound /></S>} />
      </Route>
    </Routes>
  );
}
