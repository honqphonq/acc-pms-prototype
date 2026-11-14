export const genId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const nextCode = (prefix: string, existing: string[], width = 3) => {
  const nums = existing.map((c) => Number(c.match(/(\d+)$/)?.[1] ?? 0));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(n).padStart(width, "0")}`;
};
