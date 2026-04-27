import { getEvent, getRanking, getRankingDates } from './fetcher';
import type { Athlete, Event } from './types';
import { createOrUpdateNotificationBar, findClosestDate, getEventIdFromLocation, rankingTypeForEvent } from './utils';

export type BootstrapHandler = (tables: NodeListOf<HTMLTableElement>, ranking: Athlete[], event: Event) => void;

export async function bootstrap(handler: BootstrapHandler): Promise<void> {
	createOrUpdateNotificationBar('Načítám data z ORISu…');
	try {
		const eventId = getEventIdFromLocation();
		if (eventId === null) {
			createOrUpdateNotificationBar('Chyba při načítání dat z ORISu');
			return;
		}

		const [event, rankingDates] = await Promise.all([getEvent(eventId), getRankingDates()]);
		const closestDate = findClosestDate(event.Date, rankingDates);
		if (!closestDate) {
			createOrUpdateNotificationBar('Chyba při načítání dat z ORISu');
			return;
		}

		const kind = rankingTypeForEvent(event);
		if (kind === 'none') {
			createOrUpdateNotificationBar('Závod není zařazen do rankingu');
			return;
		}

		const [maleRanking, femaleRanking] = await Promise.all([getRanking(closestDate, 'M', kind), getRanking(closestDate, 'F', kind)]);

		const ranking = [...maleRanking, ...femaleRanking];
		const tables = document.querySelectorAll<HTMLTableElement>('table');

		createOrUpdateNotificationBar('Počítám…');
		handler(tables, ranking, event);
		createOrUpdateNotificationBar('Spočítáno');
	} catch (err) {
		console.error('oris-ranking-chrome-extension error:', err);
		createOrUpdateNotificationBar('Chyba při načítání dat z ORISu');
	}
}
