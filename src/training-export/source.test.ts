import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IntervalsExportSource } from './source';
import { POWER_DURATIONS_SECONDS } from './schema';
import { normalizePowerCurves } from './normalize';

test('short power curves preserve sample positions and normalize missing trailing durations to null', async () => {
    const originalFetch = globalThis.fetch, originalKey = process.env.INTERVALS_API_KEY;
    process.env.INTERVALS_API_KEY = 'test-api-key';
    const logs: string[] = [];
    const lengths = [15, 14, 13, 12, 9, 0]; // Includes all lengths observed in the historical response.
    const values = POWER_DURATIONS_SECONDS.map((_, i) => 500 - i * 10);
    const curves = lengths.map(length => ({ id: `i${length}`, start_date_local: '2026-09-20T08:00:00', watts: values.slice(0, length) }));
    globalThis.fetch = async () => new Response(JSON.stringify({ secs: POWER_DURATIONS_SECONDS, curves }));
    try {
        const source = new IntervalsExportSource('a1', 1, message => logs.push(message));
        const rows = normalizePowerCurves(await source.getPowerCurves('2023-01-01', '2026-09-20'));
        for (const length of lengths) {
            const row = rows.find(r => r.id === `i${length}`)!;
            assert.equal(row.bestWatts.length, 15);
            assert.deepEqual(row.bestWatts, [...values.slice(0, length), ...Array(15 - length).fill(null)]);
        }
        assert.deepEqual(logs, []);
        // Null and negative sentinels retain their positions; valid zero is a measured value.
        globalThis.fetch = async () => new Response(JSON.stringify({ secs: [1, 5, 15, 30, 60], curves: [
            { id: 'i1', start_date_local: '2026-09-20T08:00:00', watts: [600, null, -1, 0] },
        ] }));
        const [row] = normalizePowerCurves(await source.getPowerCurves('2023-01-01', '2026-09-20'));
        assert.deepEqual(row.bestWatts.slice(0, 5), [600, null, null, 0, null]);
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.INTERVALS_API_KEY; else process.env.INTERVALS_API_KEY = originalKey;
    }
});

test('power curve validation still rejects unalignable arrays, duplicate durations and malformed values', async () => {
    const originalFetch = globalThis.fetch, originalKey = process.env.INTERVALS_API_KEY;
    process.env.INTERVALS_API_KEY = 'test-api-key';
    try {
        const source = new IntervalsExportSource('a1', 1, () => {});
        for (const payload of [
            { secs: [1], curves: [{ id: 'i1', watts: [500, 400] }] },
            { secs: [1, 1], curves: [{ id: 'i1', watts: [500] }] },
            { secs: [1], curves: [{ id: 'i1', watts: { value: 500 } }] },
            { secs: [1], curves: [{ id: 'i1', watts: ['500'] }] },
            { secs: [1], curves: [{ id: 'i1', watts: [{}] }] },
        ]) {
            globalThis.fetch = async () => new Response(JSON.stringify(payload));
            await assert.rejects(source.getPowerCurves('2023-01-01', '2026-09-20'), /Invalid power-curve/);
        }
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.INTERVALS_API_KEY; else process.env.INTERVALS_API_KEY = originalKey;
    }
});

test('concurrent legacy and supplemental endpoints share one request queue', async () => {
    const originalFetch = globalThis.fetch, originalKey = process.env.INTERVALS_API_KEY;
    process.env.INTERVALS_API_KEY = 'test-api-key';
    const starts: number[] = [];
    let active = 0, maximumActive = 0;
    globalThis.fetch = async input => {
        starts.push(performance.now());
        maximumActive = Math.max(maximumActive, ++active);
        await new Promise(resolve => setTimeout(resolve, 5));
        active--;
        const path = new URL(String(input)).pathname;
        return new Response(JSON.stringify(path.endsWith('/a1') ? { id: 'a1' } : []));
    };
    try {
        const source = new IntervalsExportSource('a1', 30);
        await Promise.all([
            source.getAthlete(),
            source.getActivities('2026-09-01', '2026-09-20'),
            source.getPlannedWorkouts('2026-09-01', '2026-09-20'),
        ]);
        assert.equal(maximumActive, 1);
        assert.equal(starts.length, 3);
        // Leave a small tolerance for the time spent constructing fetch arguments.
        assert.ok(starts[1] - starts[0] >= 25);
        assert.ok(starts[2] - starts[1] >= 25);
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.INTERVALS_API_KEY; else process.env.INTERVALS_API_KEY = originalKey;
    }
});

