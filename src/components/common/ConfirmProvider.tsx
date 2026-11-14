import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}
type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>;
const Ctx = createContext<ConfirmFn>(() => Promise.resolve(false));

/** Hộp thoại xác nhận dùng chung: const confirm = useConfirm(); if (await confirm({...})) ... */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>();
  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise((res) => (resolver.current = res));
  }, []);
  const close = (v: boolean) => {
    resolver.current?.(v);
    setOpts(null);
  };
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <AlertDialog open={!!opts} onOpenChange={(o) => !o && close(false)}>
        <AlertDialogContent>
          <div className="flex gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${opts?.destructive ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle>{opts?.title}</AlertDialogTitle>
              {opts?.description && <AlertDialogDescription asChild><div>{opts.description}</div></AlertDialogDescription>}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialogCancel onClick={() => close(false)}>{opts?.cancelText ?? "Hủy"}</AlertDialogCancel>
            <AlertDialogAction destructive={opts?.destructive} onClick={() => close(true)}>
              {opts?.confirmText ?? "Xác nhận"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Ctx.Provider>
  );
}
export const useConfirm = () => useContext(Ctx);
