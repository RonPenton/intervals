"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeClimbingPower = computeClimbingPower;
exports.computeClimbingGrade = computeClimbingGrade;
exports.estimateClimbTimeFromPower = estimateClimbTimeFromPower;
exports.estimateClimbTimeFromPowerCurve = estimateClimbTimeFromPowerCurve;
exports.getMphFromGearInches = getMphFromGearInches;
const training_1 = require("./training");
function computeClimbingPower(hillMiles, elevationFeet, speedMph, totalMassPounds, // rider + bike mass
rollingResistance = 0.005, // good road
dragArea = 0.4, // CdA (m²)
airDensity = 1.225 // kg/m³ at sea level
) {
    const g = 9.81; // gravity (m/s²)
    const hillMeters = hillMiles * 1609.34;
    const elevationMeters = elevationFeet * 0.3048;
    const speedMps = speedMph * 0.44704;
    const timeSeconds = hillMeters / speedMps;
    const totalMassKg = poundsToKg(totalMassPounds);
    // Gravity (climbing) power
    const gravityPower = (totalMassKg * g * elevationMeters) / timeSeconds;
    // Rolling resistance power
    const rollingPower = rollingResistance * totalMassKg * g * speedMps;
    // Air resistance power
    const airPower = 0.5 * dragArea * airDensity * Math.pow(speedMps, 3);
    // Total power
    return gravityPower + rollingPower + airPower;
}
function computeClimbingGrade(speedMph, totalMassPounds, // rider + bike mass
targetPowerWatts, rollingResistance = 0.005, // good road
dragArea = 0.4, // CdA (m²)
airDensity = 1.225 // kg/m³ at sea level
) {
    const g = 9.81; // m/s²
    const v = speedMph * 0.44704; // m/s
    if (v <= 0)
        return NaN;
    const m = poundsToKg(totalMassPounds);
    // Rolling resistance power ~ Crr * N * v; for small grades N ≈ m*g
    const P_roll = rollingResistance * m * g * v;
    // Aerodynamic power
    const P_aero = 0.5 * airDensity * dragArea * v * v * v;
    // Power available to lift against gravity
    const P_grav = targetPowerWatts - P_roll - P_aero;
    // grade (decimal) = P_grav / (m*g*v)
    const gradeDecimal = P_grav / (m * g * v);
    return gradeDecimal * 100; // percent
}
function poundsToKg(pounds) {
    return pounds * 0.45359;
}
function estimateClimbTimeFromPower(hillMiles, elevationFeet, targetPowerWatts, totalMassPounds, rollingResistance = 0.005, dragArea = 0.4, airDensity = 1.225) {
    const g = 9.81;
    const hillMeters = hillMiles * 1609.34;
    const elevationMeters = elevationFeet * 0.3048;
    const totalMassKg = poundsToKg(totalMassPounds);
    // Search for the speed (m/s) that results in the desired power
    let low = 0.1; // min speed m/s
    let high = 20.0; // max speed m/s
    let bestSpeed = 0;
    let epsilon = 0.01;
    for (let i = 0; i < 100; i++) {
        const mid = (low + high) / 2;
        const timeSeconds = hillMeters / mid;
        const gravityPower = (totalMassKg * g * elevationMeters) / timeSeconds;
        const rollingPower = rollingResistance * totalMassKg * g * mid;
        const airPower = 0.5 * dragArea * airDensity * Math.pow(mid, 3);
        const totalPower = gravityPower + rollingPower + airPower;
        if (Math.abs(totalPower - targetPowerWatts) < epsilon) {
            bestSpeed = mid;
            break;
        }
        if (totalPower < targetPowerWatts) {
            low = mid;
        }
        else {
            high = mid;
        }
        bestSpeed = mid;
    }
    return hillMeters / bestSpeed; // return time in seconds
}
function estimateClimbTimeFromPowerCurve(hillMiles, elevationFeet, powerCurve, ftpWatts, totalMassPounds, targetPercentage = 0.95, rollingResistance = 0.005, dragArea = 0.4, airDensity = 1.225) {
    let power = ftpWatts;
    let bound = power / 2;
    while (true) {
        const secondsClimbing = estimateClimbTimeFromPower(hillMiles, elevationFeet, power, totalMassPounds, rollingResistance, dragArea, airDensity);
        const maxPowerAtDuration = (0, training_1.powerAtDurationFromPowerCurve)(secondsClimbing, powerCurve) * targetPercentage;
        const diff = Math.abs(maxPowerAtDuration - power);
        if (diff < 1) {
            return { power, secondsClimbing };
        }
        if (maxPowerAtDuration > power) {
            power += bound;
            bound /= 2;
        }
        else {
            power -= bound;
            bound /= 2;
        }
    }
}
function getMphFromGearInches(rpm, gearInches) {
    return rpm * gearInches * Math.PI / 1056;
}
