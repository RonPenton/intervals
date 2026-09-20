import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { LocalExportTarget, stableJson } from './target';

async function directory(): Promise<{ path: string; cleanup: () => Promise<void> }> {
    const root = resolve(tmpdir());
    const path = await mkdtemp(join(root, 'intervals-export-test-'));
    return { path, cleanup: async () => {
        // Verify the absolute generated target stays directly inside the intended temporary directory.
        assert.equal(dirname(resolve(path)), root);
        assert.ok(basename(path).startsWith('intervals-export-test-'));
        await rm(path, { recursive: true, force: true });
    } };
}

test('local destination writes valid atomic JSON and skips unchanged bytes without touching mtime', async () => {
    const temp = await directory();
    try {
        const target = new LocalExportTarget(temp.path);
        await target.withLock(async () => {
            assert.equal(await target.writeJson('activities/i1.json', { schemaVersion: 1, id: 'i1' }), true);
            const first = await stat(join(temp.path, 'activities', 'i1.json'));
            assert.equal(await target.writeJson('activities/i1.json', { id: 'i1', schemaVersion: 1 }), false);
            assert.equal((await stat(join(temp.path, 'activities', 'i1.json'))).mtimeMs, first.mtimeMs);
            assert.deepEqual(await target.readJson('activities/i1.json'), { id: 'i1', schemaVersion: 1 });
            assert.deepEqual(await readdir(join(temp.path, 'activities')), ['i1.json']);
            assert.deepEqual(await target.listJson('activities'), ['activities/i1.json']);
        });
        assert.equal((await readdir(temp.path)).includes('.sync.lock'), false);
    } finally { await temp.cleanup(); }
});

test('credential guards reject nested keys, authorization values and configured secrets in free text', async () => {
    for (const input of [{ api_key: 'x' }, { a: [{ access_token: 'x' }] }, { headers: { Authorization: 'x' } }, { name: 'Bearer abc123' }]) {
        assert.throws(() => stableJson(input), /credential/);
    }
    const temp = await directory();
    try {
        const target = new LocalExportTarget(temp.path, ['configured-secret']);
        await target.writeJson('athlete.json', { schemaVersion: 1, id: 'a1' });
        const before = await readFile(join(temp.path, 'athlete.json'), 'utf8');
        await assert.rejects(target.writeJson('athlete.json', { name: 'ride configured-secret' }), /credential/);
        assert.equal(await readFile(join(temp.path, 'athlete.json'), 'utf8'), before);
        assert.deepEqual(await readdir(temp.path), ['athlete.json']);
    } finally { await temp.cleanup(); }
});

test('destination rejects path traversal and concurrent sync, releases lock on failure', async () => {
    const temp = await directory();
    try {
        const target = new LocalExportTarget(temp.path);
        await assert.rejects(target.writeJson('../escape.json', {}), /path/i);
        await target.withLock(async () => {
            await assert.rejects(new LocalExportTarget(temp.path).withLock(async () => {}), /locked/);
        });
        await assert.rejects(target.withLock(async () => { throw new Error('simulated failure'); }));
        await target.withLock(async () => {});
        assert.deepEqual(await readdir(temp.path), []);
    } finally { await temp.cleanup(); }
});
