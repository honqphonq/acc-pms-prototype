import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowRight, LocateFixed, MapPin } from "lucide-react";
import { useDb } from "@/hooks/useDb";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/common/StatusBadge";
import { HEALTH } from "@/utils/constants";
import { fmtDate, fmtNumber, fmtPct } from "@/utils/format";
import { REGION_LABEL, provinceOf } from "@/utils/provinces";
import { cn } from "@/utils/cn";
import type { ProjectStats } from "@/services/selectors";

const COLOR: Record<string, string> = { cham_tien_do: "#DC2626", nguy_co_cham: "#F59E0B", dung_tien_do: "#16A34A", hoan_thanh: "#2563EB", chua_bat_dau: "#64748B" };
const RANK: Record<string, number> = { cham_tien_do: 0, nguy_co_cham: 1, dung_tien_do: 2, chua_bat_dau: 3, hoan_thanh: 4 };
const VN_CENTER: L.LatLngExpression = [16.2, 106.3];
const GROUP_ZOOM = 8; // dưới mức zoom này gộp dự án theo tỉnh

/** Bản đồ vị trí dự án theo tỉnh (34 tỉnh, thành) – bấm để xem chi tiết bên phải */
export function ProjectMap({ stats }: { stats: ProjectStats[] }) {
  const { db } = useDb();
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [zoom, setZoom] = useState(5);
  const [sel, setSel] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const items = useMemo(() => stats.filter((s) => s.project.lat && s.project.lng), [stats]);

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return;
    const map = L.map(boxRef.current, { center: VN_CENTER, zoom: 5, minZoom: 4, maxZoom: 13, zoomControl: true, attributionControl: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on("zoomend", () => setZoom(map.getZoom()));
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // vẽ lại điểm khi đổi dữ liệu / mức zoom / lựa chọn
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const byProv = new Map<string, ProjectStats[]>();
    items.forEach((s) => { const k = s.project.province ?? "?"; byProv.set(k, [...(byProv.get(k) ?? []), s]); });
    byProv.forEach((list, prov) => {
      const worst = list.slice().sort((a, b) => (RANK[a.health] ?? 9) - (RANK[b.health] ?? 9))[0].health;
      if (zoom < GROUP_ZOOM && list.length > 1) {
        const p = provinceOf(prov);
        const lat = p?.lat ?? list[0].project.lat!;
        const lng = p?.lng ?? list[0].project.lng!;
        const icon = L.divIcon({ className: "", iconSize: [34, 34], iconAnchor: [17, 17], html: `<div style="width:34px;height:34px;border-radius:50%;background:${COLOR[worst]};color:#fff;font:700 13px Inter,sans-serif;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)">${list.length}</div>` });
        L.marker([lat, lng], { icon, title: `${prov}: ${list.length} dự án` }).addTo(layer).on("click", () => { setProvince(prov); setSel(null); mapRef.current?.flyTo([lat, lng], GROUP_ZOOM + 1, { duration: 0.6 }); });
      } else {
        list.forEach((s) => {
          const active = s.project.id === sel;
          const size = active ? 22 : 16;
          const icon = L.divIcon({ className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2], html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${COLOR[s.health] ?? "#64748B"};border:3px solid #fff;box-shadow:0 0 0 ${active ? 3 : 1}px ${active ? "#1572D3" : "rgba(0,0,0,.25)"},0 2px 5px rgba(0,0,0,.3)"></div>` });
          L.marker([s.project.lat!, s.project.lng!], { icon, title: s.project.shortName, zIndexOffset: active ? 1000 : 0 })
            .bindTooltip(s.project.shortName, { direction: "top", offset: [0, -8] })
            .addTo(layer).on("click", () => { setSel(s.project.id); setProvince(s.project.province ?? null); });
        });
      }
    });
  }, [items, zoom, sel]);

  const cur = items.find((s) => s.project.id === sel);
  const inProv = province ? items.filter((s) => s.project.province === province) : [];
  const regions = (["bac", "trung", "nam"] as const).map((r) => {
    const list = items.filter((s) => provinceOf(s.project.province)?.region === r);
    return { r, n: list.length, value: list.reduce((x, s) => x + s.project.contractValue, 0), late: list.filter((s) => s.health === "cham_tien_do" || s.health === "nguy_co_cham").length, provinces: new Set(list.map((s) => s.project.province)).size };
  });
  const reset = () => { setSel(null); setProvince(null); mapRef.current?.flyTo(VN_CENTER, 5, { duration: 0.6 }); };
  const focus = (s: ProjectStats) => { setSel(s.project.id); setProvince(s.project.province ?? null); mapRef.current?.flyTo([s.project.lat!, s.project.lng!], Math.max(zoom, 10), { duration: 0.6 }); };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Bản đồ dự án</CardTitle>
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-600">
          {(["dung_tien_do", "nguy_co_cham", "cham_tien_do"] as const).map((h) => <span key={h} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[h] }} />{HEALTH[h].label}</span>)}
          <Button size="xs" variant="outline" onClick={reset}><LocateFixed /> Toàn quốc</Button>
        </div>
      </CardHeader>
      <div className="grid lg:grid-cols-[1fr_320px]">
        <div ref={boxRef} className="h-[460px] w-full bg-slate-100" />
        <div className="max-h-[460px] overflow-y-auto border-t p-4 lg:border-l lg:border-t-0">
          {cur ? (
            <div className="space-y-3">
              <button className="text-[12px] text-primary hover:underline" onClick={() => setSel(null)}>← {province ? `Dự án tại ${province}` : "Tổng hợp"}</button>
              <div>
                <div className="text-[15px] font-bold leading-snug text-slate-900">{cur.project.name}</div>
                <div className="mt-1 flex items-center gap-2"><StatusBadge map={HEALTH} value={cur.health} /><span className="text-[12px] text-slate-500">{cur.project.location}</span></div>
              </div>
              <dl className="space-y-2 text-[13px]">
                <div><dt className="text-[11.5px] text-slate-500">Chủ đầu tư</dt><dd className="font-medium text-slate-900">{cur.project.investor}</dd></div>
                <div><dt className="text-[11.5px] text-slate-500">Đơn vị thi công</dt><dd className="font-medium text-slate-900">{db.departments.find((d) => d.id === cur.project.unitId)?.name}</dd></div>
                <div><dt className="text-[11.5px] text-slate-500">Giá trị hợp đồng</dt><dd className="text-[18px] font-bold text-primary">{fmtNumber(cur.project.contractValue / 1e9, 1)} <span className="text-[12px] font-medium text-slate-500">tỷ đồng</span></dd></div>
                <div><dt className="text-[11.5px] text-slate-500">Thời gian thực hiện</dt><dd className="font-medium text-slate-900">{fmtDate(cur.project.startDate)} – {fmtDate(cur.project.endDate)}</dd></div>
                <div><dt className="mb-1 flex justify-between text-[11.5px] text-slate-500"><span>Tiến độ thực tế / kế hoạch</span><b className="text-slate-800">{fmtPct(cur.actual)} / {fmtPct(cur.planned)}</b></dt><dd><Progress value={cur.actual} marker={cur.planned} tone={cur.health === "cham_tien_do" ? "danger" : cur.health === "nguy_co_cham" ? "warning" : "success"} className="h-2" /></dd></div>
              </dl>
              <Button className="w-full" onClick={() => navigate(`/projects/${cur.project.id}`)}>Mở dự án <ArrowRight /></Button>
            </div>
          ) : province ? (
            <div>
              <button className="mb-2 text-[12px] text-primary hover:underline" onClick={reset}>← Toàn quốc</button>
              <div className="mb-2 text-[14px] font-bold">{province} · {inProv.length} dự án</div>
              <div className="space-y-1.5">
                {inProv.map((s) => (
                  <button key={s.project.id} onClick={() => focus(s)} className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left hover:border-primary/50 hover:bg-primary-soft/40">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLOR[s.health] }} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{s.project.shortName}</span><span className="text-[11.5px] text-slate-500">{fmtNumber(s.project.contractValue / 1e9, 0)} tỷ · {fmtPct(s.actual)}</span></span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[12.5px] text-slate-500">{items.length} dự án tại {new Set(items.map((s) => s.project.province)).size}/34 tỉnh, thành. Bấm vào điểm trên bản đồ để xem chi tiết; số trong vòng tròn là số dự án của tỉnh.</p>
              {regions.map((g) => (
                <div key={g.r} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between"><span className="text-[13px] font-bold">{REGION_LABEL[g.r]}</span><span className="text-[12px] text-slate-500">{g.provinces} tỉnh, thành</span></div>
                  <div className="mt-1 flex items-baseline justify-between"><span className="text-[13px]"><b className="text-[18px]">{g.n}</b> dự án</span><span className="text-[13px] font-semibold text-primary">{fmtNumber(g.value / 1e9, 0)} tỷ</span></div>
                  {g.late > 0 && <div className="mt-0.5 text-[12px] text-rose-600">{g.late} dự án chậm / có nguy cơ chậm</div>}
                </div>
              ))}
              <div className="flex flex-wrap gap-1">
                {[...new Set(items.map((s) => s.project.province!))].sort((a, b) => (provinceOf(b)?.lat ?? 0) - (provinceOf(a)?.lat ?? 0)).map((p) => (
                  <button key={p} onClick={() => { const pv = provinceOf(p); setProvince(p); if (pv) mapRef.current?.flyTo([pv.lat, pv.lng], GROUP_ZOOM + 1, { duration: 0.6 }); }} className={cn("rounded-full border px-2 py-0.5 text-[11.5px] hover:border-primary hover:text-primary")}>{p} ({items.filter((s) => s.project.province === p).length})</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
