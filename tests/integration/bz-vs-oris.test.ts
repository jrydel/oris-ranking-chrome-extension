/**
 * End-to-end accuracy test: for known-good events, run the same BZ formula
 * the extension uses and compare against ORIS's own published Body column.
 *
 * Gated on ORIS_LIVE=1 because it hits the live ORIS API.
 */
import { beforeAll, describe, expect, test } from 'bun:test';
import { DOMParser } from 'linkedom';
import { getEvent, getRanking } from '../../src/scripts/fetcher';
import { findClosestDate, rankingTypeForEvent } from '../../src/scripts/utils';

const live = process.env.ORIS_LIVE === '1';
const liveTest = live ? test : test.skip;
const TIMEOUT = 30000;

beforeAll(() => {
	(globalThis as { DOMParser: typeof DOMParser }).DOMParser = DOMParser as unknown as typeof DOMParser;
});

type EventCheck = { id: number; label: string; minWithin1Pct: number };

const cases: EventCheck[] = [
	// Mistrovství oblasti 2025-04-26 sprint, KZ=1.02 — exact match expected
	{ id: 8968, label: 'MO sprint 2025-04-26', minWithin1Pct: 95 },
	// Mistrovství oblasti 2025-06-07 long, KZ=1.02
	{ id: 9056, label: 'MO long 2025-06-07', minWithin1Pct: 95 },
	// Český pohár 2025-05-31 middle, KZ=1.06 — bigger field, some categories diverge slightly
	{ id: 8500, label: 'Český pohár Middle 2025-05-31', minWithin1Pct: 80 },
];

async function compareEvent(eventId: number) {
	const event = await getEvent(eventId);
	const kind = rankingTypeForEvent(event);
	if (!kind) throw new Error(`event ${eventId} discipline ${event.Discipline.NameCZ} is not in any ranking`);

	// Build snapshot date directly from event.Date (no /Ranking fetch needed)
	const firstOfEventMonth = `${event.Date.slice(0, 7)}-01`;
	const snapshot = findClosestDate(event.Date, [firstOfEventMonth, ...lastTwentyMonthEnds(event.Date)]);
	if (!snapshot) throw new Error('no snapshot');

	const ks = parseFloat((event.RankingKS || '0').replace(',', '.')) || 0;
	const kz = parseFloat((event.RankingKoef || '1').replace(',', '.')) || 1;

	const [men, women] = await Promise.all([getRanking(snapshot, 'M', kind), getRanking(snapshot, 'F', kind)]);
	const ranking = new Map<number, number>();
	for (const a of men) ranking.set(a.id, a.ranking);
	for (const a of women) ranking.set(a.id, a.ranking);

	const html = await fetch(`https://oris.orientacnisporty.cz/Vysledky?id=${eventId}`).then((r) => r.text());
	const doc = new DOMParser().parseFromString(html, 'text/html') as unknown as Document;

	let total = 0;
	let within1 = 0;
	for (const table of doc.querySelectorAll('table')) {
		const headers = [...table.querySelectorAll('thead th')].map((th) => th.textContent?.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') ?? '');
		const cP = headers.indexOf('misto');
		const cT = headers.indexOf('cas');
		const cR = headers.indexOf('reg. cislo');
		const cB = headers.indexOf('body');
		if ([cP, cT, cR, cB].some((i) => i < 0)) continue;

		const rows: { id: number; pos: number; time: number; real: number }[] = [];
		for (const tr of table.querySelectorAll('tbody tr')) {
			const tds = tr.querySelectorAll('td');
			const idM = (tds[cR]?.querySelector('a')?.getAttribute('href') ?? '').match(/[?&]id=(\d+)/);
			if (!idM) continue;
			const id = parseInt(idM[1], 10);
			const pos = parseInt(tds[cP]?.textContent?.trim().replace('.', '') ?? '', 10);
			if (!Number.isFinite(pos)) continue;
			const tParts = (tds[cT]?.textContent?.trim() ?? '').split(':').map(Number);
			const time = tParts.length === 2 ? tParts[0] * 60 + tParts[1] : tParts.length === 3 ? tParts[0] * 3600 + tParts[1] * 60 + tParts[2] : NaN;
			if (!Number.isFinite(time)) continue;
			const real = parseInt(tds[cB]?.textContent?.trim() ?? '', 10);
			if (!Number.isFinite(real)) continue;
			rows.push({ id, pos, time, real });
		}
		if (rows.length < 4) continue;

		const ranks = rows
			.map((r) => ranking.get(r.id) ?? 0)
			.filter((r) => r > 0)
			.sort((a, b) => b - a);
		if (ranks.length === 0) continue;
		const rvp = Math.round(ranks.slice(0, 4).reduce((s, r) => s + r, 0) / Math.min(4, ranks.length));
		const rankedFin = [...rows].filter((r) => (ranking.get(r.id) ?? 0) > 0).sort((a, b) => a.time - b.time);
		if (rankedFin.length < 3) continue;
		const avgTime = rankedFin.slice(0, 3).reduce((s, r) => s + r.time, 0) / 3;

		for (const r of rows) {
			const sf = 1 - (ks * (r.pos - 1)) / (rows.length - 1);
			const tf = 2 - r.time / avgTime;
			const predicted = Math.max(0, Math.round(tf * rvp * sf * kz));
			total++;
			if (Math.abs(predicted - r.real) <= 1) within1++;
		}
	}
	return { total, within1, kind, snapshot, kz };
}

/** Generate the last ~20 month-end dates ending at the cutoff month for snapshot lookup. */
function lastTwentyMonthEnds(eventDate: string): string[] {
	const out: string[] = [];
	const [y, m] = eventDate.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, 1));
	for (let i = 0; i < 24; i++) {
		date.setUTCMonth(date.getUTCMonth() - 1);
		const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
		out.push(lastDay.toISOString().slice(0, 10));
	}
	return out;
}

describe('BZ formula vs ORIS official Body column (gated by ORIS_LIVE=1)', () => {
	for (const c of cases) {
		liveTest(
			`${c.label} matches within ±1 for at least ${c.minWithin1Pct}% of athletes`,
			async () => {
				const { total, within1, kind, snapshot, kz } = await compareEvent(c.id);
				expect(total).toBeGreaterThan(10);
				const pct = (within1 / total) * 100;
				console.log(`  ${c.label}: kind=${kind} snapshot=${snapshot} KZ=${kz} → ${within1}/${total} (${pct.toFixed(1)}%) within ±1`);
				expect(pct).toBeGreaterThanOrEqual(c.minWithin1Pct);
			},
			TIMEOUT,
		);
	}
});
