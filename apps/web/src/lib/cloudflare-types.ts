export interface D1RunResult {
  meta?: { changes?: number; last_row_id?: number };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<D1RunResult>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface KVNamespace {
  get(key: string, options?: { type?: "json" | "text" }): Promise<unknown>;
  put(
    key: string,
    value: string,
    options?: {
      expiration?: number;
      expirationTtl?: number;
    }
  ): Promise<void>;
  delete(key: string): Promise<void>;
}
