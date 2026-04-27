import type { Athlete, Event } from './types';
import { extractIdFromHref, getColIndex, getColNames, parsePosition, parseTime } from './utils';

export type RvpOptions = {
	/** Column key(s) to look up the cell whose <a href> carries the athlete id. */
	linkColumn: { en: string; cs: string };
	/** Column key(s) to look up the cell where the ranking number is rendered. */
	nameColumn: { en: string; cs: string };
	/** Selector for the heading where the table-wide RVP average is appended. */
	headingSelector: string;
};

export function computeRvp(index: number, table: HTMLElement, rankingData: readonly Athlete[], opts: RvpOptions): void {
	const colNames = getColNames(table);
	const colIndexLink = getColIndex(colNames, opts.linkColumn.en, opts.linkColumn.cs);
	const colIndexName = getColIndex(colNames, opts.nameColumn.en, opts.nameColumn.cs);

	const rows = table.querySelectorAll('tbody tr');

	const tableRanking: Athlete[] = [];
	rows.forEach((row) => {
		const el = row.querySelectorAll('td');
		const href = el[colIndexLink]?.querySelector('a')?.getAttribute('href')?.trim();
		const id = extractIdFromHref(href);
		if (id === null) return;

		const source = rankingData.find((it) => it.id === id);
		if (source) {
			tableRanking.push({ ...source });
		}
	});

	const rvpCount = 4;

	tableRanking.sort((a, b) => b.ranking - a.ranking);
	tableRanking.slice(0, rvpCount).forEach((item) => {
		item.rvp = true;
	});
	const rvp = tableRanking.length > 0 ? Math.round(tableRanking.slice(0, rvpCount).reduce((a, b) => a + b.ranking, 0) / Math.min(rvpCount, tableRanking.length)) : 0;

	rows.forEach((row) => {
		const el = row.querySelectorAll('td');
		const href = el[colIndexLink]?.querySelector('a')?.getAttribute('href')?.trim();
		const id = extractIdFromHref(href);
		if (id === null) return;

		const athlete = tableRanking.find((it) => it.id === id);
		if (athlete) {
			createRVPColumn(el[colIndexName] as HTMLElement, athlete);
		}
	});

	if (tableRanking.length > 0) {
		const heading = document.querySelectorAll(opts.headingSelector)[index];
		if (heading) createRVPAverage(heading, rvp);
	}
}

export function computeEntries(index: number, table: HTMLElement, rankingData: readonly Athlete[]): void {
	computeRvp(index, table, rankingData, {
		linkColumn: { en: 'name', cs: 'jmeno' },
		nameColumn: { en: 'name', cs: 'jmeno' },
		headingSelector: 'div.row.mt-3 h3',
	});
}

export function computeStartList(index: number, table: HTMLElement, rankingData: readonly Athlete[]): void {
	computeRvp(index, table, rankingData, {
		linkColumn: { en: 'reg. number', cs: 'reg. cislo' },
		nameColumn: { en: 'name', cs: 'jmeno' },
		headingSelector: 'div.fl.pl-0.pr-0 h3',
	});
}

