import { beforeAll, describe, expect, test } from 'bun:test';
import { DOMParser } from 'linkedom';
import { getEvent, getRanking, getRankingDates } from '../../src/scripts/fetcher';
import { rankingTypeForEvent } from '../../src/scripts/utils';

const live = process.env.ORIS_LIVE === '1';
const liveTest = live ? test : test.skip;

const TIMEOUT = 15000;

beforeAll(() => {
	// getRankingDates uses DOMParser; Bun has no DOM, so install linkedom's
	// (HTML-only, no CSS/JS execution — robust against arbitrary stylesheet links).
	(globalThis as { DOMParser: typeof DOMParser }).DOMParser = DOMParser as unknown as typeof DOMParser;
});

describe('ORIS live integration (gated by ORIS_LIVE=1)', () => {
	liveTest(
		'getRankingDates returns non-empty array of unique YYYY-MM-DD strings',
		async () => {
			const dates = await getRankingDates();
			expect(Array.isArray(dates)).toBe(true);
			expect(dates.length).toBeGreaterThan(0);
			const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
			for (const d of dates) {
				expect(dateRegex.test(d)).toBe(true);
				expect(Number.isNaN(new Date(d).getTime())).toBe(false);
			}
			expect(new Set(dates).size).toBe(dates.length);
		},
		TIMEOUT,
	);

	liveTest(
		'getRanking forest M returns athletes with valid ids and rankings',
		async () => {
			const dates = await getRankingDates();
			const latest = dates[0];
			expect(latest).toBeDefined();
			const list = await getRanking(latest as string, 'M', 'forest');
			expect(list.length).toBeGreaterThan(0);
			for (const a of list) {
				expect(typeof a.id).toBe('number');
				expect(a.id).toBeGreaterThan(0);
				expect(typeof a.ranking).toBe('number');
				expect(a.ranking).toBeGreaterThanOrEqual(0);
			}
			expect(list.some((a) => a.ranking > 0)).toBe(true);
		},
		TIMEOUT,
	);

	liveTest(
		'getRanking forest F returns athletes with valid ids and rankings',
		async () => {
			const dates = await getRankingDates();
			const latest = dates[0];
			const list = await getRanking(latest as string, 'F', 'forest');
			expect(list.length).toBeGreaterThan(0);
			expect(list.some((a) => a.ranking > 0)).toBe(true);
		},
		TIMEOUT,
	);

	liveTest(
		'getRanking sprint differs from forest (separate 2026 rankings)',
		async () => {
			const dates = await getRankingDates();
			const latest = dates[0] as string;
			const [forest, sprint] = await Promise.all([getRanking(latest, 'M', 'forest'), getRanking(latest, 'M', 'sprint')]);
			expect(forest.length).toBeGreaterThan(0);
			expect(sprint.length).toBeGreaterThan(0);
			// Different ranking lists should have different totals or different top athletes.
			const top = (xs: typeof forest) => [...xs].sort((a, b) => b.ranking - a.ranking)[0]?.ranking;
			expect(top(forest)).not.toBe(top(sprint));
		},
		TIMEOUT,
	);

	liveTest(
		'getEvent returns Discipline + Czech-decimal RankingKoef on a known forest event (Český pohár 2025, id=8500)',
		async () => {
			const event = await getEvent(8500);
			expect(/^\d{4}-\d{2}-\d{2}$/.test(event.Date)).toBe(true);
			expect(event.Discipline).toBeDefined();
			expect(event.Discipline.ID).toBe('2'); // Middle distance
			expect(event.Ranking).toBe('1');
			// ORIS returns Czech decimals; the comma is significant — parseCoefficient must normalize it.
			expect(event.RankingKoef).toMatch(/^\d+,\d+$/);
			expect(rankingTypeForEvent(event)).toBe('forest');
		},
		TIMEOUT,
	);

	liveTest(
		'getEvent on a sprint event maps to sprint ranking (id=9400 KO sprint)',
		async () => {
			const event = await getEvent(9400);
			expect(event.Discipline.ID).toBe('16');
			expect(rankingTypeForEvent(event)).toBe('sprint');
		},
		TIMEOUT,
	);
});
