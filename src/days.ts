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
    console.log('Start date:', startDate);
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
            console.log('Diff:', diff.days);

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
