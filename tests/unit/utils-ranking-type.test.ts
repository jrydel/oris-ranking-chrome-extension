import { describe, expect, test } from 'bun:test';
import type { Event } from '../../src/scripts/types';
import { rankingTypeForEvent } from '../../src/scripts/utils';

const make = (disciplineId: string, date = '2026-04-01'): Event =>
	({
		Date: date,
		Ranking: '1',
		RankingKoef: '1,00',
		RankingKS: '0',
		RankingDecisionDate: '',
		Discipline: { ID: disciplineId, ShortName: '', NameCZ: '', NameEN: '' },
	}) satisfies Event;

describe('rankingTypeForEvent', () => {
	test('2026+ forest disciplines (Long, Middle, Night) → forest', () => {
		expect(rankingTypeForEvent(make('1'))).toBe('forest');
		expect(rankingTypeForEvent(make('2'))).toBe('forest');
		expect(rankingTypeForEvent(make('9'))).toBe('forest');
	});

	test('2026+ sprint disciplines (Sprint, Knock-out sprint) → sprint', () => {
		expect(rankingTypeForEvent(make('3'))).toBe('sprint');
		expect(rankingTypeForEvent(make('16'))).toBe('sprint');
	});

	test('relays / multi-stage / training etc. → null', () => {
		expect(rankingTypeForEvent(make('5'))).toBeNull(); // Relays
		expect(rankingTypeForEvent(make('13'))).toBeNull(); // Multi-stage
		expect(rankingTypeForEvent(make('15'))).toBeNull(); // Sprint relay
		expect(rankingTypeForEvent(make('12'))).toBeNull(); // Training
		expect(rankingTypeForEvent(make('999'))).toBeNull();
	});

	test('pre-2026 ranking-eligible events use legacy combined ranking', () => {
		expect(rankingTypeForEvent(make('2', '2025-05-31'))).toBe('legacy');
		expect(rankingTypeForEvent(make('3', '2025-04-26'))).toBe('legacy');
		expect(rankingTypeForEvent(make('1', '2024-09-15'))).toBe('legacy');
	});

	test('non-ranking disciplines stay null even in legacy era', () => {
		expect(rankingTypeForEvent(make('5', '2025-06-01'))).toBeNull();
	});

	test('boundary: 2025-12-31 → legacy, 2026-01-01 → split', () => {
		expect(rankingTypeForEvent(make('2', '2025-12-31'))).toBe('legacy');
		expect(rankingTypeForEvent(make('2', '2026-01-01'))).toBe('forest');
	});
});
