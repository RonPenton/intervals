import "dotenv-json2/config";
import { writeFileSync } from "fs";
import { Temporal } from "temporal-polyfill";
import { getPlannedWorkouts } from "./intervals-api";

const today = Temporal.Now.plainDateISO();
const nextWeek = today.add({ days: 7 });

async function main() {
    const workouts = await getPlannedWorkouts(today, nextWeek);
    writeFileSync("workouts.json", JSON.stringify(workouts, null, 2));
    console.log(`Wrote ${workouts.length} workouts to workouts.json`);
}

main();
