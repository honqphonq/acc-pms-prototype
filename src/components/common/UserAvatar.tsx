import { useDb } from "@/hooks/useDb";
import { initials } from "@/utils/format";
import { cn } from "@/utils/cn";
import { Tip } from "@/components/ui/tooltip";

const PALETTE = ["bg-emerald-100 text-emerald-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-violet-100 text-violet-700", "bg-rose-100 text-rose-700", "bg-teal-100 text-teal-700", "bg-indigo-100 text-indigo-700", "bg-orange-100 text-orange-700"];
const colorOf = (s: string) => PALETTE[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

export function Avatar({ name, size = "sm", className }: { name: string; size?: "xs" | "sm" | "md" | "lg"; className?: string }) {
  const sz = { xs: "h-6 w-6 text-[10px]", sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" }[size];
  return <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-white", sz, colorOf(name), className)}>{initials(name)}</span>;
}

export function UserCell({ userId, sub }: { userId: string | null | undefined; sub?: string }) {
  const { db } = useDb();
  const u = db.users.find((x) => x.id === userId);
  if (!u) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar name={u.name} size="xs" />
      <div className="min-w-0">
        <div className="truncate text-[13px] text-slate-700">{u.name}</div>
        {sub !== undefined && <div className="truncate text-[11px] text-slate-400">{sub || u.title}</div>}
      </div>
    </div>
  );
}

export function AvatarGroup({ userIds, max = 6 }: { userIds: string[]; max?: number }) {
  const { db } = useDb();
  const list = userIds.map((id) => db.users.find((u) => u.id === id)).filter(Boolean);
  return (
    <div className="flex -space-x-1.5">
      {list.slice(0, max).map((u) => (
        <Tip key={u!.id} content={`${u!.name} – ${u!.title}`}>
          <span><Avatar name={u!.name} size="sm" /></span>
        </Tip>
      ))}
      {list.length > max && <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sidebar text-[10px] font-semibold text-white ring-2 ring-white">+{list.length - max}</span>}
    </div>
  );
}
