import type { Repository } from "@/lib/data/models";

export function createMemoryRepository<T extends { id: string }>(initial: T[] = []): Repository<T> {
  const rows = new Map(initial.map((row) => [row.id, row]));

  return {
    async list() {
      return [...rows.values()];
    },
    async get(id: string) {
      return rows.get(id) ?? null;
    },
    async insert(record: T) {
      rows.set(record.id, record);
      return record;
    },
    async update(id: string, patch: Partial<T>) {
      const existing = rows.get(id);
      if (!existing) return null;
      const next = { ...existing, ...patch };
      rows.set(id, next);
      return next;
    }
  };
}

