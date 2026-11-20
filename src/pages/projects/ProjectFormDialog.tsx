import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { PROVINCES, provinceOf } from "@/utils/provinces";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/FormField";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { createProject, updateProject } from "@/services/actions";
import { CATEGORY_LABELS, PROJECT_STATUS } from "@/utils/constants";
import type { Project } from "@/types";

type Form = Omit<Project, "id" | "approvalStatus" | "settlementStatus">;
const empty: Form = {
  code: "", name: "", shortName: "", category: "dan_dung", location: "", investor: "", contractor: "Tổng công ty ACC", unitId: "d-acc244", commanderId: "u04",
  packageName: "", contractNo: "", contractDate: "2026-11-14", startDate: "2027-01-04", endDate: "2028-06-30", contractValue: 0, budget: 0, costRatio: 0.9,
  status: "chuan_bi", memberIds: [], description: "",
};

export function ProjectFormDialog({ open, onOpenChange, project, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; project?: Project; onSaved?: (id?: string) => void }) {
  const { db, run } = useDb();
  const { user } = useAuth();
  const [f, setF] = useState<Form>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open) {
      setF(project ? { ...project } : empty);
      setErrors({});
    }
  }, [open, project]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const commanders = db.users.filter((u) => u.role === "chi_huy_truong");

  const save = () => {
    const e: Record<string, string> = {};
    if (!f.code.trim()) e.code = "Nhập mã dự án";
    if (!f.name.trim()) e.name = "Nhập tên dự án";
    if (!f.investor.trim()) e.investor = "Nhập chủ đầu tư";
    if (!f.location.trim()) e.location = "Nhập địa điểm";
    if (!f.province) e.province = "Chọn tỉnh, thành";
    if (f.contractValue <= 0) e.contractValue = "Giá trị hợp đồng phải > 0";
    if (f.endDate <= f.startDate) e.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
    if (db.projects.some((p) => p.code === f.code && p.id !== project?.id)) e.code = "Mã dự án đã tồn tại";
    setErrors(e);
    if (Object.keys(e).length) return;
    const pv = provinceOf(f.province);
    const moved = !project || project.province !== f.province;
    const data = { ...f, shortName: f.shortName || f.name.slice(0, 32), ...(pv && moved ? { lat: pv.lat + (Math.random() - 0.5) * 0.08, lng: pv.lng + (Math.random() - 0.5) * 0.08 } : {}) };
    if (project) {
      run(updateProject, project.id, data);
      toast.success("Đã cập nhật thông tin dự án");
      onSaved?.(project.id);
    } else {
      const next = run(createProject, data, user!.id);
      toast.success("Đã tạo dự án và giao nhiệm vụ cho đơn vị thực hiện");
      onSaved?.(next.projects[0].id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{project ? "Chỉnh sửa dự án" : "Tạo mới dự án"}</DialogTitle>
          <DialogDescription>Tổng công ty nhập thông tin dự án và giao nhiệm vụ cho đơn vị thực hiện. Sau khi tạo, dự án có sẵn ở các phân hệ: hợp đồng, phương án, tiến độ, nhân sự, hồ sơ, vật tư…</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Thông tin chung</div>
            <div className="grid gap-3 md:grid-cols-3">
              <FormField label="Mã dự án" required error={errors.code}><Input value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="VD: ACC244-THX" /></FormField>
              <FormField label="Tên dự án" required error={errors.name} className="md:col-span-2"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></FormField>
              <FormField label="Tên viết tắt"><Input value={f.shortName} onChange={(e) => set("shortName", e.target.value)} /></FormField>
              <FormField label="Loại dự án"><Select value={f.category} onChange={(e) => set("category", e.target.value as Form["category"])} options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} /></FormField>
              <FormField label="Tỉnh, thành" required error={errors.province}><Select value={f.province ?? ""} placeholder="— Chọn tỉnh, thành —" onChange={(e) => set("province", e.target.value)} options={PROVINCES.map((p) => ({ value: p.name, label: p.name }))} /></FormField>
              <FormField label="Địa điểm" required error={errors.location} className="md:col-span-2"><Input value={f.location} placeholder="VD: Gia Bình, Bắc Ninh" onChange={(e) => set("location", e.target.value)} /></FormField>
              <FormField label="Chủ đầu tư" required error={errors.investor} className="md:col-span-3"><Input value={f.investor} onChange={(e) => set("investor", e.target.value)} /></FormField>
            </div>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Hợp đồng</div>
            <div className="grid gap-3 md:grid-cols-3">
              <FormField label="Số hợp đồng"><Input value={f.contractNo} onChange={(e) => set("contractNo", e.target.value)} /></FormField>
              <FormField label="Giá trị hợp đồng (VNĐ)" required error={errors.contractValue} hint={project && db.contracts.some((c) => c.projectId === project.id) ? "Cộng dồn tự động từ hợp đồng và phụ lục (Quản lý hợp đồng)" : undefined}><NumberInput value={f.contractValue} onChange={(v) => set("contractValue", v)} placeholder="VD: 241.800.000.000" disabled={!!project && db.contracts.some((c) => c.projectId === project.id)} /></FormField>
              <FormField label="Ngân sách chi phí dự kiến (VNĐ)"><NumberInput value={f.budget} onChange={(v) => set("budget", v)} /></FormField>
              <FormField label="Ngày ký hợp đồng"><Input type="date" value={f.contractDate} onChange={(e) => set("contractDate", e.target.value)} /></FormField>
              <FormField label="Ngày khởi công"><Input type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} /></FormField>
              <FormField label="Ngày hoàn thành" error={errors.endDate}><Input type="date" value={f.endDate} onChange={(e) => set("endDate", e.target.value)} /></FormField>
              <FormField label="Trạng thái"><Select value={f.status} onChange={(e) => set("status", e.target.value as Form["status"])} options={Object.entries(PROJECT_STATUS).map(([value, l]) => ({ value, label: l.label }))} /></FormField>
            </div>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Đơn vị thực hiện</div>
            <div className="grid gap-3 md:grid-cols-3">
              <FormField label="Đơn vị thành viên"><Select value={f.unitId} onChange={(e) => set("unitId", e.target.value)} options={db.departments.filter((d) => d.type === "cong_ty_con").map((d) => ({ value: d.id, label: d.name }))} /></FormField>
              <FormField label="Chỉ huy trưởng công trường"><Select value={f.commanderId} onChange={(e) => set("commanderId", e.target.value)} options={commanders.map((u) => ({ value: u.id, label: u.name }))} /></FormField>
              <FormField label="Nhà thầu thi công"><Input value={f.contractor} onChange={(e) => set("contractor", e.target.value)} /></FormField>
              <FormField label="Mô tả" className="md:col-span-3"><Textarea value={f.description} onChange={(e) => set("description", e.target.value)} /></FormField>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={save}>{project ? "Lưu thay đổi" : "Tạo dự án"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
