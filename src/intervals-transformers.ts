import { ICUActivity } from "./intervals-api";

export function pruneActivityFields(record: ICUActivity) {
    const {
        icu_rolling_ftp,
        icu_training_load,
        icu_joules,
        icu_weighted_avg_watts,
        distance,
        moving_time,
        total_elevation_gain,
        average_speed,
        calories,
        average_temp,
        start_date_local,
        icu_intensity,
        // icu_atl,
        // icu_ctl
    } = record;

    const hours = Math.floor(moving_time / 3600);
    const minutes = String(Math.floor((moving_time % 3600) / 60)).padStart(2, '0');
    const seconds = String(moving_time % 60).padStart(2, '0');
    const formattedMovingTime = `${hours}h ${minutes}m ${seconds}s`;

    const metersToMiles = (meters: number) => (meters / 1609.34).toFixed(0);
    const metersToFeet = (meters: number) => (meters * 3.28084).toFixed(0);
    const mpsToMph = (metersPerSecond: number) => (metersPerSecond * 2.23694).toFixed(1);
    const celsiusToFahrenheit = (celsius: number) => ((celsius * 9 / 5) + 32).toFixed(0);

    return {
        currentFtp: icu_rolling_ftp,
        trainingLoad: icu_training_load,
        kj: Number((icu_joules / 1000).toFixed(0)),
        normalizedWatts: icu_weighted_avg_watts,
        miles: Number(metersToMiles(distance)),
        duration: formattedMovingTime,
        elevation: metersToFeet(total_elevation_gain) + 'ft',
        mph: Number(mpsToMph(average_speed)),
        calories,
        temperature: celsiusToFahrenheit(average_temp) + 'F',
        date: start_date_local.split('T')[0],
        intensityFactor: Number(icu_intensity.toFixed(0)),
        // fatigue: Number(icu_atl.toFixed(0)),
        // fitness: Number(icu_ctl.toFixed(0))
    };
}
