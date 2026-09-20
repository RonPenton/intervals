# Training-data export

This local export is designed for an analysis tool to read the activity index, select a few rides, and then open only their detailed files. Google Drive is not a dependency: copy the completed `training-data` directory to a connected folder yourself.

## Commands

Use the existing `INTERVALS_API_KEY` environment variable or `.env.json`. Athlete `0` means the key owner. Run from the repository root with the existing dependencies installed; no new packages are required.

```sh
npm run export
npm run export -- --days 30
npm run export -- --activity i123456
npm run export -- --full
npm run export -- --output ./training-data --athlete 0
npm run export -- --help
npm run check:export
npm run test:export
```

**Windows PowerShell:** use `npm.cmd` in place of `npm`, especially when passing flags. The PowerShell npm shim can consume the `--` separator. For example:

```powershell
npm.cmd run export -- --days 30
npm.cmd run export -- --activity i123456
npm.cmd run export -- --full
npm.cmd run export -- --request-delay-ms 2000
```

The script compiles only the export and its dependencies to `dist/export`, then runs the CLI. This avoids the repository's unrelated existing TypeScript errors. The existing `npm test` script is unchanged; the new tests use Node's built-in test runner, fixtures and mocked HTTP, without real API calls.

## Integration and scope

`src/intervals-api.ts` is unchanged. `source.ts` calls its existing `getRides` and `getPlannedWorkouts` functions and reuses the generated API types, athlete convention and Basic authentication. Companion read methods add athlete profile, historical wellness, activity details with `intervals=true`, and bulk activity power curves. The existing wellness and aggregate power wrappers have fixed history windows, so they cannot serve a history export unchanged.

The export follows the existing ride client's **Ride and VirtualRide** filter. It does not include running, swimming, or separately typed MountainBikeRide/GravelRide activities. Wellness CTL/ATL are the athlete's source values and may reflect other sports too.

`source.ts` retrieves API data, `normalize.ts` builds whitelisted DTOs defined in `schema.ts`, `sync.ts` merges updates, and `target.ts` handles storage. Another destination can implement `ExportTarget` without changing extraction or normalization. There is no database or Google authentication in this feature.

## Files and schemas

```text
training-data/
  manifest.json
  athlete.json
  activity-index.json
  wellness.json
  fitness.json
  power-curves.json
  activities/<source-activity-id>.json
  .sync-state.json
```

Every JSON document has `schemaVersion: 1`. Optional missing/null/non-finite source metrics are omitted; measured zero remains zero. Readers should ignore unknown fields for additive schema evolution. Breaking changes require a version bump and explicit migration or a fresh destination. The explicit TypeScript contracts are in `src/training-export/schema.ts`; runtime checks validate identities, dates, required response shapes and curve alignment.

| File | Shape and purpose |
| --- | --- |
| `manifest.json` | Source, resolved athlete ID, activity count, supported activity types, queried coverage dates and file paths. No changing generation timestamp. |
| `athlete.json` | Athlete ID, timezone, weight, resting HR and per-sport FTP/indoor FTP/threshold and maximum HR settings. This is a current snapshot. |
| `activity-index.json` | `{schemaVersion, activities: [...]}`; one summary per activity, sorted by local date and ID. Includes time, name/type/tags, elapsed/moving duration, distance/elevation, HR/power/cadence, load/intensity, activity FTP/rolling eFTP, calories, interval availability and detail path. |
| `activities/<id>.json` | Identity, recorded intervals, paired planned workout if available, work/energy, single-activity model eFTP, weight, speed/temperature/RPE, source lap count, ignored-sensor flags and time in zones. Summary metrics are not repeated. |
| `wellness.json` | `{schemaVersion, days: [...]}`; date, weight, resting HR, RMSSD/SDNN HRV, sleep duration/score/quality/sleeping HR, fatigue/soreness/stress/mood/motivation/readiness and consumed calories. |
| `fitness.json` | `{schemaVersion, days: [...]}`; date, source CTL/ATL, CTL/ATL loads, ramp rate, sport-specific eFTP and derived absolute form (`CTL - ATL`). |
| `power-curves.json` | `{schemaVersion, durationsSeconds, curves: [...]}`; dated per-activity power-duration samples, source ID and optional weight. |
| `.sync-state.json` | Resolved athlete ID, schema version and range-sync coverage/checkpoint. No credentials or API payloads. Keep locally to continue incremental sync; analysis tools can ignore it. |

Representative index and detail records (optional fields abridged):

```json
{
  "schemaVersion": 1,
  "activities": [{
    "id": "i123", "date": "2026-09-20", "startTimeLocal": "2026-09-20T08:00:00",
    "type": "Ride", "name": "4 x 4 VO2", "movingTimeSeconds": 3600,
    "averagePowerWatts": 210, "intensityPercent": 84, "ftpWatts": 250,
    "tags": ["VO2"], "hasIntervals": true, "detailPath": "activities/i123.json"
  }]
}
```

