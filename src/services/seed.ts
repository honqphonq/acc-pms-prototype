// Nạp dữ liệu demo gốc từ các file JSON (không hardcode trong component)
import projects from "@/data/projects.json";
import users from "@/data/users.json";
import departments from "@/data/departments.json";
import constructionItems from "@/data/construction-items.json";
import constructionPlans from "@/data/construction-plans.json";
import constructionLogs from "@/data/construction-logs.json";
import materials from "@/data/materials.json";
import suppliers from "@/data/suppliers.json";
import materialRequests from "@/data/material-requests.json";
import inventory from "@/data/inventory.json";
import stockTransactions from "@/data/stock-transactions.json";
import equipment from "@/data/equipment.json";
import equipmentAssignments from "@/data/equipment-assignments.json";
import equipmentShifts from "@/data/equipment-shifts.json";
import equipmentUsage from "@/data/equipment-usage.json";
import acceptanceRecords from "@/data/acceptance-records.json";
import paymentRecords from "@/data/payment-records.json";
import notifications from "@/data/notifications.json";
import issues from "@/data/issues.json";
import constructionMethods from "@/data/construction-methods.json";
import siteStaff from "@/data/site-staff.json";
import docFolders from "@/data/doc-folders.json";
import documents from "@/data/documents.json";
import operators from "@/data/operators.json";
import maintenancePlans from "@/data/maintenance-plans.json";
import repairs from "@/data/repairs.json";
import disposals from "@/data/disposals.json";
import incidents from "@/data/incidents.json";
import routes from "@/data/routes.json";
import stocktakes from "@/data/stocktakes.json";
import loginHistory from "@/data/login-history.json";
import contracts from "@/data/contracts.json";
import type { Database } from "@/types";

export function getSeedData(): Database {
  // structuredClone để mỗi lần reset là bản sao sạch
  return structuredClone({
    projects,
    users,
    departments,
    constructionItems,
    constructionPlans,
    constructionLogs,
    materials,
    suppliers,
    materialRequests,
    inventory,
    stockTransactions,
    equipment,
    equipmentAssignments,
    equipmentShifts,
    equipmentUsage,
    acceptanceRecords,
    paymentRecords,
    notifications,
    issues,
    constructionMethods,
    siteStaff,
    docFolders,
    documents,
    operators,
    maintenancePlans,
    repairs,
    disposals,
    incidents,
    routes,
    stocktakes,
    loginHistory,
    contracts,
  }) as unknown as Database;
}
