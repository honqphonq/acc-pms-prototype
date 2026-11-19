import { useDb } from "@/hooks/useDb";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { projectOptions } from "@/utils/labels";
import type { TransportRoute } from "@/types";

/** Sơ đồ tuyến (mô phỏng bản đồ bằng SVG từ tọa độ) */
function RouteMap({ r }: { r: TransportRoute }) {
  const pts = r.points;
  if (pts.length < 2) return null;
  const lats = pts.map((p) => p[0]); const lngs = pts.map((p) => p[1]);
  const [a, b, c, d] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const W = 560, H = 260, pad = 30;
  const x = (lng: number) => pad + ((lng - c) / (d - c || 1)) * (W - 2 * pad);
  const y = (lat: number) => H - pad - ((lat - a) / (b - a || 1)) * (H - 2 * pad);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p[1]).toFixed(1)},${y(p[0]).toFixed(1)}`).join(" ");
  return (
    <section>
      <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Định vị tuyến đường</h4>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border bg-[#EEF4EA]">
        {Array.from({ length: 8 }, (_, i) => <line key={i} x1={(W / 8) * i} x2={(W / 8) * i} y1={0} y2={H} stroke="#dfe8d8" />)}
        {Array.from({ length: 5 }, (_, i) => <line key={i} y1={(H / 5) * i} y2={(H / 5) * i} x1={0} x2={W} stroke="#dfe8d8" />)}
        <path d={path} fill="none" stroke="#2563EB" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={x(p[1])} cy={y(p[0])} r={i === 0 || i === pts.length - 1 ? 7 : 4} fill={i === 0 ? "#16A34A" : i === pts.length - 1 ? "#DC2626" : "#fff"} stroke="#2563EB" strokeWidth={2} />)}
        <text x={x(pts[0][1]) + 10} y={y(pts[0][0]) + 4} fontSize={12} fill="#14532d">{r.from}</text>
        <text x={x(pts[pts.length - 1][1]) - 10} y={y(pts[pts.length - 1][0]) - 10} fontSize={12} fill="#7f1d1d" textAnchor="end">{r.to}</text>
      </svg>
      <p className="mt-1 text-[11px] text-slate-400">Tọa độ: {pts.map((p) => `${p[0]}, ${p[1]}`).join(" → ")}</p>
    </section>
  );
}

export default function RoutesPage() {
  const { db } = useDb();
  return (
    <RegistryPage<TransportRoute>
      title="Quản lý tuyến đường" entityLabel="tuyến đường" addLabel="Thêm tuyến đường" codePrefix="TD-" collection="routes"
      description="Thông tin tuyến vận chuyển: tọa độ, bản đồ, độ dài, thời gian đi lại, điểm dừng nghỉ và điều kiện giao thông."
      searchText={(r) => `${r.code} ${r.name} ${r.from} ${r.to}`}
      filters={[{ label: "Tất cả dự án", options: projectOptions, test: (r, v) => r.projectId === v }]}
      kpis={(rows) => [
        { label: "Tuyến đường", value: rows.length, tone: "navy" },
        { label: "Tổng chiều dài", value: `${rows.reduce((s, r) => s + r.lengthKm, 0).toLocaleString("vi-VN")} km`, tone: "info" },
        { label: "Phục vụ SB Gia Bình", value: rows.filter((r) => r.projectId === "p01").length, tone: "success" },
      ]}
      newRecord={() => ({ points: [], projectId: "p01", lengthKm: 0, avgMinutes: 0, stops: "", conditions: "" })}
      columns={[
        { key: "n", header: "Tuyến đường", sortValue: (r) => r.name, cell: (r) => <div><div className="font-medium text-slate-800">{r.name}</div><div className="text-[11px] text-slate-400">{r.code} · {db.projects.find((p) => p.id === r.projectId)?.shortName ?? "Dùng chung"}</div></div> },
        { key: "f", header: "Điểm đi → điểm đến", cell: (r) => <span className="text-xs">{r.from} → {r.to}</span> },
        { key: "l", header: "Độ dài", align: "right", sortValue: (r) => r.lengthKm, cell: (r) => `${r.lengthKm.toLocaleString("vi-VN")} km` },
        { key: "t", header: "Thời gian", align: "right", sortValue: (r) => r.avgMinutes, cell: (r) => `${r.avgMinutes} phút` },
        { key: "c", header: "Điều kiện giao thông", cell: (r) => <span className="text-xs text-slate-600">{r.conditions}</span> },
      ]}
      fields={[
        { key: "name", label: "Tên tuyến", required: true, wide: true },
        { key: "from", label: "Điểm đi" },
        { key: "to", label: "Điểm đến" },
        { key: "projectId", label: "Dự án", type: "select", options: projectOptions },
        { key: "lengthKm", label: "Độ dài (km)", type: "number" },
        { key: "avgMinutes", label: "Thời gian đi lại (phút)", type: "number" },
        { key: "stops", label: "Điểm dừng nghỉ" },
        { key: "conditions", label: "Điều kiện giao thông / lưu ý cho lái xe", type: "textarea" },
      ]}
      detail={(r) => <RouteMap r={r} />}
    />
  );
}
