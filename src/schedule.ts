import { keysOf } from "tsc-utils";
import { Activity, Wellness } from "./intervals-transformers";
import { Temporal } from "temporal-polyfill";
import { days } from "./days";
import { computeFatigue, computeFitness, computeRequiredTrainingLoad, computeTargetRides, TargetRide } from "./training";

export type ScheduleId = {
    offset: number;
}

export type ScheduleDate = {
    date: string;
}

export type ScheduleFields = {
    fitness?: number;
    fatigue?: number;
    form?: number;
    trainingLoad?: number;
    minMinutes?: number;
    maxMinutes?: number;
    minZone?: number;
    maxZone?: number;
    needsRide?: boolean;
    rideOptions?: TargetRide[];
    zone?: number;
}

export type ScheduleRecord = ScheduleId & ScheduleDate & ScheduleFields;

export type SchdulePreference = (ScheduleId | ScheduleDate) & ScheduleFields;

export type Schedule = ScheduleRecord[];


export function setSchedule(
    schedule: Schedule,
    preference: SchdulePreference
) {

    const record = 'offset' in preference
        ? schedule.find(x => x.offset === preference.offset)
        : schedule.find(x => x.date === preference.date);

    if (!record) { return; }

    for (const key of keysOf(preference)) {
        if (preference[key] !== undefined) {
            (record[key] as any) = preference[key];
        }
    }
}

export function computeScheduleFromRides(
    rides: Activity[],
    wellness: Wellness[],
    planStartDate: Temporal.PlainDate,
    today: Temporal.PlainDate,
    willRideToday: boolean = true,
    daysBack = 1,
    daysForward = 13
) {
    const schedules: ScheduleRecord[] = [];
    const { getDay } = days(planStartDate);

    const beforeToday = (date: string) => Temporal.PlainDate.from(date).until(today).days > 0;
    const afterToday = (date: string) => today.until(Temporal.PlainDate.from(date)).days < 0;

    // load wellness and ride information into the schedule. 
    for (let i = -daysBack; i <= daysForward; i++) {
        const day = getDay(i);
        const date = day.formatted;
        const ride = rides.find(x => x.date === date);
        const wellnessRecord = wellness.find(x => x.date === date);

        const fitness = wellnessRecord?.fitness ?? ride?.fitness ?? 0;
        const fatigue = wellnessRecord?.fatigue ?? ride?.fatigue ?? 0;
        const form = fitness - fatigue;
        const record: ScheduleRecord = {
            offset: i,
            date: getDay(i).formatted,
            fitness,
            fatigue,
            form,
            trainingLoad: ride?.trainingLoad
        };

        if(ride) {
            record.zone = ride.zone;
        }

        if (beforeToday(date)) {
            if (record.trainingLoad === undefined) {
                record.trainingLoad = 0; // did not ride. 
            }
        }
        else if ((!ride && willRideToday) || afterToday(date)) {
            record.needsRide = true;
            record.form = undefined;
            record.fatigue = undefined;
            record.fitness = undefined;
        }

        schedules.push(record);
    }

    return schedules;
}

/**
 * Compute Training Loads for a schedule of rides.
 * Assumes that the Form values have been filled in for the future rides.
 * @param schedules 
 */
export function computeTrainingLoads(
    schedules: ScheduleRecord[],
    ftp: number,
) {
    let fatigue = schedules[0].fatigue ?? 0;
    let fitness = schedules[0].fitness ?? 0;
    for (let i = 1; i < schedules.length; i++) {
        const record = schedules[i];
        if (record.trainingLoad === undefined) {

            if (!record.form) {
                record.form = 0;
            }

            let tss = computeRequiredTrainingLoad(fitness, fatigue, record.form ?? 0);
            tss = Math.round(tss * 10) / 10; // Round to one decimal place
            if (tss < 10) { tss = 0; }

            if (record.needsRide) {
                const options = computeTargetRides(ftp, tss, record.minMinutes, record.maxMinutes)
                    .filter(o => !record.minZone || o.zone >= record.minZone)
                    .filter(o => !record.maxZone || o.zone <= record.maxZone);

                if (options.length === 0) { tss = 0; }
                record.rideOptions = options;
            }

            record.trainingLoad = tss;
            fatigue = computeFatigue(fatigue, tss);
            fitness = computeFitness(fitness, tss);
            record.fatigue = fatigue;
            record.fitness = fitness;
        }
        else {
            fatigue = record.fatigue ?? computeFatigue(fatigue, 0);
            fitness = record.fitness ?? computeFitness(fitness, 0);
        }
    }

    return schedules;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export function getDayOfWeek(date: string | Temporal.PlainDate) {
    if (typeof date === 'string') {
        date = Temporal.PlainDate.from(date);
    }
    const dayIndex = date.dayOfWeek - 1; // Temporal.PlainDate dayOfWeek is 1-7, we want 0-6
    return daysOfWeek[dayIndex];
}
