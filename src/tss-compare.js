"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const training_1 = require("./training");
const target1 = {
    name: "Target Ride 1",
    zone: 2,
    continuousZone: 2,
    continuousWatts: 65,
    totalMinutes: 60,
    calories: 600,
    fatCalories: 300,
    glycogenCalories: 300,
};
const target2 = {
    name: "Target Ride 2",
    zone: 5,
    continuousZone: 2,
    continuousWatts: 65,
    totalMinutes: 60,
    calories: 600,
    fatCalories: 300,
    glycogenCalories: 300,
    intervalZone: 5,
    intervalWatts: 120,
    intervalReps: 5,
    intervalMinutes: 8,
    restMinutes: 3
};
const target3 = { ...target2, totalMinutes: 120 };
const np1 = (0, training_1.computeNormalizedPowerForIntervals)(target1);
const np2 = (0, training_1.computeNormalizedPowerForIntervals)(target2);
const np3 = (0, training_1.computeNormalizedPowerForIntervals)(target3);
const tss1 = (0, training_1.computeTrainingLoad)(target1.totalMinutes / 60, np1, 100);
const tss2 = (0, training_1.computeTrainingLoad)(target2.totalMinutes / 60, np2, 100);
const tss3 = (0, training_1.computeTrainingLoad)(target3.totalMinutes / 60, np3, 100);
const tss4 = tss1 + tss2;
console.log({ np1, tss1, np2, tss2, np3, tss3, tss4 });
