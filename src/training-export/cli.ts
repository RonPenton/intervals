import { IntervalsExportSource, LoggedRequestError } from './source';
import { LocalExportTarget } from './target';
import { syncTrainingData, SyncOptions } from './sync';
import { validId } from './normalize';
import { DEFAULT_REQUEST_DELAY_MS, validateRequestDelay } from './throttle';

export const HELP = `Export normalized cycling data to a local directory.

Usage: npm run export -- [--days N | --activity ID | --full] [--output PATH] [--athlete ID] [--request-delay-ms N]

  (no mode)       First run: history since 2023; later runs: last checkpoint with 7-day overlap
  --days N        Refresh N calendar days, including today
  --activity ID   Refresh one activity and wellness/planned/power data for its date
  --full          Rebuild all history, reconciling deleted activities
  --output PATH  Destination (default: ./training-data)
  --athlete ID   Intervals athlete (default: 0, the API key owner)
  --request-delay-ms N  Minimum time between request starts (default: ${DEFAULT_REQUEST_DELAY_MS} ms; range: 1-60000)
  --help         Show this help

Uses the existing INTERVALS_API_KEY environment variable and .env.json configuration.
See docs/training-export.md for schema, scope, units, and recovery instructions.`;

export function parseArgs(args: string[]): { options: SyncOptions; output: string; athleteId: string; requestDelayMs: number; help: boolean } {
    const result = { options: {} as SyncOptions, output: 'training-data', athleteId: '0', requestDelayMs: DEFAULT_REQUEST_DELAY_MS, help: false };
    const seen = new Set<string>();
    for (let i = 0; i < args.length; i++) {
        const flag = args[i];
        if (seen.has(flag)) throw new Error(`Duplicate option: ${flag}`);
        seen.add(flag);
        if (flag === '--help' || flag === '-h') { result.help = true; continue; }
        if (flag === '--full') { result.options.full = true; continue; }
        if (!['--days', '--activity', '--output', '--athlete', '--request-delay-ms'].includes(flag)) throw new Error('Unknown export option; use --help');
        const value = args[++i];
        if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
        if (flag === '--days') {
            if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('--days must be a positive integer');
            result.options.days = Number(value);
        } else if (flag === '--activity') result.options.activity = validId(value);
        else if (flag === '--athlete') result.athleteId = validId(value);
        else if (flag === '--request-delay-ms') {
            if (!/^\d+$/.test(value)) throw new Error('--request-delay-ms must be an integer from 1 to 60000');
            result.requestDelayMs = validateRequestDelay(Number(value));
        }
        else result.output = value;
    }
    if ([result.options.full, result.options.days !== undefined, result.options.activity !== undefined].filter(Boolean).length > 1) {
        throw new Error('Use only one of --days, --activity or --full');
    }
    return result;
}

async function main(): Promise<void> {
    require('dotenv-json2/config');
    const args = parseArgs(process.argv.slice(2));
    if (args.help) { console.log(HELP); return; }
    const key = process.env.INTERVALS_API_KEY;
    if (!key) throw new Error('Set INTERVALS_API_KEY in the environment or existing .env.json');
    const target = new LocalExportTarget(args.output, [key, Buffer.from(`API_KEY:${key}`).toString('base64')]);
    await syncTrainingData(new IntervalsExportSource(args.athleteId, args.requestDelayMs), target, { ...args.options, progress: console.log });
}

export function reportExportFailure(error: unknown): void {
    process.exitCode = 1;
    if (error instanceof LoggedRequestError) return;
    // Avoid printing request objects or stack traces that could expose configuration.
    const message = error instanceof Error ? error.message : 'Unknown export error';
    const key = process.env.INTERVALS_API_KEY;
    console.error(key && message.includes(key) ? 'Export failed; source returned sensitive error text' : message);
}

if (require.main === module) {
    main().catch(reportExportFailure);
}
