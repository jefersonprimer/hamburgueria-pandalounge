import { query } from "@/lib/db";

let schemaReady: Promise<void> | null = null;

export function ensureProductAddonsSchema() {
  if (!schemaReady) {
    schemaReady = query(
      `ALTER TABLE public.products
       ADD COLUMN IF NOT EXISTS addons JSONB NOT NULL DEFAULT '[]'::jsonb`,
    )
      .then(() => undefined)
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }
  return schemaReady;
}
