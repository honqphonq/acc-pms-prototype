import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, Download } from "lucide-react";
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

export default function TransactionsPage() {
  const { db } = useDb();
  const { can } = useAuth();
  const loading = useSimulatedLoading();
  const [projectId, setProjectId] = useQueryParam("project");
  const [type, setType] = useState("");
  const [move, setMove] = useState<"nhap" | "xuat" | null>(null);
  const mat = (id: string) => db.materials.find((m) => m.id === id);
  const rows = db.stockTransactions.filter((t) => (!projectId || t.projectId === projectId) && (!type || t.type === type)).sort((a, b) => b.date.localeCompare(a.date) || b.code.localeCompare(a.code));
  const valueOf = (t: StockTransaction) => t.qty * (mat(t.materialId)?.unitPrice ?? 0);
  const inV = rows.filter((t) => t.type === "nhap").reduce((s, t) => s + valueOf(t), 0);
  const outV = rows.filter((t) => t.type === "xuat").reduce((s, t) => s + valueOf(t), 0);

  const cols: Column<StockTransaction>[] = [
    { key: "code", header: "Số phiếu", sortValue: (t) => t.code, cell: (t) => <span className="font-medium">{t.code}</span> },
    { key: "type", header: "Loại", sortValue: (t) => t.type, cell: (t) => t.type === "nhap" ? <Badge tone="info"><ArrowDownToLine className="h-3 w-3" /> Nhập kho</Badge> : <Badge tone="warning"><ArrowUpFromLine className="h-3 w-3" /> Xuất sử dụng</Badge> },
    { key: "date", header: "Ngày", sortValue: (t) => t.date, cell: (t) => <span className="whitespace-nowrap">{fmtDate(t.date)}</span> },
    { key: "m", header: "Vật tư", sortValue: (t) => mat(t.materialId)?.name, cell: (t) => <div><div className="font-medium">{mat(t.materialId)?.name}</div><div className="text-[11px] text-slate-400">{db.projects.find((p) => p.id === t.projectId)?.shortName}</div></div> },
    { key: "qty", header: "Số lượng", align: "right", sortValue: (t) => t.qty, cell: (t) => <span className={t.type === "nhap" ? "text-info-fg" : "text-warning-fg"}>{t.type === "nhap" ? "+" : "−"}{fmtNumber(t.qty)} {mat(t.materialId)?.unit}</span> },
    { key: "val", header: "Giá trị", align: "right", sortValue: valueOf, cell: (t) => fmtMoneyShort(valueOf(t)) },
    { key: "ref", header: "Đối tượng / chứng từ", cell: (t) => <div className="max-w-xs text-xs text-slate-600">{t.type === "nhap" ? db.suppliers.find((s) => s.id === t.supplierId)?.name ?? "Điều chuyển nội bộ" : db.constructionPlans.find((x) => x.id === t.taskId)?.name ?? "—"}{t.requestId && <> · <Link className="text-primary hover:underline" to={`/materials/requests/${t.requestId}`}>{db.materialRequests.find((r) => r.id === t.requestId)?.code}</Link></>}</div> },
    { key: "by", header: "Người lập", cell: (t) => <span className="whitespace-nowrap text-xs">{db.users.find((u) => u.id === t.byId)?.name}</span> },
  ];
  return (
    <div>
      <PageHeader title="Nhập – xuất kho vật tư" description="Sổ theo dõi phiếu nhập kho, phiếu xuất sử dụng tại các kho công trường – căn cứ kiểm soát tồn kho và tiêu hao thực tế."
        actions={<>
          <Button variant="outline" onClick={() => exportCsv("Nhap-xuat-kho", ["Số phiếu", "Loại", "Ngày", "Kho", "Vật tư", "Số lượng", "ĐVT", "Giá trị"], rows.map((t) => [t.code, t.type === "nhap" ? "Nhập" : "Xuất", t.date, db.projects.find((p) => p.id === t.projectId)?.shortName, mat(t.materialId)?.name, t.qty, mat(t.materialId)?.unit, Math.round(valueOf(t))]))}><Download /> Xuất Excel</Button>
          {can("stock.move") && <><Button variant="outline" onClick={() => setMove("xuat")}><ArrowUpFromLine /> Phiếu xuất</Button><Button onClick={() => setMove("nhap")}><ArrowDownToLine /> Phiếu nhập</Button></>}
        </>}
      />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Số phiếu" value={rows.length} tone="navy" />
        <KpiCard label="Giá trị nhập kho" value={fmtMoneyShort(inV)} tone="info" />
        <KpiCard label="Giá trị xuất sử dụng" value={fmtMoneyShort(outV)} tone="warning" />
        <KpiCard label="Chênh lệch (tồn tăng)" value={fmtMoneyShort(inV - outV)} tone="success" />
      </div>
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(t) => t.id} loading={loading} resetKey={projectId + type} pageSize={15}
          searchText={(t) => `${t.code} ${mat(t.materialId)?.name} ${t.note}`} searchPlaceholder="Tìm số phiếu, vật tư..."
          toolbar={<>
            <FilterSelect value={projectId} onChange={setProjectId} allLabel="Tất cả kho" options={db.projects.map((p) => ({ value: p.id, label: p.shortName }))} />
            <FilterSelect value={type} onChange={setType} allLabel="Nhập & xuất" options={[{ value: "nhap", label: "Nhập kho" }, { value: "xuat", label: "Xuất sử dụng" }]} />
          </>}
        />
      </Card>
      {move && <StockMoveDialog open onOpenChange={(o) => !o && setMove(null)} type={move} projectId={projectId || undefined} />}
    </div>
  );
}
