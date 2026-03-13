"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv-json2/config");
const estimates_1 = require("./estimates");
const intervals_api_1 = require("./intervals-api");
const bikeWeightPounds = 20;
const riderWeightPounds = 400;
const hillMiles = 1;
const elevationFeet = 634;
const speedMph = 5.3;
const ftp = 212;
//const power = 168;
async function go() {
    const curve = await (0, intervals_api_1.getPowerCurve)();
    const percentOfCapacity = 1.0;
    const { power, secondsClimbing } = (0, estimates_1.estimateClimbTimeFromPowerCurve)(hillMiles, elevationFeet, curve, ftp, bikeWeightPounds + riderWeightPounds, percentOfCapacity);
    console.log(`Hill length: ${hillMiles} miles, elevation gain: ${elevationFeet} feet`);
    const time2 = `${Math.floor(secondsClimbing / 60)}:${String(Math.round(secondsClimbing % 60)).padStart(2, '0')}`;
    console.log(`Estimated climb time at ${power.toFixed(2)} W: ${time2} (${(Math.round(percentOfCapacity * 100))}% of Capacity)`);
    const mph = hillMiles / (secondsClimbing / 3600);
    console.log(`Estimated speed at ${power.toFixed(2)} W: ${mph.toFixed(2)} mph`);
    const kph = 9;
    const mph2 = kph / 1.60934;
    const power2 = (0, estimates_1.computeClimbingPower)(hillMiles, elevationFeet, mph2, 415);
    console.log(`Climbing power required: ${power2.toFixed(2)} W`);
    // const estPower = 170;
    // const seconds = estimateClimbTimeFromPower(
    //     hillMiles,
    //     elevationFeet,
    //     estPower,
    //     bikeWeightPounds + riderWeightPounds
    // );
    // const time = `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
    // console.log(`Estimated climb time at ${estPower.toFixed(2)} W: ${time}`);
}
void go();
