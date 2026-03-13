"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const estimates_1 = require("./estimates");
const training_definitions_1 = require("./training-definitions");
const bikeWeightPounds = 20;
const riderWeightPounds = 200;
const ftp = 216;
const minRpm = 60; // use 70 if more fit. 
//const gearInches = 23.5; // TI Fighter
const gearInches = 20.7; // Blue Steel III
const maxWatts = training_definitions_1.CogganPowerZones.map(z => ({ zone: z.value, watts: (z.maxPowerPct / 100) * ftp }));
const speed = (0, estimates_1.getMphFromGearInches)(minRpm, gearInches);
console.log(`Speed at ${minRpm} rpm in ${gearInches.toFixed(1)} gear inches: ${speed.toFixed(2)} mph`);
const grades = maxWatts.map(z => {
    if (z.zone == 7)
        return null;
    const grade = (0, estimates_1.computeClimbingGrade)(speed, riderWeightPounds + bikeWeightPounds, z.watts);
    return { ...z, grade };
}).filter(z => z !== null);
for (const grade of grades) {
    console.log(`- Zone ${grade.zone} @${grade.watts.toFixed(0)}W = max ${grade.grade.toFixed(2)}% grade`);
}
