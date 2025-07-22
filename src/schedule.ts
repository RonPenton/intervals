import { keysOf } from "tsc-utils";
import { Activity, Wellness } from "./intervals-transformers";
import { Temporal } from "temporal-polyfill";
import { days } from "./days";
import { computeFatigue, computeFitness, computeRequiredTrainingLoad, computeRequiredTrainingLoadFromFormPercentage, computeTargetRides, TargetRide } from "./training";

export type ScheduleId = {
    offset: number;
}

export type ScheduleDate = {
    date: string;
}

export type Sign = '-' | '+';
export type Delta = `D${Sign}${number}`;


export type ScheduleFields = {
    fitness?: number;
    fatigue?: number;
    form?: number;
    trainingLoad?: number;

    targetForm?: number | 'decay' | 'maintain' | Delta;
    targetFormPercent?: number | Delta;
    targetTrainingLoad?: number;
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

        if (ride) {
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
            record.trainingLoad = undefined;
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

        if (record.trainingLoad === undefined && record.targetTrainingLoad !== undefined) {
            // desired training load is set by the user, calculate the form. 
            record.trainingLoad = record.targetTrainingLoad;
            record.fatigue = computeFatigue(fatigue, record.trainingLoad);
            record.fitness = computeFitness(fitness, record.trainingLoad);
            record.form = record.fitness - record.fatigue;
        }
        else if (record.trainingLoad === undefined && record.targetFormPercent !== undefined) {
            let targetFormPercent = record.targetFormPercent;
            if (typeof targetFormPercent === 'string') {
                const formY = schedules[i - 1].form ?? 0;
                const fitY = schedules[i - 1].fitness ?? 0;
                const percentY = (formY / fitY);
                const val = Number(targetFormPercent.substring(1));
                targetFormPercent = (percentY + val);
            }

            const tss = Math.round(computeRequiredTrainingLoadFromFormPercentage(fitness, fatigue, targetFormPercent));
            record.trainingLoad = tss;
            record.fatigue = computeFatigue(fatigue, tss);
            record.fitness = computeFitness(fitness, tss);
            record.form = record.fitness - record.fatigue;
        }
        else if (record.form === undefined && record.targetForm !== undefined) {
            // desired form is set by the user, calculate the training load.
            if (record.targetForm === 'maintain') {
                record.form = schedules[i - 1].form ?? 0;
            }
            else if (record.targetForm === 'decay') {
                record.trainingLoad = 0;
                record.fitness = computeFitness(fitness, 0);
                record.fatigue = computeFatigue(fatigue, 0);
                record.form = record.fitness - record.fatigue;
            }
            else if (typeof record.targetForm === 'string') {
                record.form = (schedules[i - 1].form ?? 0) + Number(record.targetForm.substring(1));
            }
            else {
                record.form = record.targetForm;
            }
        }

        if (record.needsRide) {
            let tss = record.trainingLoad;
            if (tss === undefined && record.form !== undefined) {
                tss = computeRequiredTrainingLoad(fitness, fatigue, record.form ?? 0);
                tss = Math.round(tss * 10) / 10; // Round to one decimal place
                if (tss < 10) {
                    console.log(`Warning: Training load for ${record.date} is less than 10 TSS. Setting to 0.`);
                    tss = 0;
                }
            }

            tss = tss ?? 0;

            const options = computeTargetRides(ftp, tss, record.minMinutes ?? 20, record.maxMinutes ?? 9999999)
                .filter(o => !record.minZone || o.zone >= record.minZone)
                .filter(o => !record.maxZone || o.zone <= record.maxZone);

            if (options.length === 0) { tss = 0; }
            record.rideOptions = options;

            record.trainingLoad = tss;
            record.fatigue = computeFatigue(fatigue, tss);
            record.fitness = computeFitness(fitness, tss);
        }

        if (record.trainingLoad !== undefined) {
            fatigue = record.fatigue ?? computeFatigue(fatigue, record.trainingLoad);
            fitness = record.fitness ?? computeFitness(fitness, record.trainingLoad);
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
