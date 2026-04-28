import type { Athlete, Event } from './types';
import { attachTooltip, extractIdFromHref, formatTime, getColIndex, getColNames, parsePosition, parseTime } from './utils';

const RVP_COUNT = 4;
const PC_COUNT = 3;
const FINISHED_LIMIT = 4;

type Cells = NodeListOf<HTMLTableCellElement>;
type RowEntry = { tds: Cells; athlete: Athlete };
type Direction = 'up' | 'down' | 'eq';

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

	annotateHeader(table, nameCol, '+RankC');

	const entries = collectRows(table, linkCol, ranking, { includeUnranked: false });
	const athletes = entries.map((e) => e.athlete);
	const rvp = computeRvpAverage(athletes, RVP_COUNT);

	for (const { tds, athlete } of entries) {
		appendRankBadge(tds[nameCol] as HTMLElement, athlete);
	}

	if (athletes.length > 0) {
		const heading = document.querySelectorAll(opts.headingSelector)[index];
		if (heading) appendBadge(heading, 'orx-rvp-avg', `(RVP ${rvp})`);
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

	annotateHeader(table, colPlace, '+BZ');
	annotateHeader(table, colName, '+RankC');

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

	let pc = 0;
	const finishers = tableRanking.filter((a) => a.position != null && a.time != null);
	if (finishers.length >= FINISHED_LIMIT) {
		pc = applyBz(finishers, rvp, ks, kz, isMassStartKnockoutSprint);
	}

	const ctx: BzContext = { rvp, pc, ks, kz, finishers: finishers.length };
	for (const { tds, athlete } of entries) {
		appendRankBadge(tds[colName] as HTMLElement, athlete);
		appendBzBadge(tds[colPlace] as HTMLElement, athlete, ctx);
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

function applyBz(finishers: Athlete[], rvp: number, ks: number, kz: number, massStart: boolean): number {
	let avgTime = 0;
	if (!massStart) {
		const ranked = finishers.filter((a) => a.ranking > 0).sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
		if (ranked.length < PC_COUNT) return 0;
		avgTime = ranked.slice(0, PC_COUNT).reduce((sum, a) => sum + (a.time ?? 0), 0) / PC_COUNT;
	}

	const n = finishers.length;
	for (const a of finishers) {
		const u = a.position ?? 0;
		const startFactor = 1 - (ks * (u - 1)) / (n - 1);
		const timeFactor = massStart ? 1 : 2 - (a.time ?? 0) / avgTime;
		const result = timeFactor * rvp * startFactor * kz;
		a.result = result < 0 ? 0 : Math.round(result);
	}
	return avgTime;
}

/** Parse an ORIS numeric coefficient. ORIS returns Czech-localized decimals ("1,06"), so we normalize the comma. */
export function parseCoefficient(raw: string | null | undefined, fallback: number): number {
	if (!raw) return fallback;
	const n = parseFloat(raw.replace(',', '.'));
	return Number.isFinite(n) ? n : fallback;
}

function bzDirection(bz: number, rank: number): Direction {
	if (rank === 0 || bz === rank) return 'eq';
	return bz > rank ? 'up' : 'down';
}

/** Append a badge span with the given class and text once; second call is a no-op. */
function appendBadge(parent: Element, className: string, text: string): HTMLSpanElement | null {
	if (parent.querySelector(`:scope > .${className.split(' ')[0]}`)) return null;
	const span = document.createElement('span');
	span.className = className;
	span.textContent = text;
	parent.appendChild(span);
	return span;
}

function annotateHeader(table: HTMLElement, col: number, tag: string): void {
	const th = table.querySelector<HTMLTableCellElement>(`thead th:nth-child(${col + 1})`);
	if (th) appendBadge(th, 'orx-col-tag', tag);
}

function appendRankBadge(td: HTMLElement, athlete: Athlete): void {
	if (athlete.rvp) td.classList.add('orx-rvp');
	const text = athlete.ranking > 0 ? String(athlete.ranking) : '–';
	appendBadge(td, 'orx-rank', text);
}

type BzContext = { rvp: number; pc: number; ks: number; kz: number; finishers: number };

function appendBzBadge(td: HTMLElement, athlete: Athlete, ctx: BzContext): void {
	if (athlete.position == null || athlete.result == null) return;
	const direction = bzDirection(athlete.result, athlete.ranking);
	const span = appendBadge(td, `orx-bz orx-bz-${direction}`, String(athlete.result));
	if (span) attachTooltip(span, formatTooltip(athlete, ctx));
}

function formatTooltip(athlete: Athlete, ctx: BzContext): string {
	return [
		`Předběžný BZ: ${athlete.result ?? 0}`,
		`Aktuální RankC: ${athlete.ranking || '–'}`,
		'',
		'BZ = (2 − ČZ/PČ) × PB × (1 − KS·(U−1)/(N−1)) × KZ',
		`ČZ = ${formatTime(athlete.time ?? 0)}, PČ = ${formatTime(ctx.pc)}`,
		`PB = ${ctx.rvp}, KZ = ${ctx.kz}, KS = ${ctx.ks}`,
		`U = ${athlete.position ?? '–'}, N = ${ctx.finishers}`,
	].join('\n');
}
