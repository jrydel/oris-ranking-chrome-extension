import { describe, expect, test } from 'bun:test';
import { parseCoefficient } from '../../src/scripts/compute';

describe('parseCoefficient', () => {
	test('returns fallback for missing input', () => {
		expect(parseCoefficient(undefined, 1)).toBe(1);
		expect(parseCoefficient(null, 1)).toBe(1);
		expect(parseCoefficient('', 1)).toBe(1);
	});

	test('parses numeric strings with dot decimal', () => {
		expect(parseCoefficient('1.5', 0)).toBe(1.5);
		expect(parseCoefficient('1.06', 0)).toBe(1.06);
	});

	test('parses Czech-localized comma decimal as ORIS returns it', () => {
		expect(parseCoefficient('1,06', 0)).toBe(1.06);
		expect(parseCoefficient('0,15', 1)).toBe(0.15);
		expect(parseCoefficient('1,00', 0)).toBe(1);
	});

	test('falls back when value is not a number', () => {
		expect(parseCoefficient('garbage', 0.42)).toBe(0.42);
	});

	test('respects an explicit zero (does not fall back)', () => {
		expect(parseCoefficient('0', 1)).toBe(0);
	});
});
