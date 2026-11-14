import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Star } from "lucide-react";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Avatar } from "@/components/common/UserAvatar";
import { Tip } from "@/components/ui/tooltip";
import { isRequestOverdue, requestValue } from "@/services/selectors";
import { toggleStar } from "@/services/actions";
import { MR_STATUS, MR_TYPE } from "@/utils/constants";
import { fmtDate, fmtMoneyShort, fmtNumber } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { MaterialRequest } from "@/types";

const TABS: { key: string; label: string; test: (r: MaterialRequest, uid: string, canApprove: boolean) => boolean }[] = [
  { key: "", label: "Tất cả", test: () => true },
  { key: "den_luot", label: "Đến lượt duyệt", test: (r, _u, c) => c && r.status === "cho_duyet" },
  { key: "qua_han", label: "Quá hạn", test: (r) => isRequestOverdue(r) },
  { key: "cho_duyet", label: "Chờ xử lý", test: (r) => r.status === "cho_duyet" },
  { key: "cung_ung", label: "Đang cung ứng", test: (r) => ["da_duyet", "dat_hang", "da_nhap_kho"].includes(r.status) },
  { key: "da_chap_thuan", label: "Đã chấp thuận", test: (r) => ["da_duyet", "dat_hang", "da_nhap_kho", "hoan_thanh"].includes(r.status) },
  { key: "tu_choi", label: "Đã từ chối", test: (r) => r.status === "tu_choi" },
  { key: "tra_lai", label: "Đã trả lại", test: (r) => r.status === "tra_lai" },
  { key: "danh_dau", label: "Đã đánh dấu", test: (r) => r.starred },
  { key: "nhap", label: "Đã lưu nháp", test: (r) => r.status === "nhap" },
];

export default function RequestListPage() {
  const { db, run } = useDb();
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const loading = useSimulatedLoading();
  const [tab, setTab] = useQueryParam("tab");
  const [projectId, setProjectId] = useQueryParam("project");
  const [type, setType] = useQueryParam("type");
  const canApprove = can("material.approve");
  const base = db.materialRequests.filter((r) => (!projectId || r.projectId === projectId) && (!type || r.type === type));
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const rows = base.filter((r) => active.test(r, user!.id, canApprove)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const mat = (id: string) => db.materials.find((m) => m.id === id);

  const cols: Column<MaterialRequest>[] = [
    {
      key: "star", header: "", className: "w-8",
      cell: (r) => <button onClick={(e) => { e.stopPropagation(); run(toggleStar, r.id); }} className={cn("p-0.5", r.starred ? "text-amber-400" : "text-slate-300 hover:text-amber-400")}><Star className="h-4 w-4" fill={r.starred ? "currentColor" : "none"} /></button>,
    },
    {
      key: "title", header: "Đề xuất", sortValue: (r) => r.title,
      cell: (r) => (
        <div className="min-w-[320px] max-w-[560px]">
          <div className="flex items-center gap-2"><span className="font-semibold text-slate-800">{r.title}</span>{isRequestOverdue(r) && <Badge tone="danger">Quá hạn</Badge>}</div>
          <div className="mt-0.5 truncate text-[11.5px] text-slate-500">
            {r.code} · Nhóm: {MR_TYPE[r.type]} · Vật liệu: {r.lines.map((l) => `${mat(l.materialId)?.name} ${fmtNumber(l.qty)} ${mat(l.materialId)?.unit}`).join(", ")} · Hạng mục: {db.constructionItems.find((i) => i.id === r.itemId)?.name ?? "—"}
          </div>
        </div>
      ),
    },
    { key: "proj", header: "Dự án", sortValue: (r) => r.projectId, cell: (r) => <span className="whitespace-nowrap text-xs text-slate-600">{db.projects.find((p) => p.id === r.projectId)?.shortName}</span> },
    { key: "value", header: "Giá trị", align: "right", sortValue: (r) => requestValue(r), cell: (r) => <span className="whitespace-nowrap">{fmtMoneyShort(requestValue(r))}</span> },
    { key: "status", header: "Trạng thái", sortValue: (r) => r.status, cell: (r) => <StatusBadge map={MR_STATUS} value={r.status} dot={false} className="px-2.5 py-1" /> },
    {
      key: "req", header: "Người đề xuất → duyệt",
      cell: (r) => {
        const req = db.users.find((u) => u.id === r.requesterId);
        const ap = db.users.find((u) => u.id === r.approverId);
        const approved = ["da_duyet", "dat_hang", "da_nhap_kho", "hoan_thanh"].includes(r.status);
        return (
          <div className="flex items-center gap-2 whitespace-nowrap">
            {req && <Tip content={req.name}><span className="flex items-center gap-1.5"><Avatar name={req.name} size="xs" /><span className="text-xs text-slate-600">{req.name}</span></span></Tip>}
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            {ap && <Tip content={`${ap.name}${approved ? " – đã duyệt" : ""}`}><span className="relative"><Avatar name={ap.name} size="xs" />{approved && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-success" />}</span></Tip>}
          </div>
        );
      },
    },
    { key: "date", header: "Ngày tạo", sortValue: (r) => r.createdAt, cell: (r) => <span className="whitespace-nowrap text-xs">{fmtDate(r.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader title="Quản lý đề xuất vật tư" description="Danh sách đề xuất mua vật tư, điều chuyển, tạm ứng – theo dõi quy trình phê duyệt và cung ứng." actions={can("material.request") && <Button onClick={() => navigate(`/materials/requests/new${projectId ? `?project=${projectId}` : ""}`)}><Plus /> Tạo đề xuất</Button>} />
      <Card>
        <div className="flex gap-1 overflow-x-auto border-b px-3">
          {TABS.map((t) => {
            const n = base.filter((r) => t.test(r, user!.id, canApprove)).length;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className={cn("-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-[12.5px] font-semibold uppercase tracking-wide", active.key === t.key ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800")}>
                {t.label} <span className={cn("rounded-full px-1.5 text-[10.5px]", active.key === t.key ? "bg-primary text-white" : "bg-slate-100 text-slate-500")}>{n}</span>
              </button>
            );
          })}
        </div>
        <DataTable
          columns={cols} rows={rows} rowKey={(r) => r.id} loading={loading} onRowClick={(r) => navigate(`/materials/requests/${r.id}`)} resetKey={tab + projectId + type}
          searchText={(r) => `${r.title} ${r.code} ${r.lines.map((l) => mat(l.materialId)?.name).join(" ")}`} searchPlaceholder="Tìm kiếm đề xuất..."
          toolbar={<>
            <FilterSelect value={projectId} onChange={setProjectId} allLabel="Tất cả dự án" options={db.projects.map((p) => ({ value: p.id, label: p.shortName }))} />
            <FilterSelect value={type} onChange={setType} allLabel="Tất cả nhóm đề xuất" options={Object.entries(MR_TYPE).map(([v, l]) => ({ value: v, label: l }))} />
          </>}
          emptyTitle="Không có đề xuất trong mục này"
          emptyAction={can("material.request") && <Button size="sm" onClick={() => navigate("/materials/requests/new")}><Plus /> Tạo đề xuất</Button>}
        />
      </Card>
    </div>
  );
}
