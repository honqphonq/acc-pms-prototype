/** Ngày "hôm nay" của bộ dữ liệu demo – cố định để kịch bản trình diễn luôn nhất quán */
export const DEMO_TODAY = "2026-11-14";
export const DATA_UPDATED_AT = "14/11/2026, 08:30";

const toDate = (s: string) => new Date(s.slice(0, 10) + "T00:00:00Z");
export const toISO = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
};
export const diffDays = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);
export const nowStamp = () => {
  const t = new Date();
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  return `${DEMO_TODAY}T${hh}:${mm}:00`;
};
export const monthKey = (s: string) => s.slice(0, 7);
export const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return `T${Number(m)}/${y.slice(2)}`;
};
export const monthsBetween = (from: string, to: string) => {
  const res: string[] = [];
  let [y, m] = from.slice(0, 7).split("-").map(Number);
  const [ty, tm] = to.slice(0, 7).split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    res.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return res;
};
export const endOfMonth = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return toISO(new Date(Date.UTC(y, m, 0)));
};
