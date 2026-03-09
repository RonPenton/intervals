import { readFileSync } from 'fs';
import { join } from 'path';

const SQL_DIR = join(__dirname, 'sql');
const cache = new Map<string, string>();

/**
 * Load a `.sql` file from the sql/ directory by name (without extension).
 * Results are cached after the first read.
 */
export function sql(name: string): string {
    let text = cache.get(name);
    if (!text) {
        text = readFileSync(join(SQL_DIR, `${name}.sql`), 'utf-8').trim();
        cache.set(name, text);
    }
    return text;
}
