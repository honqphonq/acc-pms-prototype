import { Badge } from "@/components/ui/badge";
import type { LabelTone } from "@/utils/constants";

export function StatusBadge<K extends string>({ map, value, dot = true, className }: { map: Record<K, LabelTone>; value: K; dot?: boolean; className?: string }) {
  const s = map[value];
  if (!s) return null;
  return (
    <Badge tone={s.tone} dot={dot} className={className}>
      {s.label}
    </Badge>
  );
}
