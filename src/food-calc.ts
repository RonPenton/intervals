import 'dotenv-json2/config';
import { Temporal } from "temporal-polyfill";
import { getRides } from "./intervals-api";
import { getToday } from "./days";
import { CogganPowerZones } from "./training-definitions";
import { computeRoughCarbBurnedPercentage } from './training';

const seasonStart = new Temporal.PlainDate(getToday().year, 1, 1);
const zone = 2;
const minHours = 2;
const rideSpeedMph = 12;
const rideDistanceMiles = 65;
const rideDurationHours = rideDistanceMiles / rideSpeedMph;
const feedIntervalMinutes = 45;


const foods = {
    gummies: {
        servingCarbGrams: 22,
        unitsPerServing: 9
    },
    bloks: {
        servingCarbGrams: 24,
        unitsPerServing: 3
    }
} as const;

const chosenFood: keyof typeof foods = 'gummies';


async function go() {

    console.log('Fetching rides from Intervals.icu...');
    const rawRides = await getRides(seasonStart);

    const pzone = CogganPowerZones.find(z => z.value === zone)!;

    const seconds = minHours * 60 * 60;
    const rides = rawRides.filter(ride =>
        ride.moving_time >= seconds &&
        ride.icu_intensity >= pzone.minPowerPct &&
        ride.icu_intensity < pzone.maxPowerPct
    ).map(ride => {
        const hours = ride.moving_time / 3600;
        const caloriesPerHour = ride.calories / hours;
        const carbPercentage = computeRoughCarbBurnedPercentage(ride.icu_intensity / 100);
        const carbCaloriesPerHour = caloriesPerHour * carbPercentage;
        const fatCaloriesPerHour = caloriesPerHour - carbCaloriesPerHour;
        const carbGramsPerHour = carbCaloriesPerHour / 4;
        return {
            ...ride,
            hours,
            caloriesPerHour,
            carbCaloriesPerHour,
            fatCaloriesPerHour,
            carbGramsPerHour
        }
    });



    console.log(`Found ${rides.length} rides in zone ${zone} with a minimum duration of ${minHours} hours:`);
    rides.forEach(ride => {
        console.log(`- ${ride.start_date} - ${ride.name} (${ride.hours.toFixed(1)} hours, ${ride.icu_intensity} IF, ${ride.carbCaloriesPerHour.toFixed(0)} carb calories per hour, ${ride.carbGramsPerHour.toFixed(0)} g/hr)`);
    });

    const averageCarbGramsPerHour = rides.reduce((sum, ride) => sum + ride.carbGramsPerHour, 0) / rides.length;
    console.log(`Average carb grams per hour: ${averageCarbGramsPerHour.toFixed(0)}`);

    console.log(`Target ride distance: ${rideDistanceMiles} miles`);
    console.log(`Target ride zone: ${zone}`);
    console.log(`Target ride time: ${rideDurationHours.toFixed(1)} hours`);
    

    const totalCarbs = averageCarbGramsPerHour * rideDurationHours;
    console.log(`Estimated total carbs needed: ${totalCarbs.toFixed(0)} grams`);

    const carbsPerPeriod = feedIntervalMinutes / 60 * averageCarbGramsPerHour;
    console.log(`Estimated carbs needed per feeding period: ${carbsPerPeriod.toFixed(0)} grams`);

    console.log(`Chosen food: ${chosenFood}`);
    const carbsPerUnit = foods[chosenFood].servingCarbGrams / foods[chosenFood].unitsPerServing;
    console.log(`Carbs per unit: ${carbsPerUnit.toFixed(1)} grams`);

    const numberPerPeriod = carbsPerPeriod / carbsPerUnit;
    console.log(`Number of ${chosenFood} per ${feedIntervalMinutes} minutes: ${Math.round(numberPerPeriod)}`);

    const caloriesPerHour = averageCarbGramsPerHour * 4;
    console.log(`Calorie consumption per hour: ${caloriesPerHour.toFixed(0)} calories`);

    const feedsPerRide = rideDurationHours / (feedIntervalMinutes / 60);
    console.log(`Estimated number of feeds for the ride: ${Math.round(feedsPerRide)}`);

    const totalUnitsToPack = Math.round(feedsPerRide) * Math.round(numberPerPeriod);
    console.log(`Total ${chosenFood} to pack: ${totalUnitsToPack.toFixed(0)} (${feedsPerRide.toFixed(0)} x ${numberPerPeriod.toFixed(0)})`);

}

void go();