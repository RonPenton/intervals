import { ICUActivity } from "./intervals-api";
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
    { name: "Active Recovery", zone: 1, percentFtp: 50, minMinutes: 45, maxMinutes: 70 },
    { name: "Recovery Base Miles", zone: 2, percentFtp: 60, minMinutes: 45, maxMinutes: 90 },
    { name: "Long Ride", zone: 2.5, percentFtp: 73, minMinutes: 120 },
    { name: "Endurance Base Miles", zone: 2.5, percentFtp: 75, minMinutes: 45, maxMinutes: 120 },
    { name: "Tempo", zone: 3, percentFtp: 83, minMinutes: 45, maxMinutes: 180 },
    { name: "Sweet Spot", zone: 3.5, percentFtp: 90, minMinutes: 45, maxMinutes: 150 },
    { name: "Lactate Threshold", zone: 4, percentFtp: 100, minMinutes: 20, maxMinutes: 60 },
    { name: "VO2 Max", zone: 5, percentFtp: 110, minMinutes: 15, maxMinutes: 60 },
] as const;


export function computeTargetRides(
    ftp: number,
    trainingLoadTarget: number,
    minimumRideMinutes = 40,
    maximumRideMinutes = 9999999
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
    return null;
}

