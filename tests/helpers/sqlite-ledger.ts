// Real local SQLite adapter for integration tests. This is not a hosted D1 adapter.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import type { DurableDB, Statement } from '../../src/server/run-store.ts';
export function openLedger(path: string) {
  const sqlite = new DatabaseSync(path);
  sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  sqlite.exec('CREATE TABLE IF NOT EXISTS test_migrations(name TEXT PRIMARY KEY)');
  for (const name of readdirSync('services/run-ledger/migrations')
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    if (sqlite.prepare('SELECT name FROM test_migrations WHERE name=?').get(name)) continue;
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      sqlite.exec(readFileSync('services/run-ledger/migrations/' + name, 'utf8'));
      sqlite.prepare('INSERT INTO test_migrations(name) VALUES(?)').run(name);
      sqlite.exec('COMMIT');
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  }
  class Query implements Statement {
    values: (string | number | null)[] = [];
    constructor(readonly sql: string) {}
    bind(...values: (string | number | null)[]) {
      this.values = values;
      return this;
    }
    async first<T>() {
      return (sqlite.prepare(this.sql).get(...this.values) ?? null) as T | null;
    }
  }
  const db: DurableDB = {
    prepare: (sql) => new Query(sql),
    batch: async (statements) => {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        for (const statement of statements) {
          const query = statement as Query;
          sqlite.prepare(query.sql).run(...query.values);
        }
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return { sqlite, db };
}
