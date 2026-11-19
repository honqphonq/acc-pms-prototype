import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, CalendarRange, ClipboardCheck, Package, ShieldCheck, Truck } from "lucide-react";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/common/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/utils/constants";
import { cn } from "@/utils/cn";
import type { RoleKey } from "@/types";

const LANDING: Partial<Record<RoleKey, string>> = {
  lanh_dao: "/",
  phong_ktkt: "/construction/plan/p01",
  chi_huy_truong: "/projects/p01",
  to_truong: "/construction/plan/p01",
  bp_vat_tu: "/materials/stock/p01",
  phong_thiet_bi: "/equipment/list",
  ke_toan: "/materials/stock",
  admin: "/admin/users",
};

export default function LoginPage() {
  const { db } = useDb();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const demo = db.users.filter((u) => u.isDemoAccount);
  const [selected, setSelected] = useState(demo[0]?.id);
  const sel = db.users.find((u) => u.id === selected);
  const [forgot, setForgot] = useState(false);
  const [acc, setAcc] = useState("");

  const enter = () => {
    if (!sel) return;
    login(sel.id);
    navigate(location.state?.from && location.state.from !== "/login" ? location.state.from : LANDING[sel.role] ?? "/", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-sidebar p-10 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5"><img src={`${import.meta.env.BASE_URL}assets/acc-logo.webp`} className="h-full w-full object-contain" alt="ACC" /></span>
          <div>
            <div className="text-lg font-bold">Tổng công ty ACC</div>
            <div className="text-xs text-sidebar-muted">Xây dựng Công trình Hàng không</div>
          </div>
        </div>
        <div className="relative">
          <h1 className="text-3xl font-bold leading-tight">Hệ thống quản lý<br />dự án thi công</h1>
          <p className="mt-3 max-w-md text-sm text-slate-300">Số hóa, liên thông và tập trung dữ liệu tiến độ thi công, vật tư vật liệu, máy móc thiết bị và thanh quyết toán công trình.</p>
          <div className="mt-8 grid max-w-md grid-cols-2 gap-3 text-[13px]">
            {[
              [Building2, "Quản lý công trình"],
              [CalendarRange, "Kế hoạch & tiến độ"],
              [Package, "Vật tư vật liệu"],
              [Truck, "Xe máy thiết bị"],
              [ClipboardCheck, "Tài chính kế toán"],
              [ShieldCheck, "Cảnh báo sớm"],
            ].map(([I, l]) => {
              const Icon = I as typeof Building2;
              return (
                <div key={l as string} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5">
                  <Icon className="h-4 w-4 text-rose-300" /> {l as string}
                </div>
              );
            })}
          </div>
        </div>
        <div className="relative text-[11px] text-slate-400">Prototype trình diễn giải pháp · Viettel Solutions · 11/2026</div>
      </div>

      <div className="flex flex-1 items-center justify-center p-4 md:p-10">
        <div className="w-full max-w-xl">
          <div className="mb-6 lg:hidden">
            <img src={`${import.meta.env.BASE_URL}assets/acc-logo.webp`} className="mb-3 h-10 w-14 object-contain" alt="ACC" />
            <div className="text-xl font-bold">ACC – Quản lý dự án thi công</div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Đăng nhập demo</h2>
          <p className="mt-1 text-sm text-slate-500">Chọn một vai trò để trải nghiệm hệ thống. Không cần mật khẩu – dữ liệu là giả lập.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {demo.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelected(u.id)}
                onDoubleClick={enter}
                className={cn("flex items-start gap-3 rounded-xl border bg-white p-3 text-left transition", selected === u.id ? "border-primary ring-2 ring-primary/15" : "border-slate-200 hover:border-slate-300")}
              >
                <Avatar name={u.name} size="md" />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-slate-800">{ROLE_LABELS[u.role]}</div>
                  <div className="truncate text-xs text-slate-500">{u.name} · {u.title}</div>
                </div>
              </button>
            ))}
          </div>
          {sel && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-600">SĐT / email / mã nhân viên</label>
                  <Input className="mt-1.5" value={sel.email} readOnly />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Mật khẩu</label>
                  <Input className="mt-1.5" type="password" value="demo-acc" readOnly />
                </div>
              </div>
              <div className="mt-2 text-right"><button className="text-xs font-medium text-primary hover:underline" onClick={() => setForgot(true)}>Quên mật khẩu?</button></div>
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-medium text-slate-700">Quyền chính:</span> {ROLE_DESCRIPTIONS[sel.role]}
              </p>
              <Button className="mt-4 w-full" size="lg" onClick={enter}>
                Đăng nhập với vai trò {ROLE_LABELS[sel.role]} <ArrowRight />
              </Button>
            </div>
          )}
        </div>
      </div>
      <Dialog open={forgot} onOpenChange={setForgot}>
        <DialogContent>
          <DialogHeader><DialogTitle>Quên mật khẩu</DialogTitle></DialogHeader>
          <DialogBody className="space-y-2">
            <p className="text-sm text-slate-500">Nhập số điện thoại, email hoặc mã nhân viên. Hệ thống gửi mã xác thực (OTP) để đặt lại mật khẩu.</p>
            <Input value={acc} onChange={(e) => setAcc(e.target.value)} placeholder="VD: 0912345678 hoặc NV010" />
          </DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setForgot(false)}>Hủy</Button><Button onClick={() => { if (!acc.trim()) return toast.error("Nhập tài khoản"); setForgot(false); toast.success("Đã gửi mã OTP đặt lại mật khẩu (mô phỏng)"); }}>Gửi mã xác thực</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
