import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { DbProvider } from "@/hooks/useDb";
import { AuthProvider } from "@/hooks/useAuth";
import { ConfirmProvider } from "@/components/common/ConfirmProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppRoutes } from "@/routes";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <DbProvider>
        <AuthProvider>
          <TooltipProvider>
            <ConfirmProvider>
              <AppRoutes />
              <Toaster position="bottom-right" richColors closeButton toastOptions={{ style: { fontSize: 13 } }} />
            </ConfirmProvider>
          </TooltipProvider>
        </AuthProvider>
      </DbProvider>
    </BrowserRouter>
  );
}
