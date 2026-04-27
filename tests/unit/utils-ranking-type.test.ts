import { describe, expect, test } from 'bun:test';
import type { Event } from '../../src/scripts/types';
import { rankingTypeForEvent } from '../../src/scripts/utils';

const make = (disciplineId: string): Event =>
	({
		Date: '2026-04-01',
		Ranking: '1',
		RankingKoef: '1,00',
		RankingKS: '0',
		RankingDecisionDate: '',
		Discipline: { ID: disciplineId, ShortName: '', NameCZ: '', NameEN: '' },
	}) satisfies Event;

describe('rankingTypeForEvent', () => {
	test('forest disciplines (Long, Middle, Night) → forest', () => {
		expect(rankingTypeForEvent(make('1'))).toBe('forest');
		expect(rankingTypeForEvent(make('2'))).toBe('forest');
		expect(rankingTypeForEvent(make('9'))).toBe('forest');
	});

	test('sprint disciplines (Sprint, Knock-out sprint) → sprint', () => {
		expect(rankingTypeForEvent(make('3'))).toBe('sprint');
		expect(rankingTypeForEvent(make('16'))).toBe('sprint');
	});

	test('relays / multi-stage / training etc. → none', () => {
		expect(rankingTypeForEvent(make('5'))).toBe('none'); // Relays
		expect(rankingTypeForEvent(make('13'))).toBe('none'); // Multi-stage
		expect(rankingTypeForEvent(make('15'))).toBe('none'); // Sprint relay
		expect(rankingTypeForEvent(make('12'))).toBe('none'); // Training
		expect(rankingTypeForEvent(make('999'))).toBe('none');
	});
});
