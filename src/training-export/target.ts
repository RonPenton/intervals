import { mkdir, readFile, open, rename, unlink, lstat, readdir } from 'node:fs/promises';
import { resolve, relative, dirname, isAbsolute, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

/** Future destinations only need JSON storage and exclusive access; extraction is destination-independent. */
export interface ExportTarget {
    readJson(path: string): Promise<unknown | undefined>;
    writeJson(path: string, value: unknown): Promise<boolean>;
    remove(path: string): Promise<void>;
    listJson(directory: string): Promise<string[]>;
    withLock<T>(work: () => Promise<T>): Promise<T>;
}

function errno(error: unknown, code: string): boolean {
    return error instanceof Error && 'code' in error && error.code === code;
}

/** Deterministic serialization with a final credential check, including configured secrets in text fields. */
export function stableJson(value: unknown, secrets: string[] = []): string {
    function clean(input: unknown): unknown {
        if (input === null || typeof input === 'boolean') return input;
        if (typeof input === 'number') {
            if (!Number.isFinite(input)) throw new Error('Export contains a non-finite number');
            return input;
        }
        if (typeof input === 'string') {
            if (secrets.some(secret => secret.length > 0 && input.includes(secret)) || /\b(?:Basic|Bearer)\s+[A-Za-z0-9+/=_-]+/i.test(input)) {
                throw new Error('Export contains a credential value');
            }
            return input;
        }
        if (Array.isArray(input)) return input.map(clean);
        if (input && typeof input === 'object') {
            const result: Record<string, unknown> = {};
            for (const key of Object.keys(input).sort()) {
                if (/api.?key|authorization|cookie|password|secret|token/i.test(key)) throw new Error('Export contains a credential field');
                const v = (input as Record<string, unknown>)[key];
                if (v !== undefined) result[key] = clean(v);
            }
            return result;
        }
        throw new Error('Export contains a non-JSON value');
    }
    return JSON.stringify(clean(value), null, 2) + '\n';
}

export class LocalExportTarget implements ExportTarget {
    readonly directory: string;
    constructor(directory: string, private readonly secrets: string[] = []) { this.directory = resolve(directory); }

    private async path(key: string): Promise<string> {
        if (!key || key.includes('\\') || isAbsolute(key) || key.split('/').some(p => p === '..' || p === '.')) {
            throw new Error('Invalid export path');
        }
        const path = resolve(this.directory, key);
        const rel = relative(this.directory, path);
        if (rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('Path escapes export directory');
        // Refuse links/junctions so an existing directory cannot redirect writes outside the destination.
        const parts = [this.directory];
        let current = this.directory;
        for (const part of rel.split(sep)) { current = resolve(current, part); parts.push(current); }
        for (const part of parts) {
            try { if ((await lstat(part)).isSymbolicLink()) throw new Error('Export paths must not be symbolic links'); }
            catch (error) { if (!errno(error, 'ENOENT')) throw error; }
        }
        return path;
    }

    async readJson(key: string): Promise<unknown | undefined> {
        const path = await this.path(key);
        try { return JSON.parse(await readFile(path, 'utf8')) as unknown; }
        catch (error) { if (errno(error, 'ENOENT')) return undefined; throw error; }
    }

    async writeJson(key: string, value: unknown): Promise<boolean> {
        const content = stableJson(value, this.secrets);
        const path = await this.path(key);
        try { if (await readFile(path, 'utf8') === content) return false; }
        catch (error) { if (!errno(error, 'ENOENT')) throw error; }
        await mkdir(dirname(path), { recursive: true });
        const temporary = `${path}.${randomUUID()}.tmp`;
        const file = await open(temporary, 'wx', 0o600);
        try {
            await file.writeFile(content, 'utf8');
            await file.sync();
        } catch (error) {
            await file.close();
            await unlink(temporary).catch(() => {});
            throw error;
        }
        await file.close();
        try { await rename(temporary, path); }
        finally { await unlink(temporary).catch(error => { if (!errno(error, 'ENOENT')) throw error; }); }
        return true;
    }

    async remove(key: string): Promise<void> {
        const path = await this.path(key);
        try { await unlink(path); }
        catch (error) { if (!errno(error, 'ENOENT')) throw error; }
    }

    async listJson(directory: string): Promise<string[]> {
        const path = await this.path(directory);
        try {
            return (await readdir(path)).filter(name => /^[A-Za-z0-9_-]+\.json$/.test(name))
                .sort().map(name => `${directory}/${name}`);
        } catch (error) { if (errno(error, 'ENOENT')) return []; throw error; }
    }

    async withLock<T>(work: () => Promise<T>): Promise<T> {
        const path = await this.path('.sync.lock');
        await mkdir(this.directory, { recursive: true });
        let lock;
        try { lock = await open(path, 'wx', 0o600); }
        catch (error) {
            if (errno(error, 'EEXIST')) throw new Error('Export is locked; see the export documentation for stale-lock recovery');
            throw error;
        }
        try { return await work(); }
        finally { await lock.close(); await unlink(path); }
    }
}
