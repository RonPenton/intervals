import { Activity } from "./intervals-transformers";

export function computeFitness(
    fitnessYesterday: number,
    trainingLoad: number
) {
    return fitnessYesterday + (trainingLoad - fitnessYesterday) / 42;
}

export function computeFatigue(
    fatigueYesterday: number,
    trainingLoad: number
) {
    return fatigueYesterday + (trainingLoad - fatigueYesterday) / 7;
}

export function computeRequiredTrainingLoad(
    fitnessYesterday: number,
    fatigueYesterday: number,
    targetForm: number
) {
    const a = (-42 * targetForm) / 5;
    const b = (41 * fitnessYesterday) / 5;
    const c = (-36 * fatigueYesterday) / 5;
    return (a + b + c);
}

export function computeTrainingLoadForRide(
    ride: Activity,
    ftp: number
) {
    const { hours, normalizedWatts } = ride;
    return computeTrainingLoad(hours, normalizedWatts, ftp);
}

export function computeTrainingLoad(
    hours: number,
    normalizedWatts: number,
    ftp: number
) {
    const pow2 = Math.pow(normalizedWatts, 2);
    const ftp2 = Math.pow(ftp, 2);
    const tss = ((hours * pow2) / ftp2) * 100;
    return Math.round(tss * 10) / 10; // Round to one decimal place
}

export const calculateCogganPowerZones = (ftp: number) => {
    return {
        zone_1_active_recovery: [0, 0.55 * ftp],
        zone_2_endurance: [0.55 * ftp, 0.75 * ftp],
        zone_3_tempo: [0.75 * ftp, 0.90 * ftp],
        zone_4_lactate_threshold: [0.90 * ftp, 1.05 * ftp],
        zone_5_vo2_max: [1.05 * ftp, 1.20 * ftp],
        zone_6_anaerobic_capacity: [1.20 * ftp, 1.50 * ftp],
        zone_7_neuromuscular_power: [1.50 * ftp, Infinity]
    } as const;
}

export type TargetCategory = {
    name: string;
    zone: number;
    percentFtp: number;
    minMinutes?: number,
    maxMinutes?: number
}

export type TargetRide = TargetCategory & {
    minutes: number;
    power: number;
}

export const targetCategories = [
    { name: "Recovery", zone: 1, percentFtp: 50, minMinutes: 20, maxMinutes: 60 },
    { name: "Base", zone: 2, percentFtp: 60, minMinutes: 35, maxMinutes: 100 },
    { name: "Long Ride", zone: 2.5, percentFtp: 70, minMinutes: 120 },
    { name: "Endurance Base", zone: 2.5, percentFtp: 74, minMinutes: 40, maxMinutes: 120 },
    { name: "Tempo", zone: 3, percentFtp: 83, minMinutes: 45, maxMinutes: 150 },
    { name: "Sweet Spot", zone: 3.5, percentFtp: 90, minMinutes: 45, maxMinutes: 120 },
    { name: "Threshold", zone: 4, percentFtp: 100, minMinutes: 20, maxMinutes: 60 },
    { name: "VO2 Max", zone: 5, percentFtp: 110, minMinutes: 15, maxMinutes: 60 },
] as const;


export function computeTrainingLoadRanges(
    targetCategories: readonly TargetCategory[],
    ftp: number
) {
    const ranges: { [key: string]: [number, number] } = {};
    for (const category of targetCategories) {
        let low = 0;
        if (category.minMinutes !== undefined) {
            low = computeTrainingLoad(category.minMinutes / 60, category.percentFtp / 100 * ftp, ftp);
        }
        let high = Infinity;
        if (category.maxMinutes !== undefined) {
            high = computeTrainingLoad(category.maxMinutes / 60, category.percentFtp / 100 * ftp, ftp);
        }
        ranges[category.name] = [low, high];
    }
    return ranges;
}


export function computeTargetRides(
    ftp: number,
    trainingLoadTarget: number,
    minimumRideMinutes: number,
    maximumRideMinutes: number
) {
    const fn = (category: TargetCategory) => calculateHoursForTargetRide(category, trainingLoadTarget, ftp);
    const rides = targetCategories
        .map(fn)
        .filter(ride => ride !== null)
        .filter(ride => ride.minutes >= minimumRideMinutes && ride.minutes <= maximumRideMinutes);
    return rides;
}

