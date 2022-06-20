import { ApiResponse, Athlete, Event } from './types';
import { regexRankingId } from './utils';

export async function getEvent(eventId: number): Promise<Event> {
    const data = await requestApi<Event>(`https://oris.orientacnisporty.cz/API/?format=json&method=getEvent&id=${eventId}`);
    return data.Data;
}

export async function getRankingDates() {
    const response = await request('https://oris.orientacnisporty.cz/Ranking');
    const data = await response.text();

    const temp = data.split('<select name="date" id="date" class="form-control form-control-sm mr-5">')[1].split('</select>')[0];
    const regexp = /\d{4}-\d{2}-\d{2}/g;
    const matches = temp.matchAll(regexp);

    const result: string[] = [];
    for (const match of matches) {
        const item = match[0];
        if (result.indexOf(item) === -1) result.push(item);
    }

    return result;
}

export async function getRanking(date: string, gender: 'M' | 'F') {
    const response = await request(
        `https://oris.orientacnisporty.cz/ajax_server?action=getRanking&d=${date}&s=1&g=${gender}&iDisplayStart=0&iDisplayLength=5000`,
    );
    const data = (await response.json()) as { aaData: string[] };

    return data.aaData.map((it) => {
        const item: Athlete = {
            id: parseInt(it[1].match(regexRankingId)[0].trim()),
            ranking: parseInt(it[4].trim()),
        };
        return item;
    });
}

async function request(url: string) {
    console.log(`oris-ranking-chrome-extension - fetching: ${url}`);
    return fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json, application/xml, text/plain, text/html, *.*',
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
    });
}

async function requestApi<T>(url: string): Promise<ApiResponse<T>> {
    console.log(`oris-ranking-chrome-extension - fetching: ${url}`);
    const response = await request(url);
    return await response.json();
}
