import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Plus, Search, Star, Users } from "lucide-react";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Avatar } from "@/components/common/UserAvatar";
import { Tip } from "@/components/ui/tooltip";
import { RequestForm, projectTeams } from "./RequestFormPage";
import { isRequestOverdue } from "@/services/selectors";
import { toggleStar } from "@/services/actions";
import { MR_STATUS, MR_TYPE } from "@/utils/constants";
import { fmtDate, fmtNumber } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { MaterialRequest } from "@/types";

const TABS: { key: string; label: string; test: (r: MaterialRequest, canApprove: boolean) => boolean }[] = [
  { key: "", label: "Tất cả", test: () => true },
  { key: "den_luot", label: "Đến lượt duyệt", test: (r, c) => c && r.status === "cho_duyet" },
  { key: "qua_han", label: "Quá hạn", test: (r) => isRequestOverdue(r) },
  { key: "cho_duyet", label: "Chờ xử lý", test: (r) => r.status === "cho_duyet" },
  { key: "da_chap_thuan", label: "Đã chấp thuận", test: (r) => ["da_duyet", "dat_hang", "da_nhap_kho", "hoan_thanh"].includes(r.status) },
  { key: "tu_choi", label: "Đã từ chối", test: (r) => r.status === "tu_choi" },
  { key: "tra_lai", label: "Đã trả lại", test: (r) => r.status === "tra_lai" },
  { key: "danh_dau", label: "Đã đánh dấu", test: (r) => r.starred },
  { key: "nhap", label: "Đã lưu nháp", test: (r) => r.status === "nhap" },
];
const NO_TEAM = "Chưa phân tổ";

