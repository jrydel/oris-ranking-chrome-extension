import { computeEntries } from './compute';
import { getEvent, getRanking } from './fetcher';

async function process() {
	const eventId = parseInt(location.href.split('=')[1]);
	const event = await getEvent(eventId);

	const eventYear = parseInt(event.Date.split('-')[0]);

	const ranking = await getRanking(eventYear, event.RankingDecisionDate);

	const tables = document.querySelectorAll('tbody');
	tables.forEach((table, index) => computeEntries(index, table, ranking));
}

process();
