"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.days = exports.getMonday = exports.getPastDays = void 0;
exports.getToday = getToday;
exports.addDays = addDays;
exports.lessThan = lessThan;
exports.moreThan = moreThan;
exports.lessThanEqual = lessThanEqual;
exports.moreThanEqual = moreThanEqual;
const temporal_polyfill_1 = require("temporal-polyfill");
const getPastDays = (currentDate, startDate) => {
    const pastDays = [];
    const daysDifference = startDate.until(currentDate).days;
    for (let i = daysDifference; i <= 0; i++) {
        pastDays.push(currentDate.add(temporal_polyfill_1.Temporal.Duration.from({ days: i })));
    }
    return pastDays.map(x => x.toString());
};
exports.getPastDays = getPastDays;
const getMonday = (date) => {
    const day = date.dayOfWeek;
    const diff = -day + 1;
    return date.add(new temporal_polyfill_1.Temporal.Duration(0, 0, 0, diff));
};
exports.getMonday = getMonday;
const days = (startDate) => {
    return {
        getDay: (offset) => {
            const newDate = startDate.add(new temporal_polyfill_1.Temporal.Duration(0, 0, 0, offset));
            return {
                formatted: newDate.toString(),
                date: newDate,
            };
        },
        offset: (day) => {
            if (typeof day === 'string') {
                day = temporal_polyfill_1.Temporal.PlainDate.from(day);
            }
            const diff = startDate.until(day);
            return diff.days;
        }
    };
};
exports.days = days;
function getToday() {
    return temporal_polyfill_1.Temporal.Now.plainDateISO();
}
function addDays(date, days) {
    return date.add(new temporal_polyfill_1.Temporal.Duration(0, 0, 0, days));
}
function lessThan(date1, date2) {
    return date1.until(date2).days > 0;
}
function moreThan(date1, date2) {
    return date1.until(date2).days < 0;
}
function lessThanEqual(date1, date2) {
    return date1.until(date2).days >= 0;
}
function moreThanEqual(date1, date2) {
    return date1.until(date2).days <= 0;
}
