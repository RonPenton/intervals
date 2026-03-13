"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSchedule = setSchedule;
exports.computeScheduleFromRides = computeScheduleFromRides;
exports.computeTrainingLoads = computeTrainingLoads;
exports.getDayOfWeek = getDayOfWeek;
const tsc_utils_1 = require("tsc-utils");
const temporal_polyfill_1 = require("temporal-polyfill");
const days_1 = require("./days");
const training_1 = require("./training");
function setSchedule(schedule, preference) {
    const record = schedule.find(x => x.date === preference.date);
    if (!record) {
        return;
    }
    for (const key of (0, tsc_utils_1.keysOf)(preference)) {
        if (preference[key] !== undefined) {
            record[key] = preference[key];
        }
    }
}
function computeScheduleFromRides(rides, wellness, planStartDate, today, willRideToday = true, daysBack = 1, daysForward = 13) {
    const schedules = [];
    const { getDay } = (0, days_1.days)(planStartDate);
    const beforeToday = (date) => temporal_polyfill_1.Temporal.PlainDate.from(date).until(today).days > 0;
    const afterToday = (date) => today.until(temporal_polyfill_1.Temporal.PlainDate.from(date)).days < 0;
    // load wellness and ride information into the schedule. 
    for (let i = -daysBack; i <= daysForward; i++) {
        const day = getDay(i);
        const date = day.formatted;
        const ride = rides.find(x => x.date === date);
        const wellnessRecord = wellness.find(x => x.date === date);
        const fitness = wellnessRecord?.fitness ?? ride?.fitness ?? 0;
        const fatigue = wellnessRecord?.fatigue ?? ride?.fatigue ?? 0;
        const form = fitness - fatigue;
        const record = {
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
function computeTrainingLoads(schedules, ftp, currentIntervalProgressions) {
    let fatigue = schedules[0].fatigue ?? 0;
    let fitness = schedules[0].fitness ?? 0;
    for (let i = 1; i < schedules.length; i++) {
        const record = schedules[i];
        if (record.trainingLoad === undefined && record.targetTrainingLoad !== undefined) {
            // desired training load is set by the user, calculate the form. 
            record.trainingLoad = record.targetTrainingLoad;
            record.fatigue = (0, training_1.computeFatigue)(fatigue, record.trainingLoad);
            record.fitness = (0, training_1.computeFitness)(fitness, record.trainingLoad);
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
            targetFormPercent = targetFormPercent / 100;
            const tss = Math.round((0, training_1.computeRequiredTrainingLoadFromFormPercentage)(fitness, fatigue, targetFormPercent));
            record.trainingLoad = tss;
            record.fatigue = (0, training_1.computeFatigue)(fatigue, tss);
            record.fitness = (0, training_1.computeFitness)(fitness, tss);
            record.form = record.fitness - record.fatigue;
        }
        else if (record.trainingLoad === undefined && record.targetTomorrowForm !== undefined) {
            let targetTomorrowForm = record.targetTomorrowForm;
            const tss = Math.round((0, training_1.computeRequiredTrainingLoadForNextMorningForm)(fitness, fatigue, targetTomorrowForm));
            record.trainingLoad = tss;
            record.fatigue = (0, training_1.computeFatigue)(fatigue, tss);
            record.fitness = (0, training_1.computeFitness)(fitness, tss);
            record.form = record.fitness - record.fatigue;
        }
        else if (record.trainingLoad === undefined && record.targetFitness !== undefined) {
            let targetFitness = record.targetFitness;
            if (typeof targetFitness === 'string') {
                if (targetFitness === 'maintain') {
                    targetFitness = fitness;
                }
                else {
                    const fitY = schedules[i - 1].fitness ?? 0;
                    const val = Number(targetFitness.substring(1));
                    targetFitness = fitY + val;
                }
            }
            const tss = Math.round((0, training_1.computeRequiredTrainingLoadForTargetFitness)(fitness, targetFitness));
            record.trainingLoad = tss;
            record.fatigue = (0, training_1.computeFatigue)(fatigue, tss);
            record.fitness = (0, training_1.computeFitness)(fitness, tss);
            record.form = record.fitness - record.fatigue;
        }
        else if (record.trainingLoad === undefined && record.targetFatigue !== undefined) {
            let targetFatigue = record.targetFatigue;
            if (typeof targetFatigue === 'string') {
                if (targetFatigue === 'maintain') {
                    targetFatigue = fatigue;
                }
                else {
                    const fatY = schedules[i - 1].fatigue ?? 0;
                    const val = Number(targetFatigue.substring(1));
                    targetFatigue = fatY + val;
                }
            }
            const tss = Math.round((0, training_1.computeRequiredTrainingLoadForTargetFatigue)(fatigue, targetFatigue));
            record.trainingLoad = tss;
            record.fatigue = (0, training_1.computeFatigue)(fatigue, tss);
            record.fitness = (0, training_1.computeFitness)(fitness, tss);
            record.form = record.fitness - record.fatigue;
        }
        else if (record.trainingLoad === undefined && record.targetTomorrowFormPercent !== undefined) {
            let targetTomorrowFormPercent = record.targetTomorrowFormPercent;
            const tss = Math.round((0, training_1.computeRequiredTrainingLoadForNextMorningFormPercentage)(fitness, fatigue, targetTomorrowFormPercent));
            record.trainingLoad = tss;
            record.fatigue = (0, training_1.computeFatigue)(fatigue, tss);
            record.fitness = (0, training_1.computeFitness)(fitness, tss);
            record.form = record.fitness - record.fatigue;
        }
        else if (record.form === undefined && record.targetForm !== undefined) {
            // desired form is set by the user, calculate the training load.
            if (record.targetForm === 'maintain') {
                record.form = schedules[i - 1].form ?? 0;
            }
            else if (record.targetForm === 'decay') {
                record.trainingLoad = 0;
                record.fitness = (0, training_1.computeFitness)(fitness, 0);
                record.fatigue = (0, training_1.computeFatigue)(fatigue, 0);
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
                tss = (0, training_1.computeRequiredTrainingLoad)(fitness, fatigue, record.form ?? 0);
                tss = Math.round(tss * 10) / 10; // Round to one decimal place
                if (tss < 10) {
                    console.log(`Warning: Training load for ${record.date} is less than 10 TSS. Setting to 0.`);
                    tss = 0;
                }
            }
            tss = tss ?? 0;
            const options = (0, training_1.computeTargetRides)(ftp, tss, record.minMinutes ?? 20, record.maxMinutes ?? 9999999, currentIntervalProgressions)
                .filter(o => !record.minZone || o.zone >= record.minZone)
                .filter(o => !record.maxZone || o.zone <= record.maxZone);
            if (options.length === 0) {
                tss = 0;
            }
            record.rideOptions = options;
            record.trainingLoad = tss;
            record.fatigue = (0, training_1.computeFatigue)(fatigue, tss);
            record.fitness = (0, training_1.computeFitness)(fitness, tss);
        }
        if (record.trainingLoad !== undefined) {
            fatigue = record.fatigue ?? (0, training_1.computeFatigue)(fatigue, record.trainingLoad);
            fitness = record.fitness ?? (0, training_1.computeFitness)(fitness, record.trainingLoad);
        }
    }
    return schedules;
}
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
function getDayOfWeek(date) {
    if (typeof date === 'string') {
        date = temporal_polyfill_1.Temporal.PlainDate.from(date);
    }
    const dayIndex = date.dayOfWeek - 1; // Temporal.PlainDate dayOfWeek is 1-7, we want 0-6
    return daysOfWeek[dayIndex];
}