/** Đề xuất vật tư: chọn dự án → nhóm theo tổ → từ tổ mở form tạo đề xuất */
export default function RequestListPage() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [projectId, setProjectId] = useQueryParam("project", "p01");
  const [tab, setTab] = useQueryParam("tab");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [pq, setPq] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<{ team?: string } | null>(null);
  const canApprove = can("material.approve");
  const project = db.projects.find((p) => p.id === projectId) ?? db.projects[0];
  const mat = (id: string) => db.materials.find((m) => m.id === id);
  const teamOf = (r: MaterialRequest) => r.team || db.constructionPlans.find((t) => t.id === r.taskId)?.team || NO_TEAM;

  // ---- cột dự án ----
  const projects = db.projects
    .filter((p) => p.status !== "hoan_thanh" && `${p.name} ${p.shortName} ${p.code}`.toLowerCase().includes(pq.toLowerCase()))
    .map((p) => {
      const rs = db.materialRequests.filter((r) => r.projectId === p.id);
      return { p, total: rs.length, pending: rs.filter((r) => r.status === "cho_duyet").length };
    })
    .sort((a, b) => (a.p.id === project.id ? -1 : b.p.id === project.id ? 1 : b.total - a.total || a.p.shortName.localeCompare(b.p.shortName, "vi")));

  // ---- đề xuất của dự án ----
  const base = db.materialRequests.filter((r) => r.projectId === project.id && (!type || r.type === type));
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const inTab = base.filter((r) => active.test(r, canApprove));
  const visible = inTab.filter((r) => !q || `${r.code} ${r.title} ${r.lines.map((l) => mat(l.materialId)?.name).join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  const teams = useMemo(() => {
    const list = projectTeams(db, project.id).filter((t) => !/ban chỉ huy/i.test(t));
    if (base.some((r) => teamOf(r) === NO_TEAM)) list.push(NO_TEAM);
    base.forEach((r) => { const t = teamOf(r); if (!list.includes(t)) list.push(t); });
    return list;
  }, [db, project.id, base.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const leaderOf = (team: string) => {
    const ts = db.constructionPlans.filter((t) => t.projectId === project.id && t.team === team);
    const count: Record<string, number> = {};
    ts.forEach((t) => (count[t.assigneeId] = (count[t.assigneeId] ?? 0) + 1));
    const id = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0];
    return db.users.find((u) => u.id === id)?.name;
  };
  const isOpen = (team: string, n: number) => open[team] ?? n > 0;

  return (
    <div>
      <h1 className="mb-4 text-[22px] font-bold uppercase tracking-tight text-slate-900">Quản lý đề xuất vật tư</h1>
      <div className="grid gap-4 lg:grid-cols-[270px_1fr]">
        {/* Danh sách dự án */}
        <Card className="h-fit overflow-hidden lg:sticky lg:top-20">
          <div className="border-b px-4 py-3">
            <div className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-slate-700">Dự án</div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Tìm dự án..." className="h-8 pl-8" />
            </div>
          </div>
          <div className="scrollbar-visible max-h-[calc(100vh-220px)] overflow-y-auto p-2">
            {projects.map(({ p, total, pending }) => (
              <button
                key={p.id}
                onClick={() => { setProjectId(p.id); setOpen({}); }}
                className={cn("mb-1 flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition", p.id === project.id ? "bg-primary-soft ring-1 ring-primary/20" : "hover:bg-slate-50")}
              >
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate text-[13px] font-medium", p.id === project.id ? "text-primary" : "text-slate-800")}>{p.shortName}</div>
                  <div className="text-[11px] text-slate-400">{p.code} · {total} đề xuất</div>
                </div>
                {pending > 0 && <Tip content={`${pending} đề xuất chờ duyệt`}><span className="mt-0.5 rounded-full bg-amber-100 px-1.5 text-[10.5px] font-semibold text-amber-700">{pending}</span></Tip>}
              </button>
            ))}
          </div>
        </Card>

        {/* Danh sách đề xuất theo tổ */}
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
            <div className="min-w-0">
              <div className="text-[22px] font-bold text-slate-900">Danh sách đề xuất</div>
              <div className="text-[13px] text-slate-500">{project.name}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm kiếm đề xuất" className="pr-8" />
                <Search className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline">{type ? MR_TYPE[type as MaterialRequest["type"]] : "Bộ lọc"} <ChevronRight className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Nhóm đề xuất</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setType("")}>Tất cả nhóm</DropdownMenuItem>
                  {Object.entries(MR_TYPE).map(([v, l]) => <DropdownMenuItem key={v} onClick={() => setType(v)}>{l}</DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
              {can("material.request") && <Button className="bg-info hover:bg-info/90" onClick={() => setForm({})}>Tạo đề xuất</Button>}
            </div>
          </div>
          <div className="mt-2 flex gap-1 overflow-x-auto border-b px-3">
            {TABS.map((t) => {
              const n = base.filter((r) => t.test(r, canApprove)).length;
              return (
                <button key={t.key} onClick={() => setTab(t.key)} className={cn("-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-[12px] font-semibold uppercase tracking-wide", active.key === t.key ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800")}>
                  {t.label}{n > 0 && <span className="text-[10.5px] font-medium text-slate-400">({n})</span>}
                </button>
              );
            })}
          </div>

          <div>
            {teams.map((team) => {
              const rows = visible.filter((r) => teamOf(r) === team).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
              const all = base.filter((r) => teamOf(r) === team);
              const expanded = isOpen(team, rows.length);
              const leader = team !== NO_TEAM ? leaderOf(team) : undefined;
              return (
                <div key={team} className="border-b last:border-0">
                  <div className="flex items-center gap-3 bg-slate-50/80 px-5 py-2.5">
                    <button onClick={() => setOpen((o) => ({ ...o, [team]: !expanded }))} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-slate-500 ring-1 ring-slate-200"><Users className="h-3.5 w-3.5" /></span>
                      <span className="truncate text-[14px] font-semibold text-slate-800">{team}</span>
                      {leader && <span className="hidden truncate text-[12px] text-slate-500 md:inline">· Tổ trưởng: {leader}</span>}
                      <Badge tone="neutral">{all.length} đề xuất</Badge>
                      {all.filter((r) => r.status === "cho_duyet").length > 0 && <Badge tone="warning">{all.filter((r) => r.status === "cho_duyet").length} chờ duyệt</Badge>}
                    </button>
                    {can("material.request") && team !== NO_TEAM && (
                      <Button size="xs" variant="outline" className="shrink-0 border-info/40 text-info-fg hover:bg-info-soft" onClick={() => setForm({ team })}><Plus /> Tạo đề xuất</Button>
                    )}
                  </div>
                  {expanded && (rows.length === 0 ? (
                    <div className="px-14 py-3 text-[12.5px] text-slate-400">Tổ chưa có đề xuất trong mục này.{can("material.request") && team !== NO_TEAM && <> <button className="font-medium text-info-fg hover:underline" onClick={() => setForm({ team })}>Tạo đề xuất cho tổ</button></>}</div>
                  ) : rows.map((r) => {
                    const req = db.users.find((u) => u.id === r.requesterId);
                    const ap = db.users.find((u) => u.id === r.approverId);
                    const approved = ["da_duyet", "dat_hang", "da_nhap_kho", "hoan_thanh"].includes(r.status);
                    return (
                      <div key={r.id} onClick={() => navigate(`/materials/requests/${r.id}`)} className="flex cursor-pointer items-center gap-3 border-t border-slate-100 px-5 py-3 hover:bg-slate-50">
                        <button onClick={(e) => { e.stopPropagation(); run(toggleStar, r.id); }} className={cn("shrink-0 p-0.5", r.starred ? "text-amber-400" : "text-slate-300 hover:text-amber-400")}><Star className="h-4 w-4" fill={r.starred ? "currentColor" : "none"} /></button>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px]">
                            <span className="font-semibold text-slate-800">{r.title}</span>
                            <span className="ml-2 text-slate-500">Nhóm: {MR_TYPE[r.type]} · Vật liệu: {r.lines.map((l) => `${mat(l.materialId)?.name} ${fmtNumber(l.qty)} ${mat(l.materialId)?.unit}`).join(", ")} · Hạng mục: {db.constructionItems.find((i) => i.id === r.itemId)?.name ?? "—"}</span>
                          </div>
                        </div>
                        <span className="w-28 shrink-0 text-center">{isRequestOverdue(r) ? <Badge tone="danger" className="px-3 py-1">Quá hạn</Badge> : <StatusBadge map={MR_STATUS} value={r.status} dot={false} className="px-3 py-1" />}</span>
                        <span className="hidden w-40 shrink-0 items-center gap-1.5 xl:flex">{req && <><Avatar name={req.name} size="xs" /><span className="truncate text-[12.5px] text-slate-600">{req.name}</span></>}</span>
                        <span className="hidden shrink-0 items-center gap-1 md:flex">
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                          {ap && <Tip content={`${ap.name}${approved ? " – đã duyệt" : " – người xét duyệt"}`}><span className="relative"><Avatar name={ap.name} size="sm" />{approved && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-success" />}</span></Tip>}
                        </span>
                        <span className="w-20 shrink-0 text-right text-[12.5px] text-slate-600">{fmtDate(r.createdAt)}</span>
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", r.status === "nhap" || r.status === "tra_lai" ? "bg-slate-400" : "bg-info")} />
                      </div>
                    );
                  }))}
                </div>
              );
            })}
            {teams.length === 0 && <div className="py-12 text-center text-sm text-slate-500">Dự án chưa có tổ đội trong kế hoạch thi công.</div>}
          </div>
        </Card>
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent hideClose className="max-h-[94vh] max-w-6xl overflow-y-auto px-6 pb-6 pt-4">
          <DialogTitle className="sr-only">Thêm đề xuất</DialogTitle>
          {form && (
            <RequestForm
              key={`${project.id}-${form.team ?? ""}`}
              inDialog
              initProject={project.id}
              initTeam={form.team}
              onClose={() => setForm(null)}
              onSaved={(_rid, team) => { setForm(null); setTab(""); setOpen((o) => ({ ...o, [team || NO_TEAM]: true })); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