test('source reuses existing rides/plans, same credentials and generated endpoint shapes', async () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.INTERVALS_API_KEY;
    process.env.INTERVALS_API_KEY = 'test-api-key';
    const requests: { url: URL; headers: Headers }[] = [];
    globalThis.fetch = async (input, init) => {
        const url = new URL(String(input));
        requests.push({ url, headers: new Headers(init?.headers) });
        let body: unknown;
        if (url.pathname.endsWith('/activities')) body = [
            { id: 'i1', type: 'Ride', start_date_local: '2026-09-20T08:00:00' },
            { id: 'i2', type: 'Run', start_date_local: '2026-09-20T08:00:00' },
            { id: 'i3', type: 'Ride', start_date_local: '2026-09-21T08:00:00' },
        ];
        else if (url.pathname.endsWith('/events')) body = [];
        else if (url.pathname.endsWith('/wellness')) body = [{ id: '2026-09-20' }];
        else if (url.pathname.endsWith('/activity-power-curves')) body = { secs: [240], curves: [
            { id: 'i1', start_date_local: '2026-09-20T08:00:00', watts: [300] },
        ] };
        else if (url.pathname.includes('/activity/')) body = {
            id: 'i1', type: 'Ride', start_date_local: '2026-09-20T08:00:00', icu_intervals: [],
        };
        else body = { id: 'a1' };
        return new Response(JSON.stringify(body), { status: 200 });
    };
    try {
        const source = new IntervalsExportSource('a1', 1);
        assert.equal((await source.getAthlete()).id, 'a1');
        assert.deepEqual((await source.getActivities('2026-09-01', '2026-09-20')).map(r => r.id), ['i1']);
        await source.getActivity('i1');
        await source.getWellness('2026-09-01', '2026-09-20');
        await source.getPlannedWorkouts('2026-09-01', '2026-09-20');
        assert.equal((await source.getPowerCurves('2026-09-01', '2026-09-20')).curves?.[0].watts?.[0], 300);
        assert.equal(requests[2].url.searchParams.get('intervals'), 'true');
        assert.equal(requests[3].url.searchParams.get('oldest'), '2026-09-01');
        assert.equal(requests[4].url.searchParams.get('category'), 'WORKOUT');
        assert.equal(requests[5].url.searchParams.get('secs'), POWER_DURATIONS_SECONDS.join(','));
        assert.equal(requests[5].url.searchParams.get('newest'), '2026-09-20T23:59:59');
        for (const request of requests) {
            assert.equal(request.headers.get('Authorization'), `Basic ${Buffer.from('API_KEY:test-api-key').toString('base64')}`);
            assert.equal(request.url.toString().includes('{ext}'), false);
        }
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.INTERVALS_API_KEY; else process.env.INTERVALS_API_KEY = originalKey;
    }
});

test('supplemental source rejects hidden activity and malformed curves; HTTP failures never expose bodies', async () => {
    const originalFetch = globalThis.fetch, originalKey = process.env.INTERVALS_API_KEY;
    process.env.INTERVALS_API_KEY = 'test-api-key';
    try {
        const source = new IntervalsExportSource('0', 1);
        globalThis.fetch = async () => new Response('{"id":"a1"}');
        await source.getAthlete();
        globalThis.fetch = async () => new Response('{"id":"i1"}');
        await assert.rejects(source.getActivity('i1'), /hidden/);
        globalThis.fetch = async () => new Response('{"secs":[1,5],"curves":[{"id":"i1","watts":[300,250,200]}]}');
        await assert.rejects(source.getPowerCurves('2026-09-01', '2026-09-20'), /alignment/);
        globalThis.fetch = async () => new Response('secret response body', { status: 403 });
        await assert.rejects(source.getAthlete(), error => {
            assert.ok(error instanceof Error);
            assert.match(error.message, /403/);
            assert.equal(error.message.includes('secret'), false);
            return true;
        });
        let calls = 0;
        globalThis.fetch = async () => ++calls === 1
            ? new Response('', { status: 429, headers: { 'Retry-After': '0' } })
            : new Response('{"id":"a1"}');
        assert.equal((await source.getAthlete()).id, 'a1');
        assert.equal(calls, 2);
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.INTERVALS_API_KEY; else process.env.INTERVALS_API_KEY = originalKey;
    }
});

