import 'dotenv-json2/config';
import { estimateClimbTimeFromPower, estimateClimbTimeFromPowerCurve } from "./estimates";
import { getPowerCurve } from "./intervals-api";

const bikeWeightPounds = 20;
const riderWeightPounds = 400;


const hillMiles = 0.6;
const elevationFeet = 82;
const speedMph = 5.3;
const ftp = 212;
//const power = 168;

async function go() {

    const curve = await getPowerCurve();

    const percentOfCapacity = 1.0;
    const { power, secondsClimbing } = estimateClimbTimeFromPowerCurve(
        hillMiles,
        elevationFeet,
        curve,
        ftp,
        bikeWeightPounds + riderWeightPounds,
        percentOfCapacity
    );
    const time2 = `${Math.floor(secondsClimbing / 60)}:${String(Math.round(secondsClimbing % 60)).padStart(2, '0')}`;
    console.log(`Estimated climb time at ${power.toFixed(2)} W: ${time2} (${(Math.round(percentOfCapacity * 100))}% of Capacity)`);
    const mph = hillMiles / (secondsClimbing / 3600);
    console.log(`Estimated speed at ${power.toFixed(2)} W: ${mph.toFixed(2)} mph`);


    // const power = computeClimbingPower(
    //     hillMiles,
    //     elevationFeet,
    //     speedMph,
    //     bikeWeightPounds + riderWeightPounds
    // );
    // console.log(`Climbing power required: ${power.toFixed(2)} W`);

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