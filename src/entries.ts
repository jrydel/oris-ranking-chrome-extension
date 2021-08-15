import { computeEntries } from './scripts/compute';
import { getEvent, getRanking } from './scripts/fetcher';
import { createOrUpdateNotificationBar } from './scripts/utils';

async function process() {
	createOrUpdateNotificationBar('Nacitam data z ORISU ...');

	const eventId = parseInt(location.href.split('=')[1]);
	const event = await getEvent(eventId);

	const eventYear = parseInt(event.Date.split('-')[0]);

	const ranking = await getRanking(eventYear, event.RankingDecisionDate);

	const tables = document.querySelectorAll('tbody');
	tables.forEach((table, index) => computeEntries(index, table, ranking));

	createOrUpdateNotificationBar('Spocitano');
}

process();
