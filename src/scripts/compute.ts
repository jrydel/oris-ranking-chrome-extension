import { Athlete } from './types';
import { createOrUpdateNotificationBar, normalizeString, regexEntriesId } from './utils';

export function computeEntries(index: number, table: HTMLElement, rankingData: Athlete[]) {
    createOrUpdateNotificationBar('Pocitam ...');

    const rows = table.querySelectorAll('tr');

    var tableRanking: Athlete[] = [];
    rows.forEach((row) => {
        const el = row.querySelectorAll('td');
        const href = el[1].querySelector('a')?.getAttribute('href').trim();
        if (!href) return;
        const id = parseInt(href.match(regexEntriesId)[0]);

        const athlete = rankingData.find((it) => it.id === id);
        if (athlete) {
            tableRanking.push(athlete);
        }
    });

    const rvpCount = 4;

    // sort by ranking
    tableRanking.sort((a, b) => b.ranking - a.ranking);

    // set rvp makers
    tableRanking.slice(0, rvpCount).forEach((item) => (item.rvp = true));

    // compute rvp
    const rvp = Math.round(tableRanking.slice(0, rvpCount).reduce((a, b) => a + b.ranking, 0) / Math.min(rvpCount, tableRanking.length));

    // update table
    rows.forEach((row) => {
        const el = row.querySelectorAll('td');
        const href = el[1].querySelector('a')?.getAttribute('href').trim();
        if (!href) return;

        const id = parseInt(href.match(regexEntriesId)[0]);

        const athlete = rankingData.find((it) => it.id === id);
        if (athlete) {
            createRVPColumn(el[1], athlete);
        }
    });

    if (tableRanking.length > 0) {
        createRVPAverage(document.querySelectorAll(`div.row.mt-3 h3`)[index], rvp);
    }
}

export function computeStartList(index: number, table: HTMLElement, rankingData: Athlete[]) {
    createOrUpdateNotificationBar('Pocitam ...');

    const rows = table.querySelectorAll('tr');

    var tableRanking: Athlete[] = [];
    rows.forEach((row) => {
        const el = row.querySelectorAll('td');
        const href = el[2].querySelector('a')?.getAttribute('href').trim();
        if (!href) return;

        const id = parseInt(href.match(regexEntriesId)[0]);

        const athlete = rankingData.find((it) => it.id === id);
        if (athlete) {
            tableRanking.push(athlete);
        }
    });

    const rvpCount = 4;

    // sort by ranking
    tableRanking.sort((a, b) => b.ranking - a.ranking);

    // set rvp makers
    tableRanking.slice(0, rvpCount).forEach((item) => (item.rvp = true));

    // compute rvp
    const rvp = Math.round(tableRanking.slice(0, rvpCount).reduce((a, b) => a + b.ranking, 0) / Math.min(rvpCount, tableRanking.length));

    // update table
    rows.forEach((row) => {
        const el = row.querySelectorAll('td');
        const href = el[2].querySelector('a')?.getAttribute('href').trim();
        if (!href) return;

        const id = parseInt(href.match(regexEntriesId)[0]);

        const athlete = rankingData.find((it) => it.id === id);
        if (athlete) {
            createRVPColumn(el[1], athlete);
        }
    });

    if (tableRanking.length > 0) {
        createRVPAverage(document.querySelectorAll(`div.fl.pl-0.pr-0 h3`)[index], rvp);
    }
}

// Hodnocen?? v Rankingu:
// a) do Rankingu se hodnot?? v??sledky ze z??vod?? za??azen??ch do Rankingu konan??ch v obdob?? posledn??ch
// 24 kalend????n??ch m??s??c??;
// b) podkategorie je hodnocena do Rankingu, pokud v n?? dokon??il z??vod alespo?? 4 registrovan??
// z??vodn??ci;
// c) stanoven?? bodov?? hodnoty za dosa??en?? v??sledek v z??vod??:
// BZ = (2 ??? CZ/PC) * PB * (1 ??? KS * (U ??? 1)/(N ??? 1)) * KZ
// BZ ??? body z??skan?? z??vodn??kem v z??vod??, pokud je vypo????tan?? hodnota men???? ne?? 0, uprav?? se na 0;
// CZ??? ??as z??vodn??ka;
// PC ??? st??edn?? ??as ur??en?? z ??as?? 3 nejlep????ch z??vodn??k?? za??azen??ch do Rankingu;
// PB ??? pr??m??rn?? hodnota 4 nejvy??????ch rankingov??ch ????sel z??vodn??k?? (podle stavu k posledn??mu dni
// m??s??ce p??edch??zej??c??ho kon??n?? z??vodu), kte???? se z????astnili z??vodu;
// KS??? faktor ovliv??uj??c?? v??po??et bod?? (hromadn?? start ??? 0,15; start handicapov?? ??? 0,08; start
// intervalov?? ??? 0,00);
// U ??? um??st??n?? z??vodn??ka v z??vod??;
// N ??? po??et hodnocen??ch z??vodn??k?? v kone??n??ch v??sledc??ch;
// KZ??? koeficient z??vodu.
// d) do hodnocen?? z??vodn??ka se po????t?? sou??et 8 nejlep????ch v??sledk??; pokud m?? z??vodn??k m??n?? ne??
// 8 v??sledk??, jsou za chyb??j??c?? v??sledky po????t??ny 0-v?? bodov?? hodnoty; z??vodn??ci jsou v hodnocen??
// se??azeni podle dosa??en??ch bod?? sestupn??;
// e) rankingov?? ????slo i-t??ho z??vodn??ka se ur????:
// R??i = Bi/B1 * 10000
// R??i - rankingov?? ????slo i-t??ho z??vodn??ka
// Bi - sou??et 8 nejlep????ch v??sledk?? i-t??ho z??vodn??ka
// B1 - sou??et 8 nejlep????ch v??sledk?? 1. z??vodn??ka

