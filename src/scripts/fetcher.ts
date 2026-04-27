import type { ApiResponse, Athlete, Event, RankingType } from './types';
import { regexRankingId } from './utils';

/** ORIS AJAX `rt` parameter mapping. `rt=1` = legacy combined ranking (≤2025), `rt=2`/`rt=8` = 2026 split. */
const RANKTYPE_BY_KIND: Record<RankingType, number> = {
	legacy: 1,
	forest: 2,
	sprint: 8,
};

/** ORIS is served from two host names (orientacnisporty.cz and ceskyorientak.cz); fetch from whichever the page ran on to stay same-origin. */
const ORIGIN = typeof location !== 'undefined' ? `${location.protocol}//${location.hostname}` : 'https://oris.orientacnisporty.cz';

export async function getEvent(eventId: number): Promise<Event> {
	const data = await requestApi<Event>(`${ORIGIN}/API/?format=json&method=getEvent&id=${eventId}`);
	return data.Data;
}

export async function getRankingDates(): Promise<string[]> {
	const response = await request(`${ORIGIN}/Ranking`);
	const html = await response.text();

	const doc = new DOMParser().parseFromString(html, 'text/html');
	const select = doc.querySelector<HTMLSelectElement>('select#date');
	if (!select) return [];

	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	const result: string[] = [];
	select.querySelectorAll('option').forEach((opt) => {
		const value = opt.getAttribute('value')?.trim();
		if (value && dateRegex.test(value) && result.indexOf(value) === -1) {
			result.push(value);
		}
	});
	return result;
}

export async function getRanking(date: string, gender: 'M' | 'F', kind: RankingType = 'forest'): Promise<Athlete[]> {
	const rt = RANKTYPE_BY_KIND[kind];
	const response = await request(`${ORIGIN}/ajax_server?action=getRanking&d=${date}&s=1&g=${gender}&rt=${rt}&iDisplayStart=0&iDisplayLength=5000`);
	const data = (await response.json()) as { aaData: string[][] };

	const athletes: Athlete[] = [];
	for (const row of data.aaData) {
		const idMatch = row[1]?.match(regexRankingId);
		if (!idMatch) continue;
		const id = parseInt(idMatch[1], 10);
		const ranking = parseInt(row[4]?.trim() ?? '', 10);
		if (!Number.isFinite(id)) continue;
		athletes.push({
			id,
			ranking: Number.isFinite(ranking) ? ranking : 0,
		});
	}
	return athletes;
}

async function request(url: string): Promise<Response> {
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
	return (await response.json()) as ApiResponse<T>;
}
