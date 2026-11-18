import { useState } from "react";
import { KeyRound, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { FormField } from "@/components/common/FormField";
import { Avatar } from "@/components/common/UserAvatar";
import { saveRow } from "@/services/actions";
import { ROLE_LABELS } from "@/utils/constants";
import { cn } from "@/utils/cn";

/** Thông tin tài khoản & đổi mật khẩu */
export default function AccountPage() {
  const { db, run } = useDb();
  const { user } = useAuth();
  const [tab, setTab] = useQueryParam("tab", "info");
  const [f, setF] = useState({ phone: user?.phone ?? "", email: user?.email ?? "" });
  const [pw, setPw] = useState({ old: "", n1: "", n2: "" });
  if (!user) return null;
  const changePw = () => {
    if (!pw.old) return toast.error("Nhập mật khẩu hiện tại");
    if (pw.n1.length < 8) return toast.error("Mật khẩu mới tối thiểu 8 ký tự");
    if (pw.n1 !== pw.n2) return toast.error("Xác nhận mật khẩu không khớp");
    setPw({ old: "", n1: "", n2: "" });
    toast.success("Đã đổi mật khẩu (mô phỏng)");
  };
  return (
    <div>
      <PageHeader title="Tài khoản của tôi" />
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit p-2">
          {[["info", "Thông tin tài khoản", UserRound], ["password", "Đổi mật khẩu", KeyRound]].map(([k, l, I]) => { const Icon = I as typeof UserRound; return <button key={k as string} onClick={() => setTab(k as string)} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13.5px]", tab === k ? "bg-primary-soft font-semibold text-primary" : "hover:bg-slate-50")}><Icon className="h-4 w-4" />{l as string}</button>; })}
        </Card>
        {tab === "password" ? (
          <Card className="max-w-xl p-5">
            <h3 className="mb-4 font-semibold">Đổi mật khẩu</h3>
            <div className="space-y-3">
              <FormField label="Mật khẩu hiện tại" required><Input type="password" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} /></FormField>
              <FormField label="Mật khẩu mới" required hint="Tối thiểu 8 ký tự, gồm chữ và số"><Input type="password" value={pw.n1} onChange={(e) => setPw({ ...pw, n1: e.target.value })} /></FormField>
              <FormField label="Nhập lại mật khẩu mới" required><Input type="password" value={pw.n2} onChange={(e) => setPw({ ...pw, n2: e.target.value })} /></FormField>
              <Button onClick={changePw}>Cập nhật mật khẩu</Button>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="mb-5 flex items-center gap-4"><Avatar name={user.name} size="lg" /><div><div className="text-lg font-semibold">{user.name}</div><div className="text-sm text-slate-500">{user.title} · {ROLE_LABELS[user.role]}</div></div></div>
            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              <FormField label="Mã nhân viên"><Input value={user.code} readOnly /></FormField>
              <FormField label="Đơn vị"><Input value={db.departments.find((d) => d.id === user.departmentId)?.name ?? ""} readOnly /></FormField>
              <FormField label="Số điện thoại" hint="Dùng để đăng nhập"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></FormField>
              <FormField label="Email" hint="Dùng để đăng nhập, nhận thông báo"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></FormField>
            </div>
            <Button className="mt-4" onClick={() => { run(saveRow, "users", { ...user, ...f }); toast.success("Đã cập nhật thông tin tài khoản"); }}>Lưu thông tin</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
