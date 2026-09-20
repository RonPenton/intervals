import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IntervalsExportSource } from './source';
import { reportExportFailure } from './cli';

test('CLI reports request validation and HTTP failures exactly once and still exits unsuccessfully', async () => {
    const originalFetch = globalThis.fetch, originalKey = process.env.INTERVALS_API_KEY;
    const originalExitCode = process.exitCode, originalError = console.error;
    const messages: string[] = [];
    process.env.INTERVALS_API_KEY = 'test-api-key';
    console.error = message => messages.push(String(message));
    try {
        const source = new IntervalsExportSource('a1', 1);
        for (const response of [new Response('{"curves":[]}'), new Response('', { status: 403 })]) {
            messages.length = 0;
            process.exitCode = undefined;
            globalThis.fetch = async () => response;
            await source.getPowerCurves('2023-01-01', '2026-09-20').catch(reportExportFailure);
            assert.equal(process.exitCode, 1);
            assert.equal(messages.length, 1);
            assert.match(messages[0], /GET \/api\/v1\/athlete\/a1\/activity-power-curves/);
        }
        messages.length = 0;
        reportExportFailure(new Error('Unreported disk error'));
        assert.deepEqual(messages, ['Unreported disk error']);
    } finally {
        globalThis.fetch = originalFetch;
        console.error = originalError;
        process.exitCode = originalExitCode;
        if (originalKey === undefined) delete process.env.INTERVALS_API_KEY; else process.env.INTERVALS_API_KEY = originalKey;
    }
});