export function computeResults(table: HTMLElement, rankingData: Athlete[]) {
    createOrUpdateNotificationBar('Pocitam ...');

    const rows = table.querySelectorAll('tr');

    var tableRanking: Athlete[] = [];

    //filter only for class
    rows.forEach((row) => {
        const el = row.querySelectorAll('td');
        const position = el[0].textContent.trim();
        const time = el[5].textContent.trim();
        const href = el[2].querySelector('a')?.getAttribute('href').trim();
        if (!href) return;

        const id = parseInt(href.match(regexEntriesId)[0]);

        const athlete = findOrCreateAthlete(rankingData, id);
        if (athlete) {
            if (position.length > 0) {
                athlete.position = parseInt(position.replace('.', ''));
                const temp = time.split(':');
                athlete.time = 60 * parseInt(temp[0]) + parseInt(temp[1]);
            }
            tableRanking.push(athlete);
        }
    });

    const rvpCount = 4;
    const averateTimeCount = 3;
    const finishedLimit = 4;
    const startCoefficient = 0;
    const eventCoefficient = 1;

    // sort by ranking
    tableRanking.sort((a, b) => b.ranking - a.ranking);
    // set rvp makers
    tableRanking.slice(0, rvpCount).forEach((item) => (item.rvp = true));
    // compute rvp
    const rvp = Math.round(tableRanking.slice(0, rvpCount).reduce((a, b) => a + b.ranking, 0) / Math.min(rvpCount, tableRanking.length));

    // filter only finishers
    const finishedTableRanking = tableRanking.filter((x) => x.position);
    if (finishedTableRanking.length >= finishedLimit) {
        // sort by time
        finishedTableRanking.sort((a, b) => a.time - b.time);
        // compute averageTime
        const averageTime = finishedTableRanking.slice(0, averateTimeCount).reduce((a, b) => a + b.time, 0) / averateTimeCount;

        // compute ranking
        finishedTableRanking.forEach((item) => {
            //(2 ??? CZ/PC) * PB * (1 ??? KS * (U ??? 1)/(N ??? 1)) * KZ
            const result =
                (2 - item.time / averageTime) *
                rvp *
                (1 - (startCoefficient * (item.position - 1)) / (finishedTableRanking.length - 1)) *
                eventCoefficient;
            item.result = result < 0 ? 0 : Math.round(result);
        });
    }
    tableRanking.forEach((it) => {
        const athlete = finishedTableRanking.find((it2) => it.id === it2.id);
        it.result = athlete?.result || 0;
    });

    // update table
    rows.forEach((row) => {
        const el = row.querySelectorAll('td');
        const href = el[2].querySelector('a')?.getAttribute('href').trim();
        if (!href) return;

        const id = parseInt(href.match(regexEntriesId)[0]);

        const athlete = rankingData.find((it) => it.id === id);
        if (athlete) {
            createRVPColumn(el[1], athlete);
            createRankingColumn(el[0], athlete);
        }
    });
}

function createRVPColumn(td: HTMLElement, athlete: Athlete) {
    td.style.display = 'flex';
    td.style.flexDirection = 'row';
    td.style.alignItems = 'center';
    td.style.justifyContent = 'space-between';

    if (athlete.rvp) {
        td.style.backgroundColor = '#42C0FB';
    }

    const rvpSpan = document.createElement('span');
    rvpSpan.textContent = `${athlete.ranking}`;
    rvpSpan.style.fontWeight = 'bold';
    td.appendChild(rvpSpan);
}

function createRankingColumn(td: HTMLElement, athlete: Athlete) {
    td.innerHTML = '';

    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.flexDirection = 'row';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'space-between';
    td.appendChild(div);

    const positionSpan = document.createElement('span');
    positionSpan.textContent = athlete.position ? `${athlete.position}.` : '';
    div.appendChild(positionSpan);

    const resultSpan = document.createElement('span');
    resultSpan.textContent = `${athlete.result}`;
    resultSpan.style.fontWeight = 'bold';
    if (athlete.result !== athlete.ranking) {
        td.style.backgroundColor = athlete.result > athlete.ranking ? 'lightgreen' : '#FFB2B2';
    }
    div.appendChild(resultSpan);
}

function createRVPAverage(el: Element, rvp: number) {
    const rvpSpan = document.createElement('span');
    rvpSpan.innerHTML = `(${rvp})`;
    el.appendChild(rvpSpan);
}

function findOrCreateAthlete(athletes: Athlete[], id: number): Athlete {
    const athlete = athletes.find((it) => it.id === id);
    if (athlete) return athlete;

    const newAthlete = { id, ranking: 0 };
    athletes.push(newAthlete);
    return newAthlete;
}
