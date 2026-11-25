import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, MoreHorizontal, Pencil, Plus, Rows3, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectProgress } from "@/components/common/ProjectProgress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserCell } from "@/components/common/UserAvatar";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { EmptyState } from "@/components/common/EmptyState";
import { ProjectCard } from "../dashboard/ProjectCard";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { getProjectStatsMap, type ProjectStats } from "@/services/selectors";
import { deleteProject } from "@/services/actions";
import { CATEGORY_LABELS, PROJECT_HEALTH, PROJECT_STATUS } from "@/utils/constants";
import { fmtDate, fmtNumber } from "@/utils/format";
import type { Project } from "@/types";
import { activeProjects, isUnit } from "@/utils/labels";

export default function ProjectListPage() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const loading = useSimulatedLoading();
  const [view, setView] = useState<"table" | "grid">("table");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("dang_thi_cong");
  const [health, setHealth] = useState("");
  const [unit, setUnit] = useState("");
  const [formOpen, setFormOpen] = useState(() => new URLSearchParams(window.location.search).get("new") === "1");
  const [editing, setEditing] = useState<Project | undefined>();

  const rows = [...getProjectStatsMap(db).values()].filter(
    (s) => (!category || s.project.category === category) && (!status || s.project.status === status) && (!health || s.health === health) && (!unit || s.project.unitId === unit),
  );

  const onDelete = async (p: Project) => {
    if (await confirm({ title: `Xóa dự án “${p.shortName}”?`, description: "Toàn bộ hạng mục, kế hoạch, nhật ký, đề xuất vật tư, hồ sơ nghiệm thu & thanh toán của dự án cũng sẽ bị xóa. Có thể khôi phục bằng chức năng Reset dữ liệu demo.", confirmText: "Xóa dự án", destructive: true })) {
      run(deleteProject, p.id);
      toast.success("Đã xóa dự án");
    }
  };
  const columns: Column<ProjectStats>[] = [
    {
      key: "name", header: "Dự án", sortValue: (s) => s.project.name,
      cell: (s) => (
        <div className="min-w-[260px]">
          <div className="font-semibold text-slate-800 hover:text-primary">{s.project.name}</div>
        </div>
      ),
    },
    { key: "cat", header: "Loại", sortValue: (s) => s.project.category, cell: (s) => <span className="whitespace-nowrap">{CATEGORY_LABELS[s.project.category]}</span>, filterValue: (s) => CATEGORY_LABELS[s.project.category] },
    { key: "unit", header: "Đơn vị", sortValue: (s) => s.project.unitId, cell: (s) => <span className="whitespace-nowrap">{db.departments.find((d) => d.id === s.project.unitId)?.code}</span> },
    { key: "cht", header: "Chỉ huy trưởng", cell: (s) => <UserCell userId={s.project.commanderId} /> },
    { key: "time", header: "Thời gian", sortValue: (s) => s.project.startDate, cell: (s) => <span className="whitespace-nowrap text-xs text-slate-600">{fmtDate(s.project.startDate)} – {fmtDate(s.project.endDate)}</span> },
    { key: "value", header: "Giá trị HĐ (tỷ)", align: "right", sortValue: (s) => s.project.contractValue, cell: (s) => fmtNumber(s.project.contractValue / 1e9) },
    {
      key: "progress", header: "Tiến độ", sortValue: (s) => s.actual - s.planned,
      cell: (s) => <ProjectProgress s={s} className="w-44" />,
    },
    { key: "health", header: "Trạng thái", sortValue: (s) => s.health, cell: (s) => (PROJECT_HEALTH[s.health] ? <StatusBadge map={PROJECT_HEALTH} value={s.health} /> : <span className="text-slate-400">—</span>) },
    { key: "status", header: "Giai đoạn", sortValue: (s) => s.project.status, cell: (s) => <StatusBadge map={PROJECT_STATUS} value={s.project.status} dot={false} /> },
    {
      key: "act", header: "", className: "w-10",
      cell: (s) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><MoreHorizontal /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/projects/${s.project.id}`)}><Eye /> Xem chi tiết</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/construction/plan/${s.project.id}`)}><Rows3 /> Tiến độ thi công</DropdownMenuItem>
              {can("project.edit") && <DropdownMenuItem onClick={() => { setEditing(s.project); setFormOpen(true); }}><Pencil /> Chỉnh sửa</DropdownMenuItem>}
              {can("project.edit") && (<><DropdownMenuSeparator /><DropdownMenuItem destructive onClick={() => onDelete(s.project)}><Trash2 /> Xóa dự án</DropdownMenuItem></>)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const filters = (
    <>
      <FilterSelect value={category} onChange={setCategory} allLabel="Tất cả loại dự án" options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
      <FilterSelect value={unit} onChange={setUnit} allLabel="Tất cả đơn vị" options={db.departments.filter(isUnit).map((d) => ({ value: d.id, label: d.code }))} />
      <FilterSelect value={status} onChange={setStatus} allLabel="Tất cả giai đoạn" options={Object.entries(PROJECT_STATUS).map(([v, l]) => ({ value: v, label: l.label }))} />
      <FilterSelect value={health} onChange={setHealth} allLabel="Tất cả trạng thái" options={Object.entries(PROJECT_HEALTH).map(([v, l]) => ({ value: v, label: l.label }))} />
    </>
  );

  return (
    <div>
      <PageHeader
        title="Danh sách dự án"
        description={`${db.projects.length} dự án · ${activeProjects(db).length} đang thi công · tổng giá trị hợp đồng ${fmtNumber(db.projects.reduce((s, p) => s + p.contractValue, 0) / 1e9, 0)} tỷ đồng`}
        actions={
          <>
            <div className="flex rounded-lg border bg-white p-0.5">
              <Button variant={view === "table" ? "secondary" : "ghost"} size="xs" onClick={() => setView("table")}><Rows3 /> Bảng</Button>
              <Button variant={view === "grid" ? "secondary" : "ghost"} size="xs" onClick={() => setView("grid")}><LayoutGrid /> Thẻ</Button>
            </div>
            {can("project.edit") && <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}><Plus /> Tạo mới dự án</Button>}
          </>
        }
      />
      {view === "table" ? (
        <Card>
          <DataTable columns={columns} rows={rows} rowKey={(s) => s.project.id} loading={loading} searchText={(s) => `${s.project.name} ${s.project.code} ${s.project.location} ${s.project.investor}`} searchPlaceholder="Tìm theo tên, mã, địa điểm, CĐT..." toolbar={filters} onRowClick={(s) => navigate(`/projects/${s.project.id}`)} emptyTitle="Không có dự án phù hợp bộ lọc" />
        </Card>
      ) : (
        <>
          <Card className="mb-4 flex flex-wrap gap-2 px-4 py-3">{filters}</Card>
          {rows.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{rows.map((s) => <ProjectCard key={s.project.id} stats={s} />)}</div> : <Card><EmptyState title="Không có dự án phù hợp bộ lọc" /></Card>}
        </>
      )}
      <ProjectFormDialog open={formOpen} onOpenChange={setFormOpen} project={editing} onSaved={(id) => !editing && id && navigate(`/projects/${id}`)} />
    </div>
  );
}
