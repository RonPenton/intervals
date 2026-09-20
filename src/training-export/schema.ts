/** Version 1 is additive: readers must ignore unknown fields. Missing metrics mean unknown. */
export const SCHEMA_VERSION = 1 as const;
export const POWER_DURATIONS_SECONDS = [1, 5, 15, 30, 60, 120, 180, 240, 300, 480, 600, 720, 1200, 1800, 3600];

export interface ActivityIndexEntry {
    id: string;
    date: string;
    startTimeLocal: string;
    startTimeUtc?: string;
    type: string;
    name?: string;
    durationSeconds?: number;
    movingTimeSeconds?: number;
    distanceMeters?: number;
    elevationGainMeters?: number;
    averageHeartRateBpm?: number;
    maxHeartRateBpm?: number;
    averagePowerWatts?: number;
    peak1SecondPowerWatts?: number;
    weightedPowerWatts?: number;
    averageCadenceRpm?: number;
    trainingLoad?: number;
    intensityPercent?: number;
    ftpWatts?: number;
    rollingEftpWatts?: number;
    caloriesKcal?: number;
    tags: string[];
    hasIntervals: boolean;
    detailPath: string;
}

export interface ExportInterval {
    id?: number;
    kind: 'work' | 'recovery' | 'unknown';
    label?: string;
    startSeconds?: number;
    endSeconds?: number;
    durationSeconds?: number;
    movingTimeSeconds?: number;
    averagePowerWatts?: number;
    maxPowerWatts?: number;
    weightedPowerWatts?: number;
    averageHeartRateBpm?: number;
    maxHeartRateBpm?: number;
    averageCadenceRpm?: number;
    distanceMeters?: number;
    elevationGainMeters?: number;
    zone?: number;
    zoneMinWatts?: number;
    zoneMaxWatts?: number;
    intensityPercent?: number;
    trainingLoad?: number;
    workJoules?: number;
    wPrimeBalanceStartJoules?: number;
    wPrimeBalanceEndJoules?: number;
}

export interface PlannedStep {
    durationSeconds?: number;
    distanceMeters?: number;
    repetitions?: number;
    powerTarget?: { units: '%ftp' | 'w' | 'power_zone'; value?: number; start?: number; end?: number };
    steps?: PlannedStep[];
}

export interface ActivityDetail {
    schemaVersion: typeof SCHEMA_VERSION;
    id: string;
    intervals: ExportInterval[];
    pairedEventId?: number;
    plannedWorkout?: {
        id: number;
        name?: string;
        durationSeconds?: number;
        trainingLoad?: number;
        ftpWatts?: number;
        steps: PlannedStep[];
    };
    workJoules?: number;
    workAboveFtpJoules?: number;
    activityEftpWatts?: number;
    weightKg?: number;
    averageSpeedMetersPerSecond?: number;
    temperatureCelsius?: number;
    perceivedExertion?: number;
    lapCount?: number;
    powerIgnored?: boolean;
    heartRateIgnored?: boolean;
    powerZoneTimes: { zone: string; durationSeconds: number }[];
    heartRateZoneTimesSeconds?: number[];
}

export interface AthleteExport {
    schemaVersion: typeof SCHEMA_VERSION;
    id: string;
    timezone?: string;
    weightKg?: number;
    restingHeartRateBpm?: number;
    sportSettings: {
        types: string[];
        ftpWatts?: number;
        indoorFtpWatts?: number;
        thresholdHeartRateBpm?: number;
        maxHeartRateBpm?: number;
    }[];
}

export interface WellnessEntry {
    date: string;
    weightKg?: number;
    restingHeartRateBpm?: number;
    hrvRmssdMilliseconds?: number;
    hrvSdnnMilliseconds?: number;
    sleepSeconds?: number;
    sleepScore?: number;
    sleepQuality?: number;
    averageSleepingHeartRateBpm?: number;
    fatigue?: number;
    soreness?: number;
    stress?: number;
    mood?: number;
    motivation?: number;
    readiness?: number;
    caloriesConsumedKcal?: number;
}

export interface FitnessEntry {
    date: string;
    ctl?: number;
    atl?: number;
    form?: number;
    ctlLoad?: number;
    atlLoad?: number;
    rampRate?: number;
    sportEftp: { type: string; eftpWatts: number }[];
}

export interface PowerCurveEntry {
    id: string;
    date: string;
    weightKg?: number;
    /** Aligned to durationsSeconds on the containing document. Null means unavailable. */
    bestWatts: (number | null)[];
}

export interface ActivityIndex { schemaVersion: 1; activities: ActivityIndexEntry[] }
export interface WellnessExport { schemaVersion: 1; days: WellnessEntry[] }
export interface FitnessExport { schemaVersion: 1; days: FitnessEntry[] }
export interface PowerCurvesExport { schemaVersion: 1; durationsSeconds: number[]; curves: PowerCurveEntry[] }

export interface SyncState {
    schemaVersion: 1;
    athleteId: string;
    /** Only range syncs affect this coverage; a targeted activity never advances it. */
    historyStartDate?: string;
    throughDate?: string;
}

export interface Manifest {
    schemaVersion: 1;
    source: 'Intervals.icu';
    athleteId: string;
    activityTypes: string[];
    activityCount: number;
    coverage: { from?: string; through?: string };
    files: { athlete: string; activityIndex: string; wellness: string; fitness: string; powerCurves: string };
}