function calculateHoursForTargetRide(
    category: TargetCategory,
    trainingLoadTarget: number,
    ftp: number
): TargetRide | null {
    const np = category.percentFtp / 100 * ftp;
    const np2 = Math.pow(np, 2);
    const ftp2 = Math.pow(ftp, 2);
    const hours = ((trainingLoadTarget / 100) * ftp2) / np2;

    const minutes = Math.round(hours * 60);
    if (category.minMinutes && minutes < category.minMinutes) {
        return null; // Not enough time for this ride
    }
    if (category.maxMinutes && minutes > category.maxMinutes) {
        return null; // Too much time for this ride
    }

    return {
        ...category,
        minutes: Math.round(hours * 60),
        power: Math.round(np)
    };
}


type Zones = ReturnType<typeof calculateCogganPowerZones>;

export const zonesToStrings = (zones: Zones) => {
    return Object.fromEntries(Object.entries(zones).map(([key, [min, max]]) => {
        if (max === Infinity) {
            return [key, `${min.toFixed(0)}+ W`] as const;
        }
        return [key, `${min.toFixed(0)}-${max.toFixed(0)} W`] as const;
    }));
}

export const getZoneForPower = (power: number, zones: Zones) => {
    for (const [zone, [min, max]] of Object.entries(zones)) {
        if (power >= min && power < max) {
            return zone.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        }
    }
    throw new Error(`Power ${power} W does not fit in any zone.`);
}

export const getZoneNumberForPower = (power: number, zones: Zones) => {
    let i = 1;
    for (const [zone, [min, max]] of Object.entries(zones)) {
        if (power >= min && power < max) {
            return i;
        }
        i++;
    }
    throw new Error(`Power ${power} W does not fit in any zone.`);
}

export const getZoneForRide = (ftp: number, np: number): number => {
    const zones = calculateCogganPowerZones(ftp);
    return getZoneNumberForPower(np, zones);
}

export function powerAtDurationPowerLaw(
    tSec: number,
    ftp: number,
    t0Sec = 3600,  // reference: 1 hour
    k = 0.07       // decay exponent
): number {
    if (tSec <= 0) return Infinity;
    return ftp * Math.pow(tSec / t0Sec, -k);
}


const cogganTable: [number, number][] = [
    [5, 2.50],
    [60, 1.75],
    [300, 1.20],
    [1200, 1.00],
    [3600, 0.95],
    [7200, 0.85],
    [18000, 0.70],
];

/**
 * Estimate sustainable power at a given duration based on FTP using 로그 interpolation.
 * @param tSec Time in seconds
 * @param ftp Functional Threshold Power
 */
export function powerAtDurationCoggan(tSec: number, ftp: number): number {
    if (tSec <= 0) return ftp;
    const table = cogganTable;
    const t = tSec;

    // If out of table range, extrapolate with end slopes
    if (t <= table[0][0]) {
        const [t0, p0] = table[0];
        return ftp * (p0 / (t0 ** 0));
    }
    if (t >= table[table.length - 1][0]) {
        const [tn, pn] = table[table.length - 1];
        return ftp * pn;
    }

    // Find surrounding points
    let i = 0;
    while (t > table[i + 1][0]) i++;
    const [t1, p1] = table[i];
    const [t2, p2] = table[i + 1];
    const ratio = (Math.log(t) - Math.log(t1)) / (Math.log(t2) - Math.log(t1));
    const pct = p1 + (p2 - p1) * ratio;
    return pct * ftp;
}

export function powerAtDurationFromPowerCurve(
    tSec: number,
    powerCurve: { secs: number[], values: number[] }
) {
    if (tSec <= 0) {
        throw new Error('Time must be greater than 0 seconds');
    }

    const t = tSec;

    if (t <= powerCurve.secs[0]) {
        const p0 = powerCurve.values[0];
        return p0;
    }
    if (t >= powerCurve.secs[powerCurve.secs.length - 1]) {
        const pN = powerCurve.values[powerCurve.values.length - 1];
        return pN;
    }

    // Find surrounding points
    let i = 0;
    while (t > powerCurve.secs[i + 1]) i++;
    const t1 = powerCurve.secs[i];
    const p1 = powerCurve.values[i];
    const t2 = powerCurve.secs[i + 1];
    const p2 = powerCurve.values[i + 1];

    const diff1 = Math.abs(t - t1);
    const diff2 = Math.abs(t - t2);
    if (diff1 < diff2) {
        return p1;
    }
    return p2;
}