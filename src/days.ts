import { Temporal } from 'temporal-polyfill'

export const getPastDays = (currentDate: Temporal.PlainDate, startDate: Temporal.PlainDate) => {
    const pastDays: Temporal.PlainDate[] = [];
    const daysDifference = startDate.until(currentDate).days;
    for (let i = daysDifference; i <= 0; i++) {
        pastDays.push(currentDate.add(Temporal.Duration.from({ days: i })));
    }

    return pastDays.map(x => x.toString());
}

export const getMonday = (date: Temporal.PlainDate) => {
    const day = date.dayOfWeek;
    const diff = -day + 1;
    return date.add(new Temporal.Duration(0, 0, 0, diff));
};

export const days = (startDate: Temporal.PlainDate) => {
    return {
        getDay: (offset: number) => {
            const newDate = startDate.add(new Temporal.Duration(0, 0, 0, offset));
            return {
                formatted: newDate.toString(),
                date: newDate,
            }
        },
        offset: (day: Temporal.PlainDate | string) => {
            if(typeof day === 'string') {
                day = Temporal.PlainDate.from(day);
            }
            const diff = startDate.until(day);
            return diff.days;
        }
    }
}

export function getToday() {
    return Temporal.Now.plainDateISO();
}

export function addDays(date: Temporal.PlainDate, days: number) {
    return date.add(new Temporal.Duration(0, 0, 0, days));
}


export function lessThan(date1: Temporal.PlainDate, date2: Temporal.PlainDate) {
    return date1.until(date2).days > 0;
}

export function moreThan(date1: Temporal.PlainDate, date2: Temporal.PlainDate) {
    return date1.until(date2).days < 0;
}

export function lessThanEqual(date1: Temporal.PlainDate, date2: Temporal.PlainDate) {
    return date1.until(date2).days >= 0;
}

export function moreThanEqual(date1: Temporal.PlainDate, date2: Temporal.PlainDate) {
    return date1.until(date2).days <= 0;
}