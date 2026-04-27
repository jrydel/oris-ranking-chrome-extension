import type { Athlete, Event } from './types';
import { extractIdFromHref, getColIndex, getColNames, parsePosition, parseTime } from './utils';

const RVP_COUNT = 4;
const PC_COUNT = 3;
const FINISHED_LIMIT = 4;

type Cells = NodeListOf<HTMLTableCellElement>;
type RowEntry = { tds: Cells; athlete: Athlete };

export type RvpOptions = {
	/** Aliases (en + cs lower-cased) of the column whose <a href> carries the athlete id. */
	linkColumn: readonly string[];
	/** Aliases of the column where the ranking number is rendered. */
	nameColumn: readonly string[];
	/** Selector for the heading where the table-wide RVP average is appended. */
	headingSelector: string;
};

export function computeRvp(index: number, table: HTMLElement, ranking: ReadonlyMap<number, Athlete>, opts: RvpOptions): void {
	const colNames = getColNames(table);
	const linkCol = getColIndex(colNames, ...opts.linkColumn);
	const nameCol = getColIndex(colNames, ...opts.nameColumn);

	const entries = collectRows(table, linkCol, ranking, { includeUnranked: false });
	const athletes = entries.map((e) => e.athlete);
	const rvp = computeRvpAverage(athletes, RVP_COUNT);

	for (const { tds, athlete } of entries) {
		createRVPColumn(tds[nameCol] as HTMLElement, athlete);
	}

	if (athletes.length > 0) {
		const heading = document.querySelectorAll(opts.headingSelector)[index];
		if (heading) createRVPAverage(heading, rvp);
	}
}

export function computeEntries(index: number, table: HTMLElement, ranking: ReadonlyMap<number, Athlete>): void {
	computeRvp(index, table, ranking, {
		linkColumn: ['name', 'jmeno'],
		nameColumn: ['name', 'jmeno'],
		headingSelector: 'div.row.mt-3 h3',
	});
}

export function computeStartList(index: number, table: HTMLElement, ranking: ReadonlyMap<number, Athlete>): void {
	computeRvp(index, table, ranking, {
		linkColumn: ['reg. number', 'reg. cislo'],
		nameColumn: ['name', 'jmeno'],
		headingSelector: 'div.fl.pl-0.pr-0 h3',
	});
}

// Single-race BZ formula per SŘ V.1.c / V.2.c (2026): BZ = (2 - CZ/PC) * PB * (1 - KS*(U-1)/(N-1)) * KZ; clamp >= 0.
// V.2.7 (knock-out sprint mass-start): drop the time term.
// TODO: SŘ V.3 veteran ranking — BZ = (2 - CZ/PC) * PB * (1 - KS*(U-1)/(N-1)) * (1-KK), KK = age-category coefficient.
export function computeResults(table: HTMLElement, ranking: ReadonlyMap<number, Athlete>, event: Event): void {
	const colNames = getColNames(table);
	const colPlace = getColIndex(colNames, 'place', 'misto');
	const colTime = getColIndex(colNames, 'time', 'cas');
	const colRegNumber = getColIndex(colNames, 'reg. number', 'reg. cislo');
	const colName = getColIndex(colNames, 'name', 'jmeno');

	const entries = collectRows(table, colRegNumber, ranking, { includeUnranked: true });
	for (const { tds, athlete } of entries) {
		athlete.position = parsePosition(tds[colPlace]?.textContent?.trim());
		athlete.time = parseTime(tds[colTime]?.textContent?.trim());
	}

	const tableRanking = entries.map((e) => e.athlete);
	const rankedAthletes = tableRanking.filter((a) => a.ranking > 0);
	const rvp = computeRvpAverage(rankedAthletes, RVP_COUNT);

	const ks = parseCoefficient(event.RankingKS, 0);
	const kz = parseCoefficient(event.RankingKoef, 1);
	const isMassStartKnockoutSprint = event.Discipline?.ID === '16' && ks > 0;

	const finishers = tableRanking.filter((a) => a.position != null && a.time != null);
	if (finishers.length >= FINISHED_LIMIT) {
		applyBz(finishers, rvp, ks, kz, isMassStartKnockoutSprint);
	}

	for (const { tds, athlete } of entries) {
		createRVPColumn(tds[colName] as HTMLElement, athlete);
		createRankingColumn(tds[colPlace] as HTMLElement, athlete);
	}
}

function collectRows(table: HTMLElement, linkCol: number, ranking: ReadonlyMap<number, Athlete>, { includeUnranked }: { includeUnranked: boolean }): RowEntry[] {
	const out: RowEntry[] = [];
	table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((row) => {
		const tds = row.querySelectorAll<HTMLTableCellElement>('td');
		const href = tds[linkCol]?.querySelector('a')?.getAttribute('href')?.trim();
		const id = extractIdFromHref(href);
		if (id === null) return;
		const source = ranking.get(id);
		if (source) out.push({ tds, athlete: { ...source } });
		else if (includeUnranked) out.push({ tds, athlete: { id, ranking: 0 } });
	});
	return out;
}

function computeRvpAverage(athletes: Athlete[], topN: number): number {
	if (athletes.length === 0) return 0;
	const sorted = [...athletes].sort((a, b) => b.ranking - a.ranking);
	const top = sorted.slice(0, topN);
	for (const a of top) a.rvp = true;
	return Math.round(top.reduce((sum, a) => sum + a.ranking, 0) / top.length);
}

function applyBz(finishers: Athlete[], rvp: number, ks: number, kz: number, massStart: boolean): void {
	let avgTime: number | null = null;
	if (!massStart) {
		const ranked = finishers.filter((a) => a.ranking > 0).sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
		if (ranked.length < PC_COUNT) return;
		avgTime = ranked.slice(0, PC_COUNT).reduce((sum, a) => sum + (a.time ?? 0), 0) / PC_COUNT;
	}

	const n = finishers.length;
	for (const a of finishers) {
		const u = a.position ?? 0;
		const startFactor = 1 - (ks * (u - 1)) / (n - 1);
		const timeFactor = massStart ? 1 : 2 - (a.time ?? 0) / (avgTime ?? 1);
		const result = timeFactor * rvp * startFactor * kz;
		a.result = result < 0 ? 0 : Math.round(result);
	}
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
	const resultValue = athlete.result ?? 0;
	resultSpan.textContent = `${resultValue}`;
	resultSpan.style.fontWeight = 'bold';
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
