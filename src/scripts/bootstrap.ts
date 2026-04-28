import { getEvent, getRanking, getRankingDates } from './fetcher';
import type { Athlete, Event } from './types';
import { createOrUpdateNotificationBar, fadeNotificationBar, findClosestDate, getEventIdFromLocation, rankingTypeForEvent } from './utils';

export type BootstrapHandler = (tables: NodeListOf<HTMLTableElement>, ranking: ReadonlyMap<number, Athlete>, event: Event) => void;

const ERROR_MSG = 'Chyba při načítání dat z ORISu';

export async function bootstrap(handler: BootstrapHandler): Promise<void> {
	createOrUpdateNotificationBar('Načítám data z ORISu…');
	try {
		const eventId = getEventIdFromLocation();
		if (eventId === null) return fail();

		const [event, rankingDates] = await Promise.all([getEvent(eventId), getRankingDates()]);
		const closestDate = findClosestDate(event.Date, rankingDates);
		if (!closestDate) return fail();

		const kind = rankingTypeForEvent(event);
		if (kind === null) {
			createOrUpdateNotificationBar('Závod není zařazen do rankingu');
			fadeNotificationBar(4000);
			return;
		}

		const [men, women] = await Promise.all([getRanking(closestDate, 'M', kind), getRanking(closestDate, 'F', kind)]);
		const ranking = new Map<number, Athlete>();
		for (const a of men) ranking.set(a.id, a);
		for (const a of women) ranking.set(a.id, a);

		const tables = document.querySelectorAll<HTMLTableElement>('table');
		createOrUpdateNotificationBar('Počítám…');
		handler(tables, ranking, event);
		createOrUpdateNotificationBar('Spočítáno');
		fadeNotificationBar();
	} catch (err) {
		console.error('oris-ranking-chrome-extension error:', err);
		fail();
	}
}

function fail(): void {
	createOrUpdateNotificationBar(ERROR_MSG);
}
