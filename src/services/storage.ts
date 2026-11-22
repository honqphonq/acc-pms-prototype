import type { CollectionKey, Database } from "@/types";
import { getSeedData } from "./seed";

const PREFIX = "acc-pms:v7:";
export const SESSION_KEY = "acc-pms:v7:session";

/** Đọc DB: ưu tiên dữ liệu đã lưu trong localStorage, nếu không có thì dùng JSON gốc */
export function loadDatabase(): Database {
  const seed = getSeedData();
  const db = { ...seed };
  (Object.keys(seed) as CollectionKey[]).forEach((key) => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw) (db as Record<string, unknown>)[key] = JSON.parse(raw);
    } catch {
      /* bỏ qua dữ liệu hỏng */
    }
  });
  return db;
}

/** Chỉ ghi các collection thay đổi */
export function persistChanges(prev: Database, next: Database) {
  (Object.keys(next) as CollectionKey[]).forEach((key) => {
    if (prev[key] !== next[key]) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(next[key]));
      } catch {
        /* quota */
      }
    }
  });
}

export function clearPersisted() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX) && k !== SESSION_KEY)
    .forEach((k) => localStorage.removeItem(k));
}

export function hasLocalChanges() {
  return Object.keys(localStorage).some((k) => k.startsWith(PREFIX) && k !== SESSION_KEY);
}
