import { describe, expect, test } from 'bun:test';
import { extractIdFromHref, findClosestDate, normalizeString, parsePosition, parseTime } from '../../src/scripts/utils';

describe('parseTime', () => {
	test('returns null for empty / nullish input', () => {
		expect(parseTime('')).toBeNull();
		expect(parseTime(null)).toBeNull();
		expect(parseTime(undefined)).toBeNull();
		expect(parseTime('   ')).toBeNull();
	});

	test('returns null for non-time markers', () => {
		expect(parseTime('DISK')).toBeNull();
		expect(parseTime('DSQ')).toBeNull();
		expect(parseTime('DNS')).toBeNull();
		expect(parseTime('DNF')).toBeNull();
		expect(parseTime('vzd.')).toBeNull();
		expect(parseTime('MK')).toBeNull();
		expect(parseTime('—')).toBeNull();
		expect(parseTime('garbage')).toBeNull();
	});

	test('parses M:SS / MM:SS / H:MM:SS / HH:MM:SS to seconds', () => {
		expect(parseTime('1:23')).toBe(83);
		expect(parseTime('12:34')).toBe(754);
		expect(parseTime('1:23:45')).toBe(5025);
		expect(parseTime('10:00:00')).toBe(36000);
		expect(parseTime('0:30')).toBe(30);
	});

	test('rejects malformed time strings', () => {
		// single-digit seconds field
		expect(parseTime('1:2')).toBeNull();
	});
});

describe('parsePosition', () => {
	test('returns null for empty / nullish / non-numeric markers', () => {
		expect(parsePosition('')).toBeNull();
		expect(parsePosition(null)).toBeNull();
		expect(parsePosition(undefined)).toBeNull();
		expect(parsePosition('DISK')).toBeNull();
		expect(parsePosition('—')).toBeNull();
	});

	test('parses numeric positions', () => {
		expect(parsePosition('1.')).toBe(1);
		expect(parsePosition('42.')).toBe(42);
		expect(parsePosition('42')).toBe(42);
		expect(parsePosition('001')).toBe(1);
	});

	test('returns null for non-positive', () => {
		expect(parsePosition('0')).toBeNull();
	});
});

describe('extractIdFromHref', () => {
	test('returns null for empty / null / undefined', () => {
		expect(extractIdFromHref('')).toBeNull();
		expect(extractIdFromHref(null)).toBeNull();
		expect(extractIdFromHref(undefined)).toBeNull();
	});

	test('extracts id parameter from typical hrefs', () => {
		expect(extractIdFromHref('?id=123')).toBe(123);
		expect(extractIdFromHref('/foo?bar=1&id=456')).toBe(456);
		expect(extractIdFromHref('/path?id=789&other=x')).toBe(789);
	});

	test('returns null when id is not present', () => {
		expect(extractIdFromHref('?notid=123')).toBeNull();
	});
});

describe('findClosestDate', () => {
	test('picks last day of preceding month per SŘ rule', () => {
		// Event in May → April snapshot, not May.
		const dates = ['2025-03-31', '2025-04-30', '2025-05-31'];
		expect(findClosestDate('2025-05-15', dates)).toBe('2025-04-30');
		expect(findClosestDate('2025-05-31', dates)).toBe('2025-04-30');
	});

	test('handles year rollover (January event → December prev-year snapshot)', () => {
		const dates = ['2025-11-30', '2025-12-31', '2026-01-31'];
		expect(findClosestDate('2026-01-15', dates)).toBe('2025-12-31');
	});

	test('returns undefined when no snapshot exists before event month', () => {
		const dates = ['2025-02-01', '2025-03-01'];
		expect(findClosestDate('2025-01-15', dates)).toBeUndefined();
	});

	test('first day of month uses preceding-month snapshot', () => {
		const dates = ['2024-12-31', '2025-01-31'];
		expect(findClosestDate('2025-01-01', dates)).toBe('2024-12-31');
	});
});

describe('normalizeString', () => {
	test('returns undefined for nullish / empty', () => {
		expect(normalizeString(undefined)).toBeUndefined();
		expect(normalizeString(null)).toBeUndefined();
		expect(normalizeString('')).toBeUndefined();
	});

	test('strips diacritics and lowercases', () => {
		expect(normalizeString('Příjmení')).toBe('prijmeni');
	});

	test('removes double-spaces and CR/LF, lowercases', () => {
		// existing impl: NFD + strip combining marks + remove "  " | \r\n | \n | \r + lowercase
		expect(normalizeString('  Reg. Číslo  ')).toBe('reg. cislo');
		expect(normalizeString('foo\r\nbar')).toBe('foobar');
		expect(normalizeString('foo\nbar')).toBe('foobar');
	});
});
