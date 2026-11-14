import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";

export default function NotFoundPage() {
  return <Card><EmptyState icon={<Compass />} title="Không tìm thấy trang" description="Đường dẫn không tồn tại hoặc đã thay đổi." action={<Button asChild><Link to="/">Về Dashboard</Link></Button>} /></Card>;
}
