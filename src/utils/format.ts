// Định dạng số liệu theo chuẩn Việt Nam
const nf = (digits = 0) => new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: digits });

export const fmtNumber = (v: number | null | undefined, digits = 1) => (v == null || isNaN(v) ? "—" : nf(digits).format(v));
export const fmtInt = (v: number | null | undefined) => fmtNumber(v, 0);
export const fmtVnd = (v: number | null | undefined) => (v == null ? "—" : nf(0).format(Math.round(v)));
/** Giá trị lớn: hiển thị theo tỷ đồng */
export const fmtBillion = (v: number, digits = 1) => `${nf(digits).format(v / 1e9)} tỷ`;
export const fmtMoneyShort = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e9) return `${nf(a >= 100e9 ? 0 : 1).format(v / 1e9)} tỷ`;
  if (a >= 1e6) return `${nf(1).format(v / 1e6)} tr`;
  return `${nf(0).format(v)} đ`;
};
export const fmtPct = (ratio: number, digits = 1) => `${nf(digits).format(ratio * 100)}%`;

export const fmtDate = (s: string | null | undefined) => {
  if (!s) return "—";
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
export const fmtDateShort = (s: string | null | undefined) => {
  if (!s) return "—";
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${d}/${m}/${y.slice(2)}`;
};
export const fmtDateTime = (s: string | null | undefined) => {
  if (!s) return "—";
  return `${fmtDate(s)} ${s.slice(11, 16)}`;
};
export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
};
