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
const buffer = 1.0;


const foods = {
    gummies: {
        servingCarbGrams: 22,
        unitsPerServing: 9,
        gramsPerServing: 32,
        gramsPerContainer: 2268,
        pricePerContainer: 21.20
    },
    bloks: {
        servingCarbGrams: 24,
        unitsPerServing: 3,
        gramsPerServing: 30,
        gramsPerContainer: 1080,
        pricePerContainer: 47.24
    },
    fruitGems: {
        servingCarbGrams: 23,
        unitsPerServing: 2,
        gramsPerServing: 27,
        gramsPerContainer: 2268,
        pricePerContainer: 26.99
    },
    nutsdotcomFruitGems: {
        servingCarbGrams: 34,
        unitsPerServing: 2.65,
        gramsPerServing: 40,
        gramsPerContainer: 2268,
        pricePerContainer: 31.48
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
        const date = ride.start_date_local.split('T')[0];
        return {
            ...ride,
            date,
            hours,
            caloriesPerHour,
            carbCaloriesPerHour,
            fatCaloriesPerHour,
            carbGramsPerHour,
            carbPercentage
        }
    });

    const m = (meters: number) => (meters / 1609.34).toFixed(0);

    console.log(`Found ${rides.length} rides in zone ${zone} with a minimum duration of ${minHours} hours:`);
    rides.forEach(ride => {
        console.log(`- ${ride.date}, ${m(ride.distance)} miles, ${ride.hours.toFixed(1)} hours, ${ride.icu_intensity} IF, ${ride.calories} calories, ~${(ride.carbPercentage * 100).toFixed(1)}% calories from carbs, ${ride.carbCaloriesPerHour.toFixed(0)} carb cals per hour, ${ride.carbGramsPerHour.toFixed(0)} g/hr`);
    });

    const averageCarbGramsPerHour = rides.reduce((sum, ride) => sum + ride.carbGramsPerHour, 0) / rides.length;
    console.log(`Average carb grams per hour: ${averageCarbGramsPerHour.toFixed(0)}`);

    const adjustedCarbGramsPerHour = averageCarbGramsPerHour * buffer;
    console.log(`Adjusted carb grams per hour (with ${((buffer - 1) * 100).toFixed(0)}% buffer): ${adjustedCarbGramsPerHour.toFixed(0)}`);

    console.log(`Target ride distance: ${rideDistanceMiles} miles`);
    console.log(`Target ride zone: ${zone}`);
    console.log(`Target ride time: ${rideDurationHours.toFixed(1)} hours`);

    const totalCarbs = adjustedCarbGramsPerHour * rideDurationHours;
    console.log(`Estimated total carbs needed: ${totalCarbs.toFixed(0)} grams`);

    const carbsPerPeriod = feedIntervalMinutes / 60 * adjustedCarbGramsPerHour;
    const totalCarbCalories = totalCarbs * 4;
    console.log(`Estimated total calories burned from Glycogen: ${totalCarbCalories.toFixed(0)} calories`);

    console.log(`Estimated carbs needed per feeding period: ${carbsPerPeriod.toFixed(0)} grams`);

    console.log(`Chosen food: ${chosenFood}`);
    const carbsPerUnit = foods[chosenFood].servingCarbGrams / foods[chosenFood].unitsPerServing;
    console.log(`Carbs per unit: ${carbsPerUnit.toFixed(1)} grams`);

    const numberPerPeriod = Math.round(carbsPerPeriod / carbsPerUnit);
    console.log(`Number of ${chosenFood} per ${feedIntervalMinutes} minutes: ${numberPerPeriod}`);

    const servingsPerPeriod = carbsPerPeriod / foods[chosenFood].servingCarbGrams;
    const gramsPerPeriod = servingsPerPeriod * foods[chosenFood].gramsPerServing;
    console.log(`Servings of ${chosenFood} per ${feedIntervalMinutes} minutes: ${servingsPerPeriod.toFixed(1)} (${gramsPerPeriod.toFixed(0)} grams)`);

    const caloriesPerHour = adjustedCarbGramsPerHour * 4;
    console.log(`Calorie consumption per hour: ${caloriesPerHour.toFixed(0)} calories`);

    const feedsPerRide = Math.floor(rideDurationHours / (feedIntervalMinutes / 60));
    console.log(`Estimated number of feeds for the ride: ${feedsPerRide}`);

    const totalUnitsToPack = feedsPerRide * numberPerPeriod;
    console.log(`Total ${chosenFood} to pack: ${totalUnitsToPack.toFixed(0)} (${feedsPerRide} x ${numberPerPeriod})`);

    const servingsPerContainer = foods[chosenFood].gramsPerContainer / foods[chosenFood].gramsPerServing;
    console.log(`Servings per container: ${servingsPerContainer.toFixed(1)}`);

    const costPerServing = foods[chosenFood].pricePerContainer / servingsPerContainer;
    console.log(`Cost per serving: $${costPerServing.toFixed(2)}`);

    const costOfRide = servingsPerPeriod * feedsPerRide * costPerServing;
    console.log(`Estimated cost of food for the ride: $${costOfRide.toFixed(2)}`);
}

void go();