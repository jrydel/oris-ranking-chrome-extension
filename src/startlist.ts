import { computeEntries } from './scripts/compute';
import { getEvent, getRanking, getRankingDates } from './scripts/fetcher';
import { createOrUpdateNotificationBar, findClosestDate } from './scripts/utils';

async function process() {
	createOrUpdateNotificationBar('Nacitam data z ORISU ...');

	const eventId = parseInt(location.href.split('=')[1]);
	const event = await getEvent(eventId);

	const eventYear = parseInt(event.Date.split('-')[0]);

	const rankingDates = await getRankingDates();
	const closesDate = findClosestDate(event.Date, rankingDates);
	const ranking = await getRanking(eventYear, closesDate);

	const tables = document.querySelectorAll('tbody');
	tables.forEach((table, index) => computeEntries(index, table, ranking));

	createOrUpdateNotificationBar('Spocitano');
}

process();
