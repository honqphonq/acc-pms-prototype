import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, FilePlus2, MoreHorizontal, Pencil, Workflow } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { FormField } from "@/components/common/FormField";
import { AssumptionTag } from "@/components/common/Assumption";
import { StockMoveDialog } from "./StockMoveDialog";
import { getStockRows, STOCK_STATUS, type StockRow } from "@/services/selectors";
import { updateInventory } from "@/services/actions";
import { fmtMoneyShort, fmtNumber, fmtPct } from "@/utils/format";
import { DEMO_TODAY, diffDays } from "@/utils/date";
import { StocktakePanel } from "./StocktakePanel";

const FLOW = ["Nhu cầu vật tư", "Lập đề xuất", "CHT phê duyệt", "Kiểm tra tồn kho", "Chọn NCC & mua hàng", "Nhập kho", "Xuất sử dụng"];

export default function InventoryPage() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const loading = useSimulatedLoading();
  const [projectId, setProjectId] = useQueryParam("project");
  const [materialId, setMaterialId] = useQueryParam("material");
  const [status, setStatus] = useState("");
  const [group, setGroup] = useState("");
  const [move, setMove] = useState<{ type: "nhap" | "xuat"; projectId?: string; materialId?: string } | null>(null);
  const [normEdit, setNormEdit] = useState<StockRow | null>(null);
  const [norm, setNorm] = useState({ normQty: "", minStock: "" });

  const all = getStockRows(db);
  const isSlow = (r: (typeof all)[number]) => r.onHand > 0 && r.issued > 0 && db.projects.find((p) => p.id === r.inv.projectId)?.status === "dang_thi_cong" && (!r.lastIssue || diffDays(r.lastIssue, DEMO_TODAY) > 45);
  const base = all.filter((r) => (!projectId || r.inv.projectId === projectId) && (!materialId || r.inv.materialId === materialId) && (!group || r.material.group === group));
  const rows = base.filter((r) => !status || (status === "cham_luan_chuyen" ? isSlow(r) : status === "sap_vuot" ? r.status === "sap_vuot" || r.status === "vuot_dinh_muc" : r.status === status));
  const slow = base.filter(isSlow);
  const pName = (id: string) => db.projects.find((p) => p.id === id)?.shortName ?? "";
  const groups = [...new Set(db.materials.map((m) => m.group))];

  const demand = rows
    .map((r) => ({ r, need: Math.max(0, r.inv.normQty - r.issued - r.onHand - r.pending) }))
    .filter((x) => x.need > 0 && db.projects.find((p) => p.id === x.r.inv.projectId)?.status === "dang_thi_cong");

  const cols: Column<StockRow>[] = [
    { key: "m", header: "Vật tư", sortValue: (r) => r.material.name, cell: (r) => <div className="min-w-[180px]"><div className="font-medium text-slate-800">{r.material.name}</div><div className="text-[11px] text-slate-400">{r.material.code} · {r.material.group}</div></div> },
    { key: "p", header: "Kho công trình", sortValue: (r) => pName(r.inv.projectId), cell: (r) => <span className="whitespace-nowrap text-slate-600">{pName(r.inv.projectId)}</span> },
    { key: "u", header: "ĐVT", cell: (r) => r.material.unit },
    { key: "norm", header: "Định mức", align: "right", sortValue: (r) => r.inv.normQty, cell: (r) => fmtNumber(r.inv.normQty) },
    { key: "in", header: "Đã nhập", align: "right", sortValue: (r) => r.received, cell: (r) => fmtNumber(r.received) },
    { key: "out", header: "Đã xuất", align: "right", sortValue: (r) => r.issued, cell: (r) => fmtNumber(r.issued) },
    { key: "onhand", header: "Tồn kho", align: "right", sortValue: (r) => r.onHand, cell: (r) => <span className={r.status === "thieu_hang" ? "font-bold text-rose-600" : "font-semibold"}>{fmtNumber(r.onHand)}</span> },
    { key: "min", header: "Tồn tối thiểu", align: "right", cell: (r) => <span className="text-slate-500">{fmtNumber(r.inv.minStock)}</span> },
    { key: "pend", header: "Đang đề xuất", align: "right", sortValue: (r) => r.pending, cell: (r) => r.pending ? <span className="text-info-fg">{fmtNumber(r.pending)}</span> : <span className="text-slate-300">—</span> },
    { key: "usage", header: "Tiêu hao / ĐM", sortValue: (r) => r.usage, cell: (r) => <div className="w-28"><div className="mb-1 text-[11.5px]">{fmtPct(r.usage, 0)}</div><Progress value={r.usage} tone={r.usage > 1 ? "danger" : r.usage >= 0.9 ? "warning" : "info"} className="h-1.5" /></div> },
    { key: "st", header: "Tình trạng", sortValue: (r) => r.status, cell: (r) => <Badge tone={STOCK_STATUS[r.status].tone} dot>{STOCK_STATUS[r.status].label}</Badge> },
    {
      key: "a", header: "", cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm"><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {can("stock.move") && <DropdownMenuItem onClick={() => setMove({ type: "nhap", projectId: r.inv.projectId, materialId: r.inv.materialId })}><ArrowDownToLine /> Nhập kho</DropdownMenuItem>}
            {can("stock.move") && <DropdownMenuItem onClick={() => setMove({ type: "xuat", projectId: r.inv.projectId, materialId: r.inv.materialId })}><ArrowUpFromLine /> Xuất sử dụng</DropdownMenuItem>}
            {can("material.request") && <DropdownMenuItem onClick={() => navigate(`/materials/requests/new?project=${r.inv.projectId}&material=${r.inv.materialId}`)}><FilePlus2 /> Lập đề xuất vật tư</DropdownMenuItem>}
            {can("material.purchase") && <DropdownMenuItem onClick={() => { setNormEdit(r); setNorm({ normQty: String(r.inv.normQty), minStock: String(r.inv.minStock) }); }}><Pencil /> Sửa định mức / tồn tối thiểu</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tồn kho và kiểm kê"
        description="Tra cứu tồn kho theo kho công trình, kiểm kê định kỳ, cảnh báo tồn kho thấp, tồn lâu chậm luân chuyển và vượt định mức."
        actions={can("stock.move") && <><Button variant="outline" onClick={() => setMove({ type: "xuat", projectId: projectId || undefined })}><ArrowUpFromLine /> Xuất kho</Button><Button onClick={() => setMove({ type: "nhap", projectId: projectId || undefined })}><ArrowDownToLine /> Nhập kho</Button></>}
      />
      <Card className="mb-4 flex flex-wrap items-center gap-1.5 px-4 py-3 text-[12px]">
        <Workflow className="mr-1 h-4 w-4 text-primary" /><span className="mr-2 font-semibold text-slate-700">QT cung ứng vật tư:</span>
        {FLOW.map((f, i) => <span key={f} className="flex items-center gap-1.5"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{f}</span>{i < FLOW.length - 1 && <span className="text-slate-300">→</span>}</span>)}
      </Card>
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Giá trị tồn kho" value={fmtMoneyShort(rows.reduce((s, r) => s + r.value, 0))} tone="navy" sub={`${rows.length} mã vật tư tại các kho`} />
        <KpiCard label="Thiếu hụt (dưới tồn tối thiểu)" value={base.filter((r) => r.status === "thieu_hang").length} unit="mã" tone="danger" onClick={() => setStatus("thieu_hang")} sub="Bấm để lọc" />
        <KpiCard label="Vượt / sắp vượt định mức" value={base.filter((r) => r.status === "vuot_dinh_muc" || r.status === "sap_vuot").length} unit="mã" tone="warning" onClick={() => setStatus("sap_vuot")} sub="Tiêu hao ≥ 90% định mức dự toán" />
        <KpiCard label="Tồn lâu, chậm luân chuyển" value={slow.length} unit="mã" tone="info" onClick={() => setStatus("cham_luan_chuyen")} sub="Còn tồn nhưng không xuất dùng > 45 ngày" />
      </div>
      <Tabs defaultValue="stock">
        <TabsList className="rounded-t-xl bg-white px-2">
          <TabsTrigger value="stock">Tồn kho & định mức</TabsTrigger>
          <TabsTrigger value="demand">Nhu cầu vật tư còn lại ({demand.length})</TabsTrigger>
          <TabsTrigger value="stocktake">Kiểm kê kho ({db.stocktakes.filter((s) => !projectId || s.projectId === projectId).length})</TabsTrigger>
        </TabsList>
        <TabsContent value="stock" className="mt-0">
          <Card className="rounded-t-none">
            <DataTable columns={cols} rows={rows} rowKey={(r) => r.inv.id} loading={loading} resetKey={projectId + status + group + materialId}
              searchText={(r) => `${r.material.name} ${r.material.code} ${pName(r.inv.projectId)}`} searchPlaceholder="Tìm vật tư, kho..."
              toolbar={<>
                <FilterSelect value={projectId} onChange={setProjectId} allLabel="Tất cả kho công trình" options={db.projects.map((p) => ({ value: p.id, label: p.shortName }))} />
                <FilterSelect value={group} onChange={setGroup} allLabel="Tất cả nhóm" options={groups.map((g) => ({ value: g, label: g }))} />
                <FilterSelect value={status} onChange={setStatus} allLabel="Tất cả tình trạng" options={[...Object.entries(STOCK_STATUS).map(([v, l]) => ({ value: v, label: l.label })), { value: "cham_luan_chuyen", label: "Tồn lâu, chậm luân chuyển" }]} />
                {materialId && <Button size="sm" variant="ghost" onClick={() => setMaterialId("")}>Bỏ lọc vật tư</Button>}
              </>}
              rowClassName={(r) => (r.status === "thieu_hang" ? "bg-rose-50/40" : undefined)}
            />
          </Card>
        </TabsContent>
        <TabsContent value="demand" className="mt-0">
          <Card className="rounded-t-none">
            <div className="flex items-center gap-2 border-b px-4 py-3 text-xs text-slate-500">Nhu cầu còn lại = Định mức dự toán − Đã xuất dùng − Tồn kho − Đang đề xuất/đặt hàng <AssumptionTag>Công thức tính nhu cầu là đề xuất của prototype; thực tế sẽ tính theo định mức từng công việc, giai đoạn và mũi thi công.</AssumptionTag></div>
            <DataTable
              rows={demand} rowKey={(x) => x.r.inv.id} loading={loading} pageSize={10}
              searchText={(x) => `${x.r.material.name} ${pName(x.r.inv.projectId)}`}
              columns={[
                { key: "p", header: "Công trình", sortValue: (x) => pName(x.r.inv.projectId), cell: (x) => pName(x.r.inv.projectId) },
                { key: "m", header: "Vật tư", sortValue: (x) => x.r.material.name, cell: (x) => <b className="font-medium">{x.r.material.name}</b> },
                { key: "norm", header: "Định mức", align: "right", cell: (x) => `${fmtNumber(x.r.inv.normQty)} ${x.r.material.unit}` },
                { key: "used", header: "Đã dùng + tồn + đang ĐX", align: "right", cell: (x) => fmtNumber(x.r.issued + x.r.onHand + x.r.pending) },
                { key: "need", header: "Nhu cầu còn lại", align: "right", sortValue: (x) => x.need * x.r.material.unitPrice, cell: (x) => <b>{fmtNumber(x.need)} {x.r.material.unit}</b> },
                { key: "val", header: "Giá trị ước tính", align: "right", sortValue: (x) => x.need * x.r.material.unitPrice, cell: (x) => fmtMoneyShort(x.need * x.r.material.unitPrice) },
                { key: "a", header: "", cell: (x) => can("material.request") && <Button size="xs" variant="soft" onClick={() => navigate(`/materials/requests/new?project=${x.r.inv.projectId}&material=${x.r.inv.materialId}`)}>Lập đề xuất</Button> },
              ]}
            />
          </Card>
        </TabsContent>
        <TabsContent value="stocktake" className="mt-0"><StocktakePanel projectId={projectId} /></TabsContent>
      </Tabs>
      {move && <StockMoveDialog open={!!move} onOpenChange={(o) => !o && setMove(null)} type={move.type} projectId={move.projectId} materialId={move.materialId} />}
      <Dialog open={!!normEdit} onOpenChange={(o) => !o && setNormEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Định mức – {normEdit?.material.name}</DialogTitle></DialogHeader>
          <DialogBody className="grid gap-3 sm:grid-cols-2">
            <FormField label={`Định mức dự toán (${normEdit?.material.unit})`}><Input type="number" value={norm.normQty} onChange={(e) => setNorm({ ...norm, normQty: e.target.value })} /></FormField>
            <FormField label="Tồn kho tối thiểu"><Input type="number" value={norm.minStock} onChange={(e) => setNorm({ ...norm, minStock: e.target.value })} /></FormField>
          </DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setNormEdit(null)}>Hủy</Button><Button onClick={() => { run(updateInventory, normEdit!.inv.id, { normQty: Number(norm.normQty), minStock: Number(norm.minStock) }); toast.success("Đã cập nhật định mức"); setNormEdit(null); }}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