```json
{
  "schemaVersion": 1, "id": "i123", "powerZoneTimes": [],
  "intervals": [{
    "id": 1, "kind": "work", "startSeconds": 600, "endSeconds": 840,
    "durationSeconds": 240, "averagePowerWatts": 320,
    "averageHeartRateBpm": 170, "averageCadenceRpm": 95, "zone": 5
  }]
}
```

Wellness and fitness examples:

```json
{"schemaVersion":1,"days":[{"date":"2026-09-20","weightKg":70,"hrvRmssdMilliseconds":55,"sleepSeconds":28000}]}
```

```json
{"schemaVersion":1,"days":[{"date":"2026-09-20","ctl":60,"atl":70,"form":-10,"sportEftp":[{"type":"Ride","eftpWatts":260}]}]}
```

## Units and interpretation

- Durations and interval offsets are **seconds**, distances/elevation meters, power watts, energy joules, weight kg, cadence rpm, HR bpm, HRV milliseconds, temperature Celsius and food/exercise energy kcal. Offsets use source `start_time`/`end_time`, never stream sample indexes.
- `startTimeLocal` retains the source ISO local wall time; it usually has no offset. `startTimeUtc`, when supplied, is an independent UTC timestamp. Do not append `Z` to local time. Calendar sync boundaries use the athlete timezone, with UTC fallback.
- `intensityPercent` preserves Intervals percent values: `84` means IF `0.84`. `weightedPowerWatts` maps to `icu_weighted_avg_watts`. `peak1SecondPowerWatts` is the one-second curve sample, not an invented instantaneous maximum. Interval `maxPowerWatts` is the source interval maximum.
- `trainingLoad` is the Intervals load score; it may be power-, HR- or pace-derived and is not universally measured power TSS. CTL/ATL/load/ramp rate retain source score units. `form` is absolute CTL minus ATL, not the optional percentage form display.
- Activity `ftpWatts` is the FTP used for that activity; index `rollingEftpWatts` is `icu_rolling_ftp`. Detail `activityEftpWatts` is the single-activity model estimate `icu_pm_ftp`. Daily eFTP comes from wellness `sportInfo`.
- Subjective wellness ratings, sleep score, readiness and RPE retain source scales; no cross-device standardization is implied. Heart-rate zone-time arrays are in source zone order, from zone 1; power-zone IDs are retained explicitly.
- Source tags are sorted/deduplicated and remain available for classification/search. No VO2/threshold category is guessed from a name or average power. Filter tags/name first, then inspect intervals for a coaching comparison.

Intervals can contain source IDs, labels, work/recovery/unknown kind, start/end/duration/moving time, average/max/weighted power, HR, cadence, distance/elevation, power-zone boundaries, intensity, load, joules and W-prime balance. Missing intervals produce `intervals: []` and `hasIntervals: false`. Lap count is preserved; the bundled API does not expose a distinct raw-lap collection here.

