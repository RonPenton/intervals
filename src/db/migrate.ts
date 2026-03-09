import { query } from './connection';
import { sql } from './sql-loader';

/**
 * Run all migrations in order. Each migration is idempotent (IF NOT EXISTS).
 */
export async function migrate(): Promise<void> {
    console.log('Running database migrations…');

    for (const stmt of sql('migration').split(';').map(s => s.trim()).filter(Boolean)) {
        await query(stmt);
    }

    console.log('Migrations complete.');
}