// Single-race BZ formula per SŘ V.1.c / V.2.c (2026): BZ = (2 - CZ/PC) * PB * (1 - KS*(U-1)/(N-1)) * KZ; clamp >= 0
export function computeResults(table: HTMLElement, rankingData: readonly Athlete[], event: Event): void {
	const colNames = getColNames(table);
	const colPlace = getColIndex(colNames, 'place', 'misto');
	const colTime = getColIndex(colNames, 'time', 'cas');
	const colIndexRegNumber = getColIndex(colNames, 'reg. number', 'reg. cislo');
	const colIndexName = getColIndex(colNames, 'name', 'jmeno');

	const rows = table.querySelectorAll('tbody tr');

	const tableRanking: Athlete[] = [];

	rows.forEach((row) => {
		const el = row.querySelectorAll('td');
		const positionText = el[colPlace]?.textContent?.trim() ?? '';
		const timeText = el[colTime]?.textContent?.trim() ?? '';
		const href = el[colIndexRegNumber]?.querySelector('a')?.getAttribute('href')?.trim();
		const id = extractIdFromHref(href);
		if (id === null) return;

		const source = rankingData.find((it) => it.id === id);
		const athlete: Athlete = source ? { ...source } : { id, ranking: 0 };

		athlete.position = parsePosition(positionText);
		athlete.time = parseTime(timeText);

		tableRanking.push(athlete);
	});

	const rvpCount = 4;
	const averageTimeCount = 3;
	const finishedLimit = 4;

	const startCoefficient = parseCoefficient(event.RankingKS, 0);
	const eventCoefficient = parseCoefficient(event.RankingKoef, 1);
	// Per SŘ V.2.7: knock-out sprint mass-start parts use BZ without the time term (KS > 0 signals mass start).
	const isMassStartKnockoutSprint = event.Discipline?.ID === '16' && startCoefficient > 0;

	// TODO: veteran ranking uses BZ = (2 - CZ/PC) * PB * (1 - KS*(U-1)/(N-1)) * (1-KK), KK = age-category coefficient.

	const rankedAthletes = tableRanking.filter((a) => a.ranking > 0);
	rankedAthletes.sort((a, b) => b.ranking - a.ranking);
	rankedAthletes.slice(0, rvpCount).forEach((item) => {
		item.rvp = true;
	});
	const rvp = rankedAthletes.length > 0 ? Math.round(rankedAthletes.slice(0, rvpCount).reduce((a, b) => a + b.ranking, 0) / Math.min(rvpCount, rankedAthletes.length)) : 0;

	const finishedTableRanking = tableRanking.filter((x) => x.position !== null && x.position !== undefined && x.time !== null && x.time !== undefined);

	if (finishedTableRanking.length >= finishedLimit) {
		const rankedFinishers = finishedTableRanking
			.filter((a) => a.ranking > 0)
			.slice()
			.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));

		const averageTime =
			!isMassStartKnockoutSprint && rankedFinishers.length >= averageTimeCount ? rankedFinishers.slice(0, averageTimeCount).reduce((a, b) => a + (b.time ?? 0), 0) / averageTimeCount : null;

		if (averageTime !== null || isMassStartKnockoutSprint) {
			finishedTableRanking.forEach((item) => {
				const u = item.position ?? 0;
				const n = finishedTableRanking.length;
				const startFactor = 1 - (startCoefficient * (u - 1)) / (n - 1);
				const timeFactor = isMassStartKnockoutSprint ? 1 : 2 - (item.time ?? 0) / (averageTime ?? 1);
				const result = timeFactor * rvp * startFactor * eventCoefficient;
				item.result = result < 0 ? 0 : Math.round(result);
			});
		}
	}

	rows.forEach((row) => {
		const el = row.querySelectorAll('td');
		const href = el[colIndexRegNumber]?.querySelector('a')?.getAttribute('href')?.trim();
		const id = extractIdFromHref(href);
		if (id === null) return;

		const athlete = tableRanking.find((it) => it.id === id);
		if (athlete) {
			createRVPColumn(el[colIndexName] as HTMLElement, athlete);
			createRankingColumn(el[colPlace] as HTMLElement, athlete);
		}
	});
}

/** Parse an ORIS numeric coefficient. ORIS returns Czech-localized decimals ("1,06"), so we normalize the comma. */
export function parseCoefficient(raw: string | null | undefined, fallback: number): number {
	if (!raw) return fallback;
	const n = parseFloat(raw.replace(',', '.'));
	return Number.isFinite(n) ? n : fallback;
}

function createRVPColumn(td: HTMLElement, athlete: Athlete) {
	td.style.display = 'flex';
	td.style.flexDirection = 'row';
	td.style.alignItems = 'center';
	td.style.justifyContent = 'space-between';

	if (athlete.rvp) {
		td.style.backgroundColor = '#42C0FB';
	}

	const rvpSpan = document.createElement('span');
	rvpSpan.textContent = `${athlete.ranking}`;
	rvpSpan.style.fontWeight = 'bold';
	td.appendChild(rvpSpan);
}

function createRankingColumn(td: HTMLElement, athlete: Athlete) {
	td.textContent = '';

	const div = document.createElement('div');
	div.style.display = 'flex';
	div.style.flexDirection = 'row';
	div.style.alignItems = 'center';
	div.style.justifyContent = 'space-between';
	td.appendChild(div);

	const positionSpan = document.createElement('span');
	positionSpan.textContent = athlete.position ? `${athlete.position}.` : '';
	div.appendChild(positionSpan);

	const resultSpan = document.createElement('span');
	resultSpan.textContent = `${athlete.result ?? 0}`;
	resultSpan.style.fontWeight = 'bold';
	const resultValue = athlete.result ?? 0;
	if (resultValue !== athlete.ranking) {
		td.style.backgroundColor = resultValue > athlete.ranking ? 'lightgreen' : '#FFB2B2';
	}
	div.appendChild(resultSpan);
}

function createRVPAverage(el: Element, rvp: number) {
	const rvpSpan = document.createElement('span');
	rvpSpan.textContent = ` (${rvp})`;
	el.appendChild(rvpSpan);
}
