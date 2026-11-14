import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { Database } from "@/types";
import { clearPersisted, loadDatabase, persistChanges } from "@/services/storage";
import { getSeedData } from "@/services/seed";

export type Mutation<A extends unknown[] = unknown[]> = (db: Database, ...args: A) => Database;

interface DbContextValue {
  db: Database;
  /** Áp dụng một nghiệp vụ (hàm thuần) lên DB, lưu vào localStorage */
  run: <A extends unknown[]>(fn: Mutation<A>, ...args: A) => Database;
  resetDemo: () => void;
  version: number;
}

const DbContext = createContext<DbContextValue | null>(null);

export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => loadDatabase());
  const [version, setVersion] = useState(0);
  const ref = useRef(db);
  ref.current = db;

  const run = useCallback(<A extends unknown[]>(fn: Mutation<A>, ...args: A) => {
    const prev = ref.current;
    const next = fn(prev, ...args);
    if (next !== prev) {
      persistChanges(prev, next);
      ref.current = next;
      setDb(next);
    }
    return next;
  }, []);

  const resetDemo = useCallback(() => {
    clearPersisted();
    const seed = getSeedData();
    ref.current = seed;
    setDb(seed);
    setVersion((v) => v + 1);
  }, []);

  const value = useMemo(() => ({ db, run, resetDemo, version }), [db, run, resetDemo, version]);
  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb() {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error("useDb must be used within DbProvider");
  return ctx;
}