test('power curves use the cached real athlete ID instead of the forbidden zero alias', async () => {
    const originalFetch = globalThis.fetch, originalKey = process.env.INTERVALS_API_KEY;
    process.env.INTERVALS_API_KEY = 'test-api-key';
    const paths: string[] = [];
    globalThis.fetch = async input => {
        const path = new URL(String(input)).pathname;
        paths.push(path);
        if (path === '/api/v1/athlete/0') return new Response('{"id":"i456"}');
        if (path === '/api/v1/athlete/0/activity-power-curves') return new Response('', { status: 403 });
        assert.equal(path, '/api/v1/athlete/i456/activity-power-curves');
        return new Response('{"secs":[240],"curves":[{"id":"i1","watts":[320]}]}');
    };
    try {
        const source = new IntervalsExportSource('0', 1);
        await source.getAthlete();
        const result = await source.getPowerCurves('2026-08-02', '2026-09-20');
        assert.equal(result.curves?.[0].watts?.[0], 320);
        assert.deepEqual(paths, ['/api/v1/athlete/0', '/api/v1/athlete/i456/activity-power-curves']);
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.INTERVALS_API_KEY; else process.env.INTERVALS_API_KEY = originalKey;
    }
});

test('standalone power queries resolve athlete zero once; explicit athlete IDs need no profile lookup', async () => {
    const originalFetch = globalThis.fetch, originalKey = process.env.INTERVALS_API_KEY;
    process.env.INTERVALS_API_KEY = 'test-api-key';
    const paths: string[] = [];
    globalThis.fetch = async input => {
        const path = new URL(String(input)).pathname;
        paths.push(path);
        return new Response(path === '/api/v1/athlete/0' ? '{"id":"123456"}' : '{"secs":[],"curves":[]}');
    };
    try {
        const source = new IntervalsExportSource('0', 1);
        await source.getPowerCurves('2026-08-02', '2026-09-20');
        await source.getPowerCurves('2026-08-02', '2026-09-20');
        assert.deepEqual(paths, ['/api/v1/athlete/0', '/api/v1/athlete/123456/activity-power-curves', '/api/v1/athlete/123456/activity-power-curves']);
        paths.length = 0;
        await new IntervalsExportSource('i789', 1).getPowerCurves('2026-08-02', '2026-09-20');
        assert.deepEqual(paths, ['/api/v1/athlete/i789/activity-power-curves']);
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.INTERVALS_API_KEY; else process.env.INTERVALS_API_KEY = originalKey;
    }
});

test('failed requests log endpoint, status, every retry and elapsed time without response secrets', async () => {
    const originalFetch = globalThis.fetch, originalKey = process.env.INTERVALS_API_KEY;
    process.env.INTERVALS_API_KEY = 'test-api-key';
    const logs: string[] = [];
    try {
        const source = new IntervalsExportSource('a1', 1, message => logs.push(message));
        globalThis.fetch = async () => new Response('private-response-body test-api-key', {
            status: 503, headers: { 'Retry-After': '0' },
        });
        await assert.rejects(source.getActivity('i123'), /503/);
        assert.equal(logs.length, 3);
        logs.forEach((message, i) => {
            assert.match(message, /GET \/api\/v1\/activity\/i123\?intervals=true/);
            assert.ok(message.includes(`attempt ${i + 1}/3`));
            assert.match(message, /HTTP 503 \| \d+ ms/);
            assert.equal(message.includes('private-response-body'), false);
            assert.equal(message.includes('test-api-key'), false);
            assert.equal(message.includes('Authorization'), false);
        });
        assert.match(logs[0], /retry queued after 0 ms/);
        assert.match(logs[2], /no retry/);
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.INTERVALS_API_KEY; else process.env.INTERVALS_API_KEY = originalKey;
    }
});

