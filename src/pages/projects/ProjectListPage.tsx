import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, LayoutGrid, MoreHorizontal, Pencil, Plus, Rows3, Trash2, Eye, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { decideProject, deleteProject } from "@/services/actions";
import { CATEGORY_LABELS, HEALTH, PROJECT_STATUS } from "@/utils/constants";
import { fmtDate, fmtNumber, fmtPct } from "@/utils/format";
import type { Project } from "@/types";

export default function ProjectListPage() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const loading = useSimulatedLoading();
  const [view, setView] = useState<"table" | "grid">("table");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [health, setHealth] = useState("");
  const [unit, setUnit] = useState("");
  const [formOpen, setFormOpen] = useState(() => new URLSearchParams(window.location.search).get("new") === "1");
  const [editing, setEditing] = useState<Project | undefined>();

  const rows = [...getProjectStatsMap(db).values()].filter(
    (s) => (!category || s.project.category === category) && (!status || s.project.status === status) && (!health || s.health === health) && (!unit || s.project.unitId === unit),
  );
  const pending = db.projects.filter((p) => p.approvalStatus === "cho_duyet");

  const onDelete = async (p: Project) => {
    if (await confirm({ title: `Xóa dự án “${p.shortName}”?`, description: "Toàn bộ hạng mục, kế hoạch, nhật ký, đề xuất vật tư, hồ sơ nghiệm thu & thanh toán của dự án cũng sẽ bị xóa. Có thể khôi phục bằng chức năng Reset dữ liệu demo.", confirmText: "Xóa dự án", destructive: true })) {
      run(deleteProject, p.id);
      toast.success("Đã xóa dự án");
    }
  };
  const decide = async (p: Project, approve: boolean) => {
    if (await confirm({ title: approve ? "Phê duyệt đơn xin nhận thi công?" : "Từ chối đơn xin nhận thi công?", description: approve ? `Ban hành quyết định phân giao nhiệm vụ thi công “${p.name}” cho ${db.departments.find((d) => d.id === p.unitId)?.name}.` : p.name, destructive: !approve, confirmText: approve ? "Phê duyệt" : "Từ chối" })) {
      run(decideProject, p.id, approve, "");
      toast.success(approve ? "Đã phê duyệt & ban hành quyết định phân giao nhiệm vụ" : "Đã từ chối đơn xin nhận thi công");
    }
  };

  const columns: Column<ProjectStats>[] = [
    {
      key: "name", header: "Dự án", sortValue: (s) => s.project.name,
      cell: (s) => (
        <div className="min-w-[260px]">
          <div className="font-semibold text-slate-800 hover:text-primary">{s.project.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-slate-500">
            {s.project.code} · {s.project.location}
            {s.project.approvalStatus === "cho_duyet" && <Badge tone="warning">Chờ duyệt nhận thầu</Badge>}
            {s.project.approvalStatus === "tu_choi" && <Badge tone="danger">Từ chối</Badge>}
          </div>
        </div>
      ),
    },
    { key: "cat", header: "Loại", sortValue: (s) => s.project.category, cell: (s) => <span className="whitespace-nowrap text-slate-600">{CATEGORY_LABELS[s.project.category].replace("Công trình ", "")}</span> },
    { key: "unit", header: "Đơn vị", sortValue: (s) => s.project.unitId, cell: (s) => <span className="whitespace-nowrap">{db.departments.find((d) => d.id === s.project.unitId)?.code}</span> },
    { key: "cht", header: "Chỉ huy trưởng", cell: (s) => <UserCell userId={s.project.commanderId} /> },
    { key: "time", header: "Thời gian", sortValue: (s) => s.project.startDate, cell: (s) => <span className="whitespace-nowrap text-xs text-slate-600">{fmtDate(s.project.startDate)} – {fmtDate(s.project.endDate)}</span> },
    { key: "value", header: "Giá trị HĐ (tỷ)", align: "right", sortValue: (s) => s.project.contractValue, cell: (s) => fmtNumber(s.project.contractValue / 1e9) },
    {
      key: "progress", header: "Tiến độ (TT / KH)", sortValue: (s) => s.actual,
      cell: (s) => (
        <div className="w-36">
          <div className="mb-1 flex justify-between text-[11.5px]"><span className="font-semibold">{fmtPct(s.actual)}</span><span className="text-slate-400">{fmtPct(s.planned)}</span></div>
          <Progress value={s.actual} marker={s.planned} tone={s.health === "cham_tien_do" ? "danger" : s.health === "nguy_co_cham" ? "warning" : "success"} className="h-1.5" />
        </div>
      ),
    },
    { key: "health", header: "Tình trạng", sortValue: (s) => s.delta, cell: (s) => <StatusBadge map={HEALTH} value={s.health} /> },
    { key: "status", header: "Trạng thái", sortValue: (s) => s.project.status, cell: (s) => <StatusBadge map={PROJECT_STATUS} value={s.project.status} dot={false} /> },
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
              {can("project.approve") && s.project.approvalStatus === "cho_duyet" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => decide(s.project, true)}><CheckCircle2 /> Phê duyệt nhận thi công</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => decide(s.project, false)}><XCircle /> Từ chối</DropdownMenuItem>
                </>
              )}
              {can("project.edit") && (<><DropdownMenuSeparator /><DropdownMenuItem destructive onClick={() => onDelete(s.project)}><Trash2 /> Xóa dự án</DropdownMenuItem></>)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const filters = (
    <>
      <FilterSelect value={category} onChange={setCategory} allLabel="Tất cả loại công trình" options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
      <FilterSelect value={unit} onChange={setUnit} allLabel="Tất cả đơn vị" options={db.departments.filter((d) => d.type === "cong_ty_con").map((d) => ({ value: d.id, label: d.code }))} />
      <FilterSelect value={status} onChange={setStatus} allLabel="Tất cả trạng thái" options={Object.entries(PROJECT_STATUS).map(([v, l]) => ({ value: v, label: l.label }))} />
      <FilterSelect value={health} onChange={setHealth} allLabel="Tất cả tình trạng" options={Object.entries(HEALTH).map(([v, l]) => ({ value: v, label: l.label }))} />
    </>
  );

  return (
    <div>
      <PageHeader
        title="Quản lý nhận thi công"
        description={`${db.projects.length} dự án · ${db.projects.filter((p) => p.status === "dang_thi_cong").length} đang thi công · tổng giá trị hợp đồng ${fmtNumber(db.projects.reduce((s, p) => s + p.contractValue, 0) / 1e9, 0)} tỷ đồng`}
        actions={
          <>
            <div className="flex rounded-lg border bg-white p-0.5">
              <Button variant={view === "table" ? "secondary" : "ghost"} size="xs" onClick={() => setView("table")}><Rows3 /> Bảng</Button>
              <Button variant={view === "grid" ? "secondary" : "ghost"} size="xs" onClick={() => setView("grid")}><LayoutGrid /> Thẻ</Button>
            </div>
            {can("project.edit") && <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}><Plus /> Tạo dự án</Button>}
          </>
        }
      />
      {pending.length > 0 && (
        <Card className="mb-4 flex flex-wrap items-center gap-3 border-amber-200 bg-amber-50/60 px-4 py-3 text-[13px]">
          <Badge tone="warning">QT quản lý dự án tổng thể</Badge>
          <span className="text-slate-700"><b>{pending.length}</b> đơn xin nhận thi công chờ phê duyệt: {pending.map((p) => `${p.shortName} (người duyệt: ${db.users.find((u) => u.id === (p.approverId ?? "u01"))?.name})`).join(", ")}</span>
          {can("project.approve") ? (
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="success" onClick={() => decide(pending[0], true)}>Phê duyệt</Button>
              <Button size="sm" variant="outline" onClick={() => decide(pending[0], false)}>Từ chối</Button>
            </div>
          ) : <span className="ml-auto text-xs text-slate-500">Cần vai trò Lãnh đạo để phê duyệt</span>}
        </Card>
      )}
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
