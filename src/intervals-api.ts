import { Temporal } from 'temporal-polyfill';
import { type paths, type components } from './intervals-api-schema';


const getQueryString = (query: Record<string, any>) => {
    const queryString = new URLSearchParams(query).toString();
    return queryString ? `?${queryString}` : '';
}

export type ICUActivity = Required<paths['/api/v1/athlete/{id}/activities']['get']['responses']['200']['content']['*/*'][number]>;
export type ICUWellness = Required<paths['/api/v1/athlete/{id}/wellness{ext}']['get']['responses']['200']['content']['*/*'][number]>;
export type ICUPowerCurve = Required<components["schemas"]["DataCurve"]>;

export async function getRides(
    oldest: Temporal.PlainDate,
    athleteId = '0'
) {
    const path = '/api/v1/athlete/{id}/activities';

    type Get = paths[typeof path]['get'];
    type Query = Get['parameters']['query'];

    const query: Query = {
        oldest: oldest.toString()
    }


    const queryString = getQueryString(query);
    const url = `https://intervals.icu${path.replace('{id}', athleteId)}${queryString}`;

    // Auth is BASIC auth
    const auth = `Basic ${Buffer.from(`API_KEY:${process.env.INTERVALS_API_KEY}`).toString('base64')}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': auth,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        const responseText = await response.text();
        console.error('Error fetching activities:', responseText);
        throw new Error('Network response was not ok');
    }

    const data = await response.json() as ICUActivity[];

    const rides = data.filter((activity: any) => activity.type === 'Ride');
    return rides;
}

export async function getWellness(
    athleteId = '0'
) {
    const path = '/api/v1/athlete/{id}/wellness{ext}';

    type Get = paths[typeof path]['get'];
    type Query = Get['parameters']['query'];

    const weeksToGet = 3;
    const query: Query = {
        oldest: new Date(new Date().getTime() - weeksToGet * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }

    const queryString = getQueryString(query);
    const url = `https://intervals.icu${path.replace('{id}', athleteId)}${queryString}`;

    // Auth is BASIC auth
    const auth = `Basic ${Buffer.from(`API_KEY:${process.env.INTERVALS_API_KEY}`).toString('base64')}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': auth,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        const responseText = await response.text();
        console.error('Error fetching activities:', responseText);
        throw new Error('Network response was not ok');
    }

    const data = await response.json() as ICUWellness[];
    return data;
}

export async function getPowerCurve(
    athleteId = '0'
): Promise<ICUPowerCurve> {
    const path = '/api/v1/athlete/{id}/power-curves{ext}';

    type Get = paths[typeof path]['get'];
    type Query = Get['parameters']['query'];

    const query: Query = {
        curves: ['42d'],
        type: 'Ride',
        f1: [],
        f2: [],
        f3: []
    };

    const queryString = getQueryString(query);
    const url = `https://intervals.icu${path.replace('{id}', athleteId)}${queryString}`;

    // Auth is BASIC auth
    const auth = `Basic ${Buffer.from(`API_KEY:${process.env.INTERVALS_API_KEY}`).toString('base64')}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': auth,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        const responseText = await response.text();
        console.error('Error fetching activities:', responseText);
        throw new Error('Network response was not ok');
    }

    type resp = paths['/api/v1/athlete/{id}/power-curves{ext}']['get']['responses']['200']['content']['*/*'];

    const data = await response.json() as resp;

    if (data.list === undefined) {
        throw new Error('Power curve data is not in expected format');
    }
    if (data.list.length === 0) {
        throw new Error('No power curve data found');
    }
    if (!data.list[0]) {
        throw new Error('Power curve data is empty');
    }

    return data.list[0] as ICUPowerCurve;
}