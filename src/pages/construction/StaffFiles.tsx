import { FileUploader, SingleFileSlot } from "@/components/common/Attachments";
import type { SiteStaff } from "@/types";

/** Các ô tải hồ sơ nhân sự: CCCD 2 mặt, chứng chỉ, thẻ ATLĐ, giấy khám sức khỏe */
export function StaffFiles({ row, patch }: { row: SiteStaff; patch: (p: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3 rounded-lg border bg-slate-50/60 p-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <SingleFileSlot label="CCCD mặt trước" value={row.idFront} onChange={(v) => patch({ idFront: v })} accept="image/*" />
        <SingleFileSlot label="CCCD mặt sau" value={row.idBack} onChange={(v) => patch({ idBack: v })} accept="image/*" />
        <SingleFileSlot label="Thẻ an toàn lao động" value={row.safetyCardFile} onChange={(v) => patch({ safetyCardFile: v, safetyCard: !!v })} />
        <SingleFileSlot label="Giấy khám sức khỏe" value={row.healthFile} onChange={(v) => patch({ healthFile: v })} />
      </div>
      <div>
        <div className="mb-1.5 text-[12.5px] font-medium text-slate-700">Chứng chỉ / bằng cấp</div>
        <FileUploader value={row.certFiles ?? []} onChange={(v) => patch({ certFiles: v })} hint="Ảnh hoặc PDF, nhiều file" />
      </div>
    </div>
  );
}
