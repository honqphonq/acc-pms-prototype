import * as React from "react";
import { Input } from "./input";

/** Ô nhập số có dấu chấm phân cách hàng nghìn (VD: 241.800.000.000), chỉ cho nhập số */
export function NumberInput({ value, onChange, allowNegative, className, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & { value: number | null | undefined; onChange: (v: number) => void; allowNegative?: boolean }) {
  const fmt = (n: number | null | undefined) => (n === null || n === undefined || Number.isNaN(n) || n === 0 ? "" : n.toLocaleString("vi-VN"));
  const [text, setText] = React.useState(fmt(value));
  React.useEffect(() => { if ((Number(text.replace(/\./g, "").replace(",", ".")) || 0) !== (value ?? 0)) setText(fmt(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Input
      {...rest}
      inputMode="decimal"
      className={className}
      value={text}
      onChange={(e) => {
        const neg = allowNegative && e.target.value.trim().startsWith("-");
        const raw = e.target.value.replace(/[^\d,]/g, "");
        const [int, dec] = raw.split(",");
        const n = Number((int || "0") + (dec !== undefined ? "." + dec : "")) * (neg ? -1 : 1);
        const shown = (neg ? "-" : "") + (int ? Number(int).toLocaleString("vi-VN") : "") + (dec !== undefined ? "," + dec : "");
        setText(shown);
        onChange(n);
      }}
    />
  );
}