test('JSON, validation and network failures include request context and sanitize propagated errors', async () => {
    const originalFetch = globalThis.fetch, originalKey = process.env.INTERVALS_API_KEY;
    process.env.INTERVALS_API_KEY = 'test-api-key';
    const logs: string[] = [];
    try {
        const source = new IntervalsExportSource('a1', 1, message => logs.push(message));
        globalThis.fetch = async () => new Response('not JSON: private-response-body test-api-key');
        await assert.rejects(source.getWellness('2026-09-01', '2026-09-20'), error => {
            assert.ok(error instanceof Error);
            assert.match(error.message, /Invalid JSON response/);
            assert.equal(error.message.includes('private-response-body'), false);
            return true;
        });
        assert.match(logs[0], /wellness\?oldest=2026-09-01&newest=2026-09-20/);
        globalThis.fetch = async () => new Response('{"secs":[1,5],"curves":[{"id":"i1","watts":[300,250,200]}]}');
        await assert.rejects(source.getPowerCurves('2026-09-01', '2026-09-20'), /alignment/);
        assert.match(logs[1], /activity-power-curves\?/);
        assert.match(logs[1], /Invalid power-curve alignment/);
        globalThis.fetch = async () => { throw Object.assign(new TypeError('secret-error-content test-api-key'), { cause: { code: 'ECONNRESET' } }); };
        await assert.rejects(source.getAthlete(), /ECONNRESET/);
        assert.match(logs[2], /GET \/api\/v1\/athlete\/a1/);
        globalThis.fetch = async () => { throw new DOMException('secret-error-content', 'TimeoutError'); };
        await assert.rejects(source.getAthlete(), /timed out/);
        assert.equal(logs.length, 4);
        assert.equal(logs.join('\n').includes('secret-error-content'), false);
        assert.equal(logs.join('\n').includes('test-api-key'), false);
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.INTERVALS_API_KEY; else process.env.INTERVALS_API_KEY = originalKey;
    }
});

test('legacy ride and workout failures report the actual request query without inventing a status', async () => {
    const originalFetch = globalThis.fetch, originalKey = process.env.INTERVALS_API_KEY;
    process.env.INTERVALS_API_KEY = 'test-api-key';
    const logs: string[] = [];
    try {
        const source = new IntervalsExportSource('a1', 1, message => logs.push(message));
        // Network failures avoid the unchanged client's own upstream-body logging in this test.
        globalThis.fetch = async () => { throw new Error('private network message'); };
        await assert.rejects(source.getActivities('2026-09-01', '2026-09-20'));
        await assert.rejects(source.getPlannedWorkouts('2026-09-01', '2026-09-20'));
        assert.match(logs[0], /activities\?oldest=2026-09-01 \| attempt 1\/1/);
        assert.match(logs[1], /events\?oldest=2026-09-01&newest=2026-09-20&category=WORKOUT/);
        assert.ok(logs.every(message => message.includes('HTTP status unavailable')));
        assert.equal(logs.join('\n').includes('private network message'), false);
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.INTERVALS_API_KEY; else process.env.INTERVALS_API_KEY = originalKey;
    }
});

test('diagnostics redact configured credentials even when used accidentally as a path identifier', async () => {
    const originalFetch = globalThis.fetch, originalKey = process.env.INTERVALS_API_KEY;
    process.env.INTERVALS_API_KEY = 'test-api-key';
    const logs: string[] = [];
    try {
        const source = new IntervalsExportSource('test-api-key', 1, message => logs.push(message));
        globalThis.fetch = async () => new Response('private-response-body', { status: 403 });
        await assert.rejects(source.getAthlete());
        assert.match(logs[0], /athlete\/\[redacted\]/);
        assert.equal(logs[0].includes('test-api-key'), false);
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.INTERVALS_API_KEY; else process.env.INTERVALS_API_KEY = originalKey;
    }
});
