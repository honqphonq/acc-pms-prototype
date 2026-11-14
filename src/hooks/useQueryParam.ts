import { useSearchParams } from "react-router-dom";

/** Đồng bộ một bộ lọc với query string (để có thể chia sẻ link / điều hướng từ trang khác) */
export function useQueryParam(key: string, fallback = ""): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? fallback;
  const set = (v: string) =>
    setParams(
      (p) => {
        if (v) p.set(key, v);
        else p.delete(key);
        return p;
      },
      { replace: true },
    );
  return [value, set];
}
