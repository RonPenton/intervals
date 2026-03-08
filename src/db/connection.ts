import { Pool, PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE || 'intervals',
    user: process.env.PGUSER || 'intervals',
    password: process.env.PGPASSWORD || 'intervals',
    max: 10,
    idleTimeoutMillis: 30_000,
};

let pool: Pool | undefined;

export function getPool(): Pool {
    if (!pool) {
        pool = new Pool(poolConfig);
    }
    return pool;
}

export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = undefined;
    }
}

export async function query<T extends Record<string, any> = any>(
    text: string,
    params?: any[]
): Promise<T[]> {
    const { rows } = await getPool().query<T>(text, params);
    return rows;
}
