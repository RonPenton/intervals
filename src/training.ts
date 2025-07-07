import { off } from "process";

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
    const c = (-36* fatigueYesterday) / 5;
    return (a + b + c);
}


export type ScheduleRecord = {
    offset: number;
    date: string;
    fitness?: number;
    fatigue?: number;
    form?: number;
    trainingLoad?: number;
}