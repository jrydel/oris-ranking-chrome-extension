import type { Event, RankingType } from './types';

export const regexRankingId = /[?&]id=(\d+)/;
export const regexEntriesId = /[?&]id=(\d+)/;

/**
 * 2026 Soutěžní řád discipline → ranking mapping. IDs come from
 * `Event.Discipline.ID` (ORIS internal). Anything not listed is not part of
 * either ranking (relays, multi-stage, training, etc.).
 */
const RANKING_BY_DISCIPLINE: Record<string, RankingType> = {
	'1': 'forest', // Dlouhá trať
	'2': 'forest', // Střední trať
	'9': 'forest', // Noční
	'3': 'sprint', // Sprint
	'16': 'sprint', // Knock-out sprint
};

export function rankingTypeForEvent(event: Event): RankingType | null {
	return RANKING_BY_DISCIPLINE[event.Discipline?.ID] ?? null;
}

export const getColNames = (table: HTMLElement): string[] => {
	const colNames: string[] = [];
	table.querySelectorAll('thead th').forEach((th) => {
		const normalized = normalizeString(th.textContent);
		colNames.push(normalized ?? '');
	});
	return colNames;
};

export const getColIndex = (cols: string[], ...matches: string[]): number => {
	for (const match of matches) {
		const index = cols.indexOf(match);
		if (index !== -1) {
			return index;
		}
	}
	throw new Error(`Could not find any of the following columns: ${matches.join(', ')}`);
};

export function normalizeString(text?: string | null): string | undefined {
	if (!text) return undefined;
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/ {2}|\r\n|\n|\r/gm, '')
		.toLowerCase();
}

export function createOrUpdateNotificationBar(text: string): void {
	let div = document.querySelector<HTMLDivElement>('#rvp-notification-bar');
	if (!div) {
		div = document.createElement('div');
		div.id = 'rvp-notification-bar';
		div.classList.add('notification-container');
		document.body.appendChild(div);

		const img = document.createElement('img');
		img.setAttribute('src', chrome.runtime.getURL('images/icon.png'));
		img.classList.add('rvp-notification-bar-image');
		div.appendChild(img);

		const span = document.createElement('span');
		span.textContent = text;
		div.appendChild(span);
		return;
	}
	const span = div.querySelector('span');
	if (span) {
		span.textContent = text;
		return;
	}
	const newSpan = document.createElement('span');
	newSpan.textContent = text;
	div.appendChild(newSpan);
}

export function findClosestDate(date: string, dates: string[]): string | undefined {
	const time = new Date(date).getTime();
	const filtered = dates.filter((it) => time >= new Date(it).getTime());
	filtered.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
	return filtered[0];
}

/**
 * Parse a position cell ("1.", "12", "DISK", "—", "") to a number, or null
 * when the athlete didn't get a numeric place.
 */
export function parsePosition(text: string | null | undefined): number | null {
	if (!text) return null;
	const cleaned = text.trim().replace('.', '');
	if (!cleaned) return null;
	const n = Number(cleaned);
	return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Parse an orienteering time cell into total seconds.
 * Accepts M:SS, MM:SS, H:MM:SS, HH:MM:SS. Returns null for blanks
 * and for non-time markers (DISK, DSQ, DNS, DNF, vzd., MK, "—", …).
 */
export function parseTime(text: string | null | undefined): number | null {
	if (!text) return null;
	const cleaned = text.trim();
	if (!cleaned || !/^\d{1,2}(:\d{2}){1,2}$/.test(cleaned)) return null;

	const parts = cleaned.split(':').map(Number);
	if (parts.some((p) => !Number.isFinite(p))) return null;

	if (parts.length === 2) return parts[0] * 60 + parts[1];
	if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
	return null;
}

/** Extract the numeric `id=` value from an ORIS href. Returns null if missing. */
export function extractIdFromHref(href: string | null | undefined): number | null {
	if (!href) return null;
	const match = href.match(regexEntriesId);
	if (!match) return null;
	const n = Number(match[1]);
	return Number.isFinite(n) ? n : null;
}

/** Parse the current page's `?id=` query parameter; null if missing/NaN. */
export function getEventIdFromLocation(): number | null {
	const raw = new URL(location.href).searchParams.get('id');
	if (!raw) return null;
	const n = Number(raw);
	return Number.isFinite(n) ? n : null;
}
