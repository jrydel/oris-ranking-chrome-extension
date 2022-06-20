import { computeStartList } from './scripts/compute';
import { getEvent, getRanking, getRankingDates } from './scripts/fetcher';
import { process, findClosestDate } from './scripts/utils';

process(async () => {
    const eventId = parseInt(location.href.split('=')[1]);
    const [event, rankingDates] = await Promise.all([getEvent(eventId), getRankingDates()]);

    const closesDate = findClosestDate(event.Date, rankingDates);
    const [maleRanking, femaleRanking] = await Promise.all([getRanking(closesDate, 'M'), getRanking(closesDate, 'F')]);

    const tables = document.querySelectorAll('tbody');
    tables.forEach((table, index) => computeStartList(index, table, [...maleRanking, ...femaleRanking]));
});
