import type { Event, RankingType } from './types';

export const regexRankingId = /[?&]id=(\d+)/;
export const regexEntriesId = /[?&]id=(\d+)/;

/**
 * 2026 Soutěžní řád discipline → ranking mapping. IDs come from
 * `Event.Discipline.ID` (ORIS internal). Anything not listed is not part of
 * either ranking (relays, multi-stage, training, etc.).
 */
const RANKING_BY_DISCIPLINE: Record<string, 'forest' | 'sprint'> = {
	'1': 'forest', // Dlouhá trať
	'2': 'forest', // Střední trať
	'9': 'forest', // Noční
	'3': 'sprint', // Sprint
	'16': 'sprint', // Knock-out sprint
};

export function rankingTypeForEvent(event: Event): RankingType | null {
	const kind = RANKING_BY_DISCIPLINE[event.Discipline?.ID];
	if (!kind) return null;
	// 2025-era events were scored against the single "Standardní" ranking (rt=1);
	// the new forest/sprint split started 2026-01-01.
	if (event.Date < '2026-01-01') return 'legacy';
	return kind;
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

/** Notification bar lifecycle. Single mutable timer covers both the pre-fade wait
 *  and the post-fade removal so back-to-back updates can't leak a stale removal. */
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

function cancelTimer(): void {
	if (pendingTimer) clearTimeout(pendingTimer);
	pendingTimer = null;
}

export function createOrUpdateNotificationBar(text: string): void {
	cancelTimer();
	let div = document.querySelector<HTMLDivElement>('#rvp-notification-bar');
	if (!div) {
		div = document.createElement('div');
		div.id = 'rvp-notification-bar';
		document.body.appendChild(div);

		const img = document.createElement('img');
		img.setAttribute('src', chrome.runtime.getURL('images/icon.png'));
		img.classList.add('rvp-notification-bar-image');
		div.appendChild(img);

		div.appendChild(document.createElement('span'));
	}
	div.classList.remove('orx-bar-fade');
	const span = div.querySelector('span');
	if (span) span.textContent = text;
}

/** Fade out and remove the bar after a delay. Idempotent across calls. */
export function fadeNotificationBar(delayMs = 2500): void {
	const div = document.querySelector<HTMLDivElement>('#rvp-notification-bar');
	if (!div) return;
	cancelTimer();
	pendingTimer = setTimeout(() => {
		div.classList.add('orx-bar-fade');
		pendingTimer = setTimeout(() => {
			if (div.classList.contains('orx-bar-fade')) div.remove();
			pendingTimer = null;
		}, 500);
	}, delayMs);
}

/**
 * Pick the ranking snapshot ORIS uses as PB. Per SŘ V.1.c / V.2.c: "stav
 * k poslednímu dni měsíce předcházejícího konání závodu" — for an event in
 * May, the April snapshot; for January, December of the previous year.
 *
 * Implemented via ISO-string compare to avoid Date timezone pitfalls.
 */
export function findClosestDate(date: string, dates: string[]): string | undefined {
	const firstOfEventMonth = `${date.slice(0, 7)}-01`;
	const filtered = dates.filter((d) => d < firstOfEventMonth);
	filtered.sort().reverse();
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

/** Inverse of {@link parseTime}: total seconds → "M:SS" or "H:MM:SS". Returns "–" for 0/missing. */
export function formatTime(seconds: number): string {
	if (!seconds) return '–';
	const s = Math.round(seconds);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	const mm = String(m).padStart(2, '0');
	const ss = String(sec).padStart(2, '0');
	return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
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
