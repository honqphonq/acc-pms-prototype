import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Database, Download, KeyRound, Pencil, Plus, RefreshCcw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { Avatar } from "@/components/common/UserAvatar";
import { FormField } from "@/components/common/FormField";
import { AssumptionTag } from "@/components/common/Assumption";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { deleteUser, saveUser } from "@/services/actions";
import { hasLocalChanges } from "@/services/storage";
import { PERMISSION_LABELS, ROLE_PERMISSIONS, type Permission } from "@/utils/permissions";
import { ROLE_LABELS } from "@/utils/constants";
import { genId } from "@/utils/id";
import { ROLE_DESCRIPTIONS } from "@/utils/constants";
import { fmtDateTime } from "@/utils/format";
import type { Department, LoginEntry, RoleKey, User } from "@/types";

export default function AdminPage() {
  const { db, run, resetDemo } = useDb();
  const { user, can } = useAuth();
  const confirm = useConfirm();
  const loading = useSimulatedLoading();
  const [role, setRole] = useState("");
  const [edit, setEdit] = useState<User | null>(null);
  const isAdmin = can("admin");
  const { section = "users" } = useParams();
  const navigate = useNavigate();
  const [lu, setLu] = useState("");
  const xlsx = async (name: string, data: Record<string, unknown>[]) => { const X = await import("xlsx"); const ws = X.utils.json_to_sheet(data); const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, "Data"); X.writeFile(wb, `${name}.xlsx`); toast.success(`Đã xuất ${data.length} dòng`); };
  const staff = db.users.filter((u) => !role || u.role === role);

  const cols: Column<User>[] = [
    { key: "n", header: "Người dùng", sortValue: (u) => u.name, cell: (u) => <div className="flex items-center gap-2.5"><Avatar name={u.name} /><div><div className="font-medium text-slate-800">{u.name} {u.isDemoAccount && <Badge tone="primary" className="ml-1">Tài khoản demo</Badge>}</div><div className="text-[11px] text-slate-400">{u.code} · {u.email}</div></div></div> },
    { key: "t", header: "Chức danh", sortValue: (u) => u.title, cell: (u) => <span className="text-xs">{u.title}</span> },
    { key: "r", header: "Vai trò", sortValue: (u) => u.role, cell: (u) => <Badge tone="outline">{ROLE_LABELS[u.role]}</Badge> },
    { key: "d", header: "Đơn vị", sortValue: (u) => u.departmentId, cell: (u) => <span className="text-xs">{db.departments.find((d) => d.id === u.departmentId)?.name}</span> },
    { key: "p", header: "Điện thoại", cell: (u) => <span className="text-xs">{u.phone}</span> },
    { key: "a", header: "", cell: (u) => isAdmin && <div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" aria-label="Reset mật khẩu" onClick={async () => { if (await confirm({ title: `Reset mật khẩu cho ${u.name}?`, description: "Mật khẩu tạm thời được gửi qua SĐT / email của người dùng." })) toast.success("Đã reset mật khẩu (mô phỏng)"); }}><KeyRound /></Button><Button size="icon-sm" variant="ghost" onClick={() => setEdit({ ...u })}><Pencil /></Button><Button size="icon-sm" variant="ghost" disabled={u.id === user?.id} className="text-slate-400 hover:text-rose-600" onClick={async () => { if (await confirm({ title: `Xóa người dùng ${u.name}?`, destructive: true, confirmText: "Xóa" })) { run(deleteUser, u.id); toast.success("Đã xóa người dùng"); } }}><Trash2 /></Button></div> },
  ];

  const tree = (parentId: string | null, depth = 0): JSX.Element[] =>
    db.departments.filter((d) => d.parentId === parentId).flatMap((d: Department) => [
      <div key={d.id} className="flex items-center gap-2 py-1.5" style={{ paddingLeft: depth * 24 }}>
        <span className={`h-2 w-2 rounded-full ${d.type === "ban_lanh_dao" ? "bg-primary" : d.type === "cong_ty_con" ? "bg-blue-500" : d.type === "co_quan" ? "bg-slate-700" : "bg-slate-400"}`} />
        <span className="text-[13px] font-medium text-slate-800">{d.name}</span>
        <Badge tone="neutral">{d.code}</Badge>
        {d.head && <span className="text-xs text-slate-500">· {d.head}</span>}
        <span className="text-[11px] text-slate-400">{db.users.filter((u) => u.departmentId === d.id).length} người</span>
      </div>,
      ...tree(d.id, depth + 1),
    ]);

  const counts = Object.entries({ "Dự án": db.projects, "Hạng mục": db.constructionItems, "Công việc": db.constructionPlans, "Nhật ký thi công": db.constructionLogs, "Vật tư": db.materials, "Đề xuất vật tư": db.materialRequests, "Phiếu nhập/xuất": db.stockTransactions, "Thiết bị": db.equipment, "Ca máy": db.equipmentShifts, "Hồ sơ nghiệm thu": db.acceptanceRecords, "Hồ sơ thanh toán": db.paymentRecords, "Người dùng": db.users });

  return (
    <div>
      <PageHeader title="Quản lý hệ thống" description="Người dùng, vai trò người dùng, quyền hệ thống, lịch sử đăng nhập, cơ cấu tổ chức và dữ liệu demo." />
      <Tabs value={section} onValueChange={(v) => navigate(`/admin/${v}`)}>
        <TabsList className="mb-4 rounded-xl bg-white px-2">
          <TabsTrigger value="users">Người dùng</TabsTrigger>
          <TabsTrigger value="roles">Vai trò người dùng</TabsTrigger>
          <TabsTrigger value="permissions">Quyền hệ thống</TabsTrigger>
          <TabsTrigger value="logins">Lịch sử đăng nhập</TabsTrigger>
          <TabsTrigger value="org">Cơ cấu tổ chức</TabsTrigger>
          <TabsTrigger value="data">Dữ liệu demo</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card>
            <DataTable columns={cols} rows={staff} rowKey={(u) => u.id} loading={loading} searchText={(u) => `${u.name} ${u.code} ${u.title} ${u.email}`} searchPlaceholder="Tìm người dùng..." pageSize={15}
              toolbar={<FilterSelect value={role} onChange={setRole} allLabel="Tất cả vai trò" options={Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />}
              toolbarRight={isAdmin ? <><Button size="sm" variant="outline" onClick={() => toast.info("Chọn file Excel danh sách người dùng theo mẫu (mô phỏng)")}><Upload /> Import</Button><Button size="sm" variant="outline" onClick={() => xlsx("Nguoi-dung", staff.map((u) => ({ "Mã NV": u.code, "Họ tên": u.name, "Chức danh": u.title, "Vai trò": ROLE_LABELS[u.role], "Email": u.email, "Điện thoại": u.phone })))}><Download /> Export</Button><Button size="sm" onClick={() => setEdit({ id: genId("u"), code: `NV${db.users.length + 100}`, name: "", role: "to_truong", title: "", departmentId: "d-acc244", phone: "", email: "" })}><Plus /> Thêm người dùng</Button></> : <span className="text-xs text-slate-500">Đăng nhập vai trò Quản trị để chỉnh sửa</span>} />
          </Card>
        </TabsContent>
        <TabsContent value="roles">
          <Card className="mb-4">
            <CardHeader><CardTitle>Danh sách vai trò người dùng</CardTitle></CardHeader>
            <Table>
              <TableHeader><TableRow><TableHead>Vai trò</TableHead><TableHead>Mô tả</TableHead><TableHead className="text-right">Số quyền</TableHead><TableHead className="text-right">Số người dùng</TableHead></TableRow></TableHeader>
              <TableBody>{(Object.keys(ROLE_LABELS) as RoleKey[]).map((r) => <TableRow key={r}><TableCell className="font-medium">{ROLE_LABELS[r]}</TableCell><TableCell className="text-xs text-slate-600">{ROLE_DESCRIPTIONS[r]}</TableCell><TableCell className="text-right">{ROLE_PERMISSIONS[r].length}</TableCell><TableCell className="text-right">{db.users.filter((u) => u.role === r).length}</TableCell></TableRow>)}</TableBody>
            </Table>
          </Card>
          <Card>
            <CardHeader><CardTitle>Ma trận phân quyền theo vai trò</CardTitle><AssumptionTag>Ma trận phân quyền là đề xuất của prototype dựa trên mô hình tổ chức và các luồng nghiệp vụ; cần khảo sát chi tiết để xác nhận với ACC.</AssumptionTag></CardHeader>
            <Table>
              <TableHeader><TableRow><TableHead>Chức năng</TableHead>{(Object.keys(ROLE_LABELS) as RoleKey[]).map((r) => <TableHead key={r} className="text-center normal-case">{ROLE_LABELS[r]}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {(Object.keys(PERMISSION_LABELS) as Permission[]).map((p) => (
                  <TableRow key={p}><TableCell className="font-medium">{PERMISSION_LABELS[p]}</TableCell>{(Object.keys(ROLE_LABELS) as RoleKey[]).map((r) => <TableCell key={r} className="text-center">{ROLE_PERMISSIONS[r].includes(p) ? <Check className="mx-auto h-4 w-4 text-success" /> : <span className="text-slate-200">—</span>}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="permissions">
          <Card>
            <CardHeader><CardTitle>Tra cứu quyền hệ thống</CardTitle><Button size="sm" variant="outline" onClick={() => xlsx("Quyen-he-thong", (Object.keys(PERMISSION_LABELS) as Permission[]).map((p) => ({ "Mã quyền": p, "Tên quyền": PERMISSION_LABELS[p], "Vai trò được gán": (Object.keys(ROLE_LABELS) as RoleKey[]).filter((r) => ROLE_PERMISSIONS[r].includes(p)).map((r) => ROLE_LABELS[r]).join(", ") })))}><Download /> Xuất danh sách</Button></CardHeader>
            <Table>
              <TableHeader><TableRow><TableHead>Mã quyền</TableHead><TableHead>Tên quyền</TableHead><TableHead>Vai trò được gán</TableHead></TableRow></TableHeader>
              <TableBody>{(Object.keys(PERMISSION_LABELS) as Permission[]).map((p) => <TableRow key={p}><TableCell><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{p}</code></TableCell><TableCell className="font-medium">{PERMISSION_LABELS[p]}</TableCell><TableCell><div className="flex flex-wrap gap-1">{(Object.keys(ROLE_LABELS) as RoleKey[]).filter((r) => ROLE_PERMISSIONS[r].includes(p)).map((r) => <Badge key={r} tone="outline">{ROLE_LABELS[r]}</Badge>)}</div></TableCell></TableRow>)}</TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="logins">
          <Card>
            <DataTable<LoginEntry> rows={db.loginHistory.filter((l) => !lu || l.userId === lu)} rowKey={(l) => l.id} loading={loading} pageSize={15} resetKey={lu}
              searchText={(l) => `${db.users.find((u) => u.id === l.userId)?.name} ${l.ip} ${l.device}`} searchPlaceholder="Tìm người dùng, IP, thiết bị..."
              toolbar={<FilterSelect value={lu} onChange={setLu} allLabel="Tất cả người dùng" options={[...new Set(db.loginHistory.map((l) => l.userId))].map((id) => ({ value: id, label: db.users.find((u) => u.id === id)?.name ?? id }))} />}
              columns={[
                { key: "at", header: "Thời gian", sortValue: (l) => l.at, cell: (l) => <span className="whitespace-nowrap">{fmtDateTime(l.at)}</span> },
                { key: "u", header: "Người dùng", cell: (l) => { const u = db.users.find((x) => x.id === l.userId); return <div className="flex items-center gap-2"><Avatar name={u?.name ?? ""} size="xs" /><span>{u?.name}</span></div>; } },
                { key: "ip", header: "Địa chỉ IP", cell: (l) => <code className="text-xs">{l.ip}</code> },
                { key: "d", header: "Thiết bị / trình duyệt", cell: (l) => <span className="text-xs">{l.device}</span> },
                { key: "r", header: "Kết quả", cell: (l) => l.result === "thanh_cong" ? <Badge tone="success">Thành công</Badge> : <Badge tone="danger">Sai mật khẩu</Badge> },
              ]} />
          </Card>
        </TabsContent>
        <TabsContent value="org">
          <Card>
            <CardHeader><CardTitle>Mô hình quản lý vận hành dự án tại ACC</CardTitle></CardHeader>
            <CardContent>
              {tree(null)}
              <div className="mt-4 rounded-lg border border-dashed p-3 text-xs text-slate-600">
                <b>Công trường → Ban chỉ huy công trường</b> gồm các bộ phận: BP Kỹ thuật · BP Vật tư · BP Hồ sơ · BP Kế toán · BP ATLĐ – VSMT · BP Xe máy. Mỗi dự án trong hệ thống có một Ban chỉ huy (Chỉ huy trưởng + thành viên).
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="data">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> Trạng thái dữ liệu</CardTitle>{hasLocalChanges() ? <Badge tone="warning">Có thay đổi lưu trên trình duyệt</Badge> : <Badge tone="success">Dữ liệu gốc</Badge>}</CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-3">{counts.map(([k, v]) => <div key={k} className="rounded-lg bg-slate-50 px-3 py-2"><div className="text-[11px] text-slate-500">{k}</div><div className="font-semibold">{v.length}</div></div>)}</div>
                <p className="mt-4 text-xs text-slate-500">Dữ liệu demo được nạp từ các file JSON trong <code className="rounded bg-slate-100 px-1">src/data/</code>. Mọi thao tác (tạo, sửa, xóa, phê duyệt, cập nhật tiến độ...) được lưu vào <code className="rounded bg-slate-100 px-1">localStorage</code> của trình duyệt.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Thao tác</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border p-4">
                  <div className="font-medium">Khôi phục dữ liệu demo (Reset)</div>
                  <p className="mt-1 text-xs text-slate-500">Xóa toàn bộ thay đổi đã lưu và đưa hệ thống về trạng thái ban đầu – dùng trước mỗi buổi trình diễn.</p>
                  <Button variant="destructive" className="mt-3" onClick={async () => { if (await confirm({ title: "Khôi phục dữ liệu demo ban đầu?", description: "Mọi thao tác đã thực hiện sẽ bị xóa.", destructive: true, confirmText: "Khôi phục" })) { resetDemo(); toast.success("Đã khôi phục dữ liệu demo"); } }}><RefreshCcw /> Reset dữ liệu demo</Button>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="font-medium">Sao lưu dữ liệu hiện tại</div>
                  <p className="mt-1 text-xs text-slate-500">Tải về toàn bộ dữ liệu (kể cả thay đổi) dạng JSON.</p>
                  <Button variant="outline" className="mt-3" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: "application/json" })); a.download = "acc-pms-data.json"; a.click(); }}><Download /> Tải JSON</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{db.users.some((u) => u.id === edit?.id) ? "Sửa người dùng" : "Thêm người dùng"}</DialogTitle></DialogHeader>
          {edit && (
            <DialogBody className="grid gap-3 sm:grid-cols-2">
              <FormField label="Họ và tên" required className="sm:col-span-2"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></FormField>
              <FormField label="Mã nhân viên"><Input value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></FormField>
              <FormField label="Vai trò"><Select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as RoleKey })} options={Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))} /></FormField>
              <FormField label="Chức danh" className="sm:col-span-2"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></FormField>
              <FormField label="Đơn vị" className="sm:col-span-2"><Select value={edit.departmentId} onChange={(e) => setEdit({ ...edit, departmentId: e.target.value })} options={db.departments.map((d) => ({ value: d.id, label: d.name }))} /></FormField>
              <FormField label="Email"><Input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></FormField>
              <FormField label="Điện thoại"><Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></FormField>
            </DialogBody>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Hủy</Button><Button onClick={() => { if (!edit?.name.trim()) return toast.error("Nhập họ tên"); run(saveUser, edit); toast.success("Đã lưu người dùng"); setEdit(null); }}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
