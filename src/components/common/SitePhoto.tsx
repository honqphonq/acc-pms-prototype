import { Camera, Construction, Drill, Factory, HardHat, Lightbulb, Paintbrush, Shovel, Truck, Wrench, Layers } from "lucide-react";
import { PHOTO_LABELS } from "@/utils/constants";
import { cn } from "@/utils/cn";

const STYLE: Record<string, { from: string; to: string; Icon: typeof Camera }> = {
  concrete: { from: "#94a3b8", to: "#475569", Icon: Factory },
  excavation: { from: "#d6a86b", to: "#8a5a2b", Icon: Shovel },
  formwork: { from: "#c9a26b", to: "#6b4e2e", Icon: Layers },
  finishing: { from: "#cbd5e1", to: "#64748b", Icon: Paintbrush },
  site: { from: "#7dd3fc", to: "#0369a1", Icon: Construction },
  paving: { from: "#a8a29e", to: "#44403c", Icon: Truck },
  piling: { from: "#a3a3a3", to: "#404040", Icon: Drill },
  pipe: { from: "#93c5fd", to: "#1e40af", Icon: Wrench },
  rebar: { from: "#fca5a5", to: "#7f1d1d", Icon: Wrench },
  lighting: { from: "#fde68a", to: "#b45309", Icon: Lightbulb },
  team: { from: "#fdba74", to: "#c2410c", Icon: HardHat },
};

/** Ảnh hiện trường giả lập (minh họa) – prototype không lưu ảnh thật */
export function SitePhoto({ kind, className, caption = true, date }: { kind: string; className?: string; caption?: boolean; date?: string }) {
  const s = STYLE[kind] ?? STYLE.site;
  const Icon = s.Icon;
  return (
    <div className={cn("group relative aspect-[4/3] overflow-hidden rounded-lg", className)} style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}>
      <svg className="absolute inset-0 h-full w-full opacity-25" viewBox="0 0 100 75" preserveAspectRatio="none">
        <path d="M0 60 L20 45 L35 52 L55 35 L75 48 L100 30 L100 75 L0 75 Z" fill="white" />
        <path d="M60 10 L60 40 M55 12 L85 12 M80 12 L80 22" stroke="white" strokeWidth="1.2" fill="none" />
      </svg>
      <Icon className="absolute left-1/2 top-[42%] h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white/85" />
      {caption && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 text-[10.5px] font-medium text-white">
          {PHOTO_LABELS[kind] ?? "Hình ảnh hiện trường"}
          {date && <span className="ml-1 opacity-75">· {date}</span>}
        </div>
      )}
    </div>
  );
}
