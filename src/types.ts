export type PowerZone = {
    name: string;
    value: number;
    minPowerPct: number;
    maxPowerPct: number;
}

export type TargetCategory = {
    name: string;
    zone: number;
    percentFtp: number;
    minMinutesInZone?: number;
    maxMinutesInZone?: number;
    maxMinutesTotal?: number;
    minIntervalRestMinutes?: number;
    continuousZone?: number;
    minIntervalPercentage?: number;
}

export type CurrentIntervalProgression = {
    zone: number;
    progression: IntervalDefinition;
};

export type CurrentIntervalProgressions = CurrentIntervalProgression[];
export type IntervalDefinition = [reps: number, minutes: number];

export type IntervalProgression = {
    zone: number;
    progressions: IntervalDefinition[];
}

export type TargetRideContinuous = {
    name: string;
    zone: number;
    continuousZone: number;
    continuousWatts: number;
    totalMinutes: number;
    calories: number;
    fatCalories: number;
    glycogenCalories: number;
}

export type TargetRideInterval = TargetRideContinuous & {
    intervalZone: number;
    intervalWatts: number;
    intervalReps: number;
    intervalMinutes: number;
    restMinutes: number;            // not total rest minutes, just the rest between intervals.
}

export type TargetRide = TargetRideContinuous | TargetRideInterval;

export type IntervalSimplified = {
    watts: number;
    seconds: number;
}

export type IntervalLength = {
    zone: number;
    minMinutes: number;
    maxMinutes: number;
}

export type IntervalLengths = IntervalLength[];

export type TargetCategoryWithProgression = TargetCategory & Partial<CurrentIntervalProgression>;

export type Athlete = {
    ftp: number;
    intervalProgressions: CurrentIntervalProgressions;
    warmupMinutes: number;
    cooldownMinutes: number;
}

export type Sign = '-' | '+';
export type Delta = `D${Sign}${number}`;

export type TargetValues = {
    date: string;
    userId: string;

    targetForm?: number | "decay" | "maintain" | Delta;
    targetFormPercent?: number | Delta;
    targetTomorrowForm?: number;
    targetTomorrowFormPercent?: number;
    targetFitness?: number | "maintain" | Delta;
    targetFatigue?: number | "maintain" | Delta;
    targetTrainingLoad?: number;
    minMinutes?: number;
    maxMinutes?: number;
    minZone?: number;
    maxZone?: number;
};

export type ScheduleRecord = {
    fitness?: number;
    fatigue?: number;
    form?: number;
    trainingLoad?: number;

    needsRide?: boolean;
    rideOptions?: TargetRide[];
    zone?: number;
} & TargetValues;

export type Schedule = ScheduleRecord[];
