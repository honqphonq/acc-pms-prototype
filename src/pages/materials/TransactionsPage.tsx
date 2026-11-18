import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";
import { saveRow } from "@/services/actions";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { StockMoveDialog } from "./StockMoveDialog";
import { fmtDate, fmtMoneyShort, fmtNumber } from "@/utils/format";
import { exportCsv } from "@/utils/export";
import type { StockTransaction } from "@/types";

export const SUBTYPE: Record<string, string> = {
  ncc: "Nhập từ nhà cung cấp", dieu_chuyen: "Điều chuyển", tra_lai: "Hoàn trả từ công trường", kiem_ke: "Điều chỉnh kiểm kê",
  thi_cong: "Xuất thi công công trình", tra_ncc: "Xuất trả nhà cung cấp",
};
const SUB_OPTIONS = { nhap: ["ncc", "dieu_chuyen", "tra_lai", "kiem_ke"], xuat: ["thi_cong", "dieu_chuyen", "tra_ncc", "kiem_ke"] };

export const ReceiptsPage = () => <TransactionsPage fixedType="nhap" />;
export const IssuesPage = () => <TransactionsPage fixedType="xuat" />;

export default function TransactionsPage({ fixedType }: { fixedType?: "nhap" | "xuat" }) {
  const { db, run } = useDb();
  const { can } = useAuth();
  const loading = useSimulatedLoading();
  const [projectId, setProjectId] = useQueryParam("project");
  const [type, setType] = useState<string>(fixedType ?? "");
  const [sub, setSub] = useState("");
  const [move, setMove] = useState<"nhap" | "xuat" | null>(null);
  const mat = (id: string) => db.materials.find((m) => m.id === id);
  const rows = db.stockTransactions.filter((t) => (!projectId || t.projectId === projectId) && (!type || t.type === type) && (!sub || t.subType === sub)).sort((a, b) => b.date.localeCompare(a.date) || b.code.localeCompare(a.code));
  const valueOf = (t: StockTransaction) => t.qty * (mat(t.materialId)?.unitPrice ?? 0);
  const inV = rows.filter((t) => t.type === "nhap").reduce((s, t) => s + valueOf(t), 0);
  const outV = rows.filter((t) => t.type === "xuat").reduce((s, t) => s + valueOf(t), 0);

  const cols: Column<StockTransaction>[] = [
    { key: "code", header: "Số phiếu", sortValue: (t) => t.code, cell: (t) => <span className="font-medium">{t.code}</span> },
    { key: "type", header: "Loại phiếu", sortValue: (t) => t.subType, cell: (t) => <div className="flex flex-col items-start gap-0.5">{t.type === "nhap" ? <Badge tone="info"><ArrowDownToLine className="h-3 w-3" /> Nhập kho</Badge> : <Badge tone="warning"><ArrowUpFromLine className="h-3 w-3" /> Xuất kho</Badge>}<span className="whitespace-nowrap text-[11px] text-slate-500">{SUBTYPE[t.subType ?? (t.type === "nhap" ? "ncc" : "thi_cong")]}</span></div> },
    { key: "date", header: "Ngày", sortValue: (t) => t.date, cell: (t) => <span className="whitespace-nowrap">{fmtDate(t.date)}</span> },
    { key: "m", header: "Vật tư", sortValue: (t) => mat(t.materialId)?.name, cell: (t) => <div><div className="font-medium">{mat(t.materialId)?.name}</div><div className="text-[11px] text-slate-400">{db.projects.find((p) => p.id === t.projectId)?.shortName}</div></div> },
    { key: "qty", header: "Số lượng", align: "right", sortValue: (t) => t.qty, cell: (t) => <span className={t.type === "nhap" ? "text-info-fg" : "text-warning-fg"}>{t.type === "nhap" ? "+" : "−"}{fmtNumber(t.qty)} {mat(t.materialId)?.unit}</span> },
    { key: "doc", header: "Đối chiếu chứng từ", align: "right", cell: (t) => { const d = t.docQty ?? t.qty; const diff = t.qty - d; return diff === 0 ? <span className="text-xs text-success-fg">Khớp</span> : <span className="text-xs text-rose-600">CT {fmtNumber(d)} · lệch {fmtNumber(diff)}</span>; } },
    { key: "cf", header: "Xác nhận", cell: (t) => t.confirmed === false ? (can("stock.move") ? <Button size="xs" variant="soft" onClick={(e) => { e.stopPropagation(); run(saveRow, "stockTransactions", { ...t, confirmed: true }); toast.success(`Đã xác nhận ${t.code} – cập nhật ${t.type === "nhap" ? "tăng" : "giảm"} tồn kho`); }}><CheckCircle2 /> Xác nhận</Button> : <Badge tone="warning">Chờ xác nhận</Badge>) : <Badge tone="success">Đã xác nhận</Badge> },
    { key: "val", header: "Giá trị", align: "right", sortValue: valueOf, cell: (t) => fmtMoneyShort(valueOf(t)) },
    { key: "ref", header: "Đối tượng / chứng từ", cell: (t) => <div className="max-w-xs text-xs text-slate-600">{t.type === "nhap" ? db.suppliers.find((s) => s.id === t.supplierId)?.name ?? "Điều chuyển nội bộ" : db.constructionPlans.find((x) => x.id === t.taskId)?.name ?? "—"}{t.requestId && <> · <Link className="text-primary hover:underline" to={`/materials/requests/${t.requestId}`}>{db.materialRequests.find((r) => r.id === t.requestId)?.code}</Link></>}</div> },
    { key: "by", header: "Người lập", cell: (t) => <span className="whitespace-nowrap text-xs">{db.users.find((u) => u.id === t.byId)?.name}</span> },
  ];
  return (
    <div>
      <PageHeader title={fixedType === "nhap" ? "Quản lý nhập kho vật tư" : fixedType === "xuat" ? "Quản lý xuất kho vật tư" : "Nhập – xuất kho vật tư"} description={fixedType === "nhap" ? "Phiếu nhập từ nhà cung cấp, điều chuyển từ kho khác hoặc vật tư hoàn trả từ công trường; đối chiếu số lượng thực nhận và xác nhận để cập nhật tồn kho." : fixedType === "xuat" ? "Phiếu xuất thi công cho công trình, điều chuyển kho khác hoặc trả lại nhà cung cấp; xác nhận số lượng thực xuất để giảm tồn kho." : "Sổ theo dõi phiếu nhập, xuất tại các kho công trường."}
        actions={<>
          <Button variant="outline" onClick={() => exportCsv("Nhap-xuat-kho", ["Số phiếu", "Loại", "Ngày", "Kho", "Vật tư", "Số lượng", "ĐVT", "Giá trị"], rows.map((t) => [t.code, t.type === "nhap" ? "Nhập" : "Xuất", t.date, db.projects.find((p) => p.id === t.projectId)?.shortName, mat(t.materialId)?.name, t.qty, mat(t.materialId)?.unit, Math.round(valueOf(t))]))}><Download /> Xuất Excel</Button>
          {can("stock.move") && <>{fixedType !== "nhap" && <Button variant={fixedType ? "default" : "outline"} onClick={() => setMove("xuat")}><ArrowUpFromLine /> Lập phiếu xuất</Button>}{fixedType !== "xuat" && <Button onClick={() => setMove("nhap")}><ArrowDownToLine /> Lập phiếu nhập</Button>}</>}
        </>}
      />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Số phiếu" value={rows.length} tone="navy" />
        {fixedType ? <>
          <KpiCard label={fixedType === "nhap" ? "Giá trị nhập kho" : "Giá trị xuất kho"} value={fmtMoneyShort(fixedType === "nhap" ? inV : outV)} tone="info" />
          <KpiCard label="Phiếu chờ xác nhận" value={rows.filter((t) => t.confirmed === false).length} tone="warning" />
          <KpiCard label="Lệch số lượng so với chứng từ" value={rows.filter((t) => t.docQty !== undefined && t.docQty !== t.qty).length} unit="phiếu" tone="danger" />
        </> : <>
          <KpiCard label="Giá trị nhập kho" value={fmtMoneyShort(inV)} tone="info" />
          <KpiCard label="Giá trị xuất sử dụng" value={fmtMoneyShort(outV)} tone="warning" />
          <KpiCard label="Chênh lệch (tồn tăng)" value={fmtMoneyShort(inV - outV)} tone="success" />
        </>}
      </div>
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(t) => t.id} loading={loading} resetKey={projectId + type + sub} pageSize={15}
          searchText={(t) => `${t.code} ${mat(t.materialId)?.name} ${t.note}`} searchPlaceholder="Tìm số phiếu, vật tư..."
          toolbar={<>
            <FilterSelect value={projectId} onChange={setProjectId} allLabel="Tất cả kho" options={db.projects.map((p) => ({ value: p.id, label: p.shortName }))} />
            {!fixedType && <FilterSelect value={type} onChange={setType} allLabel="Nhập & xuất" options={[{ value: "nhap", label: "Nhập kho" }, { value: "xuat", label: "Xuất kho" }]} />}
            <FilterSelect value={sub} onChange={setSub} allLabel="Tất cả loại phiếu" options={(fixedType ? SUB_OPTIONS[fixedType] : [...SUB_OPTIONS.nhap, ...SUB_OPTIONS.xuat.slice(0, 1), "tra_ncc"]).map((v) => ({ value: v, label: SUBTYPE[v] }))} />
          </>}
        />
      </Card>
      {move && <StockMoveDialog open onOpenChange={(o) => !o && setMove(null)} type={move} projectId={projectId || undefined} />}
    </div>
  );
}
