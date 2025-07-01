import { type paths } from './intervals-api-schema';


const getQueryString = (query: Record<string, any>) => {
    const queryString = new URLSearchParams(query).toString();
    return queryString ? `?${queryString}` : '';
}

export type ICUActivity = Required<paths['/api/v1/athlete/{id}/activities']['get']['responses']['200']['content']['*/*'][number]>;

export async function getRides(
    athleteId = '0'
) {

    const path = '/api/v1/athlete/{id}/activities';

    type Get = paths[typeof path]['get'];
    type Query = Get['parameters']['query'];

    // 6 weeks ago
    const query: Query = {
        oldest: new Date(new Date().getTime() - 6 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
