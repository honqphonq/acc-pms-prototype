import { useEffect, useState } from "react";

/** Mô phỏng thời gian tải dữ liệu để thể hiện Loading State (skeleton) */
export function useSimulatedLoading(ms = 380, deps: unknown[] = []) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return loading;
}
