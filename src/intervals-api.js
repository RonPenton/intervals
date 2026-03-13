"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRides = getRides;
exports.getWellness = getWellness;
exports.getWellnessOnDate = getWellnessOnDate;
exports.setWellnessOnDate = setWellnessOnDate;
exports.getPowerCurve = getPowerCurve;
const getQueryString = (query) => {
    const queryString = new URLSearchParams(query).toString();
    return queryString ? `?${queryString}` : '';
};
async function getRides(oldest, athleteId = '0') {
    const path = '/api/v1/athlete/{id}/activities';
    const query = {
        oldest: oldest.toString()
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
    const data = await response.json();
    const rides = data.filter((activity) => activity.type === 'Ride');
    return rides;
}
async function getWellness(athleteId = '0') {
    const path = '/api/v1/athlete/{id}/wellness{ext}';
    const weeksToGet = 3;
    const query = {
        oldest: new Date(new Date().getTime() - weeksToGet * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
    const data = await response.json();
    return data;
}
async function getWellnessOnDate(date, athleteId = '0') {
    const path = '/api/v1/athlete/{id}/wellness/{date}';
    const p = path.replace('{date}', date).replace('{id}', athleteId);
    const url = `https://intervals.icu${p}`;
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
    const data = await response.json();
    return data;
}
async function setWellnessOnDate(date, wellness, athleteId = '0') {
    const path = '/api/v1/athlete/{id}/wellness/{date}';
    const p = path.replace('{date}', date).replace('{id}', athleteId);
    const url = `https://intervals.icu${p}`;
    // Auth is BASIC auth
    const auth = `Basic ${Buffer.from(`API_KEY:${process.env.INTERVALS_API_KEY}`).toString('base64')}`;
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': auth,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(wellness)
    });
    if (!response.ok) {
        const responseText = await response.text();
        console.error('Error fetching activities:', responseText);
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data;
}
async function getPowerCurve(athleteId = '0') {
    const path = '/api/v1/athlete/{id}/power-curves{ext}';
    const query = {
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
    const data = await response.json();
    if (data.list === undefined) {
        throw new Error('Power curve data is not in expected format');
    }
    if (data.list.length === 0) {
        throw new Error('No power curve data found');
    }
    if (!data.list[0]) {
        throw new Error('Power curve data is empty');
    }
    return data.list[0];
}