Only exact `paired_event_id` matches link a plan. `plannedWorkout.steps` retains durations, distance, repetitions, nested steps and original power targets (`%ftp`, `w`, `power_zone`, including ramps). It does not assume a one-to-one mapping to recorded intervals or resolve historical percentages against today's FTP. Unknown target units and unrelated workout-document fields are excluded. The [maintainer's workout API guide](https://forum.intervals.icu/t/downloading-planned-workouts-from-the-api/93737) explains the native step structure and optional target resolution.

## Power-duration progression

The durations are **1, 5, 15, 30, 60, 120, 180, 240, 300, 480, 600, 720, 1200, 1800, 3600 seconds**. Each curve has `{id, date, weightKg?, bestWatts}`; `bestWatts[i]` corresponds to `durationsSeconds[i]`. The API can return shorter `watts` arrays when trailing durations are unavailable; those arrays align to the prefix of the response's `secs`. Missing, null or negative source values become `null`, never interpolated power. Thus the 240-second value is position 7. Values are aligned using the response's durations rather than assuming the API echoed the request order. Oversized arrays, duplicate durations and nonnumeric samples are rejected rather than silently misaligned.

For “how has four-minute power changed this year?”, select this year's rows and compare the 240-second values by date, or compute monthly/rolling-window maxima. These are achieved efforts, not modeled physiological capacity. The [maintainer documents the bulk endpoint](https://forum.intervals.icu/t/computed-activity-fields/25673?page=5) with selected durations. It avoids downloading full power streams or a separate curve for every ride.

The bulk power-curve request uses the real athlete ID returned by the profile endpoint. In a live comparison, `/athlete/0/activity-power-curves` returned 403 while the identical query using the resolved athlete ID returned 200. Normal export reuses the profile already fetched at startup; calling `getPowerCurves` directly with athlete `0` resolves and caches the ID first. Explicit athlete IDs are used as supplied, including older numeric IDs without an `i` prefix. No permissions or credentials are changed.

## Incremental sync and recovery

First normal sync and `--full` query history from 2023-01-01 through today. This boundary is a query scope, not a claim that data exists for every date. A first `--days N` intentionally initializes only that recent range; use `--full` later to backfill older history within that scope.

Normal subsequent sync starts six days before the last successful range checkpoint, through today: seven inclusive days when run daily, plus any gap since the last run. It re-fetches detail/intervals even if summary metrics look unchanged, so renamed/reprocessed/re-edited recent rides are replaced. Older details are left alone. Wellness/fitness dates and curves are replaced within scope, not appended blindly. Activities missing from the refreshed list are removed from the index, curves and managed detail directory. Edits, deletions or newly uploaded rides **dated outside the overlap** need `--days`, `--activity`, or `--full`.

`--activity` fetches exactly one activity detail and refreshes daily wellness/plans/curves for that activity's date. It never advances the range checkpoint or removes unrelated rides. A first targeted sync still allows the next normal run to load history. A disconnected `--days` refresh also leaves the older checkpoint in place so a subsequent normal sync does not skip the intervening gap. Historic load edits can affect later fitness; refresh a range through today or rebuild to capture those recalculations.

JSON keys/rows are deterministic, pretty-printed, and existing identical bytes are not rewritten. All API reads finish before publishing changes. Writes use a temporary file in the destination directory, flush, and rename. The checkpoint is written last. This is **atomic per file**, not a transaction across the whole directory: after an interrupted write, rerun the same command to reconcile before copying to Drive. Failed reads leave published data untouched. Interrupted full/initial runs may need to download the range again; partial network results are deliberately not cached as raw API payloads.

Use a dedicated output directory: `activities/*.json` is owned by this exporter, including orphan cleanup after interruptions. An exclusive `.sync.lock` prevents concurrent writers. If a process is killed, confirm no export is running and remove only `<output>/.sync.lock`, then rerun. Stale `.tmp` files are incomplete publication artifacts and may be removed after the process stops; they contain only normalized, credential-checked JSON. Missing aggregate files can be rebuilt with `--full`; malformed state or an unsupported schema should be preserved for diagnosis and exported afresh into a new directory. Reusing a destination for a different athlete is rejected.

API requests use one queue per export source with default spacing defined by `DEFAULT_REQUEST_DELAY_MS` in `throttle.ts` (currently 200 ms; also shown by `--help`). Set `--request-delay-ms 2000` for one request every two seconds; accepted values are integer milliseconds from 1 to 60000. This covers all export endpoints, including the reused ride/planned-workout calls and retries, even if called concurrently. The first request starts immediately; slow requests also block the queue until they finish. This throttle applies to this export process, not other applications or separately running exports.

Supplemental endpoints retry short 429/5xx failures up to three attempts; their backoff extends the shared queue's cooldown. A long `Retry-After` still fails the run for a later retry. Initial multi-year exports can encounter API quotas; the [official API guide](https://forum.intervals.icu/t/api-access-to-intervals-icu/609) describes those limits. Inaccessible/hidden detail responses fail the run instead of silently replacing a ride with empty details. Availability of intervals, plans, sensors and historical curves depends on the upstream data.

## Exclusions and credentials

Failed export requests print a diagnostic to stderr automatically. It includes GET endpoint, safe query parameters (dates, activity ID in the path, curve durations), attempt number, failure reason/HTTP status, elapsed request time and whether a retry is queued. This also identifies timeouts, network errors, invalid JSON and response validation failures. For example:

```text
[Intervals export] GET /api/v1/activity/i123?intervals=true | attempt 1/3 | HTTP 503 | 420 ms; retry queued after 500 ms (throttle also applies)
```

The added diagnostics omit headers, response bodies and arbitrary exception text, and redact the configured API key and Basic-auth encoding. Reused legacy client failures include the endpoint/query but may report `HTTP status unavailable` because that client discards the status. The CLI sets a failing exit status without repeating a diagnostic already printed by the request logger. Logging does not change retry policy or write anything into exported JSON files.

Output uses explicit whitelists, including nested plans and athlete settings. API keys, authorization headers, cookies, tokens, invitation links, email/address/profile images, raw API objects, arbitrary custom fields, descriptions/comments, messages, attachments, GPS routes, device serial numbers, source files and raw second-by-second streams are excluded. A final serialization guard rejects credential-shaped property names and Basic/Bearer values; the CLI also supplies the configured API key and its Basic-auth encoding so those values cannot be exported even inside names/tags/labels. `.sync-state.json` is safe to copy too; the directory still contains personal training and wellness data.

The unchanged legacy wrappers can print upstream HTTP error bodies to stderr on failure. Console output is never persisted by the export; avoid redirecting it into the shared export directory. Supplemental endpoints do not expose response bodies in errors.

If streams become necessary, add a separately requested `streams/<id>.json.gz` representation with explicit sampling times and selected channels. Keep it optional and outside normal activity detail files. No stream requests or stream output are currently implemented.
