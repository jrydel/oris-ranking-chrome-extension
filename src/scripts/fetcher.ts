import { ApiResponse, Athlete, Event, Registration } from './types';
import { normalizeString, parseCSVToArray } from './utils';

export async function getEvent(eventId: number): Promise<Event> {
	const data = await requestApi<Event>(`https://oris.orientacnisporty.cz/API/?format=json&method=getEvent&id=${eventId}`);
	return data.Data;
}

export async function getRankingDates() {
	const data = await requestText('https://oris.orientacnisporty.cz/Ranking');

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

export async function getRanking(eventYear: number, rankingDate: string): Promise<Athlete[]> {
	const [maleData, femaleData] = await Promise.all([fetchRanking(rankingDate, 'M'), fetchRanking(rankingDate, 'F')]);
	const registration = await getRegistration(eventYear);

	const result: Athlete[] = [
		...maleData.map((item: any[]) => ({
			name: normalizeString(`${item[1]} ${item[2]}`),
			regNumber: normalizeString(item[3]),
			ranking: parseInt(item[5])
		})),
		...femaleData.map((item: any[]) => ({
			name: normalizeString(`${item[1]} ${item[2]}`),
			regNumber: normalizeString(item[3]),
			ranking: parseInt(item[5])
		}))
	];

	return Object.entries(registration).map(([_, item]) => {
		const id = parseInt(item.UserID);
		const name = normalizeString(`${item.LastName} ${item.FirstName}`);
		const regNumber = normalizeString(item.RegNo);
		const ranking = result.find(item2 => item2.name === name && item2.regNumber === regNumber);
		return { id, name, regNumber, ranking: ranking?.ranking || 0 } as Athlete;
	});
}

async function getRegistration(year: number): Promise<{ [key: string]: Registration }> {
	const data = await requestApi(`https://oris.orientacnisporty.cz/API/?format=json&method=getRegistration&sport=1&year=${year}`);
	return data.Data as { [key: string]: Registration };
}

async function fetchRanking(date: string, gender: 'M' | 'F') {
	const data = await requestText(`https://oris.orientacnisporty.cz/ranking_export?date=${date}&sport=1&gender=${gender}&csv=1`);
	const csv = parseCSVToArray(data, ';');
	return csv;
}

async function requestText(url: string): Promise<string> {
	console.log(`oris-ranking-chrome-extension - fetching: ${url}`);
	const response = await fetch(url, {
		method: 'GET',
		headers: {
			Accept: 'application/json, application/xml, text/plain, text/html, *.*',
			'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
		}
	});
	return await response.text();
}

async function requestApi<T>(url: string): Promise<ApiResponse<T>> {
	console.log(`oris-ranking-chrome-extension - fetching: ${url}`);
	const response = await fetch(url, {
		method: 'GET',
		headers: {
			Accept: 'application/json, application/xml, text/plain, text/html, *.*',
			'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
		}
	});
	return await response.json();
}
