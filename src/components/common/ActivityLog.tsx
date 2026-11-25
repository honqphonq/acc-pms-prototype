import type { ReactNode } from "react";
import { useDb } from "@/hooks/useDb";
import { Avatar } from "./UserAvatar";
import { cn } from "@/utils/cn";

export interface ActivityItem {
  id: string;
  /** "YYYY-MM-DD" hoặc "YYYY-MM-DDTHH:mm[:ss]" */
  at: string;
  userId?: string | null;
  /** Tên hiển thị khi không có userId (vd. hệ thống) */
  who?: string;
  /** Phần mô tả sau tên người, vd: <>giao công việc <b>X</b> cho <b>Y</b></> */
  text: ReactNode;
  /** Nội dung phụ (trích dẫn, file, ảnh…) */
  extra?: ReactNode;
  /** Nút thao tác nhỏ bên phải (sửa / xóa / xác nhận) */
  actions?: ReactNode;
}

const WD = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const dayLabel = (d: string) => `${WD[new Date(d + "T00:00:00Z").getUTCDay()]}, ${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/** Lịch sử hoạt động kiểu Base Wework: nhóm theo ngày, mỗi dòng "Người A làm gì · giờ" – dùng chung cho mọi phân hệ */
export function ActivityLog({ items, empty = "Chưa có hoạt động", className }: { items: ActivityItem[]; empty?: string; className?: string }) {
  const { db } = useDb();
  const sorted = [...items].sort((a, b) => b.at.localeCompare(a.at));
  if (!sorted.length) return <p className={cn("py-4 text-center text-[12.5px] text-slate-400", className)}>{empty}</p>;
  const groups: { day: string; list: ActivityItem[] }[] = [];
  sorted.forEach((it) => {
    const d = it.at.slice(0, 10);
    const g = groups[groups.length - 1];
    if (g && g.day === d) g.list.push(it);
    else groups.push({ day: d, list: [it] });
  });
  return (
    <div className={cn("space-y-4", className)}>
      {groups.map((g) => (
        <div key={g.day}>
          <div className="mb-2 border-b pb-1 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">{dayLabel(g.day)}</div>
          <div className="space-y-3">
            {g.list.map((it) => {
              const u = it.userId ? db.users.find((x) => x.id === it.userId) : null;
              const name = u?.name ?? it.who ?? "Hệ thống";
              const time = it.at.length > 10 ? it.at.slice(11, 16) : "";
              return (
                <div key={it.id} className="group flex gap-2.5">
                  <Avatar name={name} size="sm" />
                  <div className="min-w-0 flex-1 text-[13px] leading-snug text-slate-600">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1"><b className="font-semibold text-slate-800">{name}</b> {it.text}{time && <span className="text-slate-400"> · {time}</span>}</div>
                      {it.actions && <div className="flex shrink-0 items-center gap-0.5">{it.actions}</div>}
                    </div>
                    {it.extra && <div className="mt-1">{it.extra}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Hiển thị chuỗi có đánh dấu **in đậm** */
export function rich(s: string): ReactNode {
  return s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={i} className="font-semibold text-slate-800">{p.slice(2, -2)}</b> : p));
}
