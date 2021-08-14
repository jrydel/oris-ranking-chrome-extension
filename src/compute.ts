import { Athlete } from './types';
import { normalizeString } from './utils';

export function computeEntries(index: number, table: HTMLElement, rankingData: Athlete[]) {
	const rows = table.querySelectorAll('tr');

	var tableRanking: Athlete[] = [];
	rows.forEach(row => {
		const attributes = row.querySelectorAll('td');
		const regNumber = normalizeString(attributes[0].textContent);
		const name = normalizeString(attributes[1].textContent);

		const athleteRanking = rankingData.find(item => item.name === name && item.regNumber === regNumber);
		if (athleteRanking) {
			tableRanking.push(athleteRanking);
		}
	});

	const rvpCount = 4;

	// sort by ranking
	tableRanking.sort((a, b) => b.ranking - a.ranking);

	// set rvp makers
	tableRanking.slice(0, rvpCount).forEach(item => (item.rvp = true));

	// compute rvp
	const rvp = Math.round(tableRanking.slice(0, rvpCount).reduce((a, b) => a + b.ranking, 0) / Math.min(rvpCount, tableRanking.length));

	// update table
	rows.forEach(row => {
		const attributes = row.querySelectorAll('td');
		const regNumber = normalizeString(attributes[0].textContent);
		const name = normalizeString(attributes[1].textContent);

		const athlete = rankingData.find(item => item.name === name && item.regNumber === regNumber);
		if (athlete) {
			createRVPColumn(attributes[1], athlete);
		}
	});

	if (tableRanking.length > 0) {
		createRVPAverage(document.querySelectorAll(`div.row.mt-3 h3`)[index], rvp);
	}
}

// Hodnocení v Rankingu:
// a) do Rankingu se hodnotí výsledky ze závodů zařazených do Rankingu konaných v období posledních
// 24 kalendářních měsíců;
// b) podkategorie je hodnocena do Rankingu, pokud v ní dokončil závod alespoň 4 registrovaní
// závodníci;
// c) stanovení bodové hodnoty za dosažený výsledek v závodě:
// BZ = (2 – CZ/PC) * PB * (1 – KS * (U – 1)/(N – 1)) * KZ
// BZ – body získané závodníkem v závodě, pokud je vypočítaná hodnota menší než 0, upraví se na 0;
// CZ– čas závodníka;
// PC – střední čas určený z časů 3 nejlepších závodníků zařazených do Rankingu;
// PB – průměrná hodnota 4 nejvyšších rankingových čísel závodníků (podle stavu k poslednímu dni
// měsíce předcházejícího konání závodu), kteří se zúčastnili závodu;
// KS– faktor ovlivňující výpočet bodů (hromadný start – 0,15; start handicapový – 0,08; start
// intervalový – 0,00);
// U – umístění závodníka v závodě;
// N – počet hodnocených závodníků v konečných výsledcích;
// KZ– koeficient závodu.
// d) do hodnocení závodníka se počítá součet 8 nejlepších výsledků; pokud má závodník méně než
// 8 výsledků, jsou za chybějící výsledky počítány 0-vé bodové hodnoty; závodníci jsou v hodnocení
// seřazeni podle dosažených bodů sestupně;
// e) rankingové číslo i-tého závodníka se určí:
// RČi = Bi/B1 * 10000
// RČi - rankingové číslo i-tého závodníka
// Bi - součet 8 nejlepších výsledků i-tého závodníka
// B1 - součet 8 nejlepších výsledků 1. závodníka

export function computeResults(index: number, table: HTMLElement, rankingData: Athlete[]) {
	const rows = table.querySelectorAll('tr');

	var tableRanking: Athlete[] = [];

	//filter only for class
	rows.forEach(row => {
		const attributes = row.querySelectorAll('td');
		const position = normalizeString(attributes[0].textContent);
		const name = normalizeString(attributes[1].textContent);
		const regNumber = normalizeString(attributes[2].textContent);
		const time = normalizeString(attributes[5].textContent);

		const athlete = rankingData.find(item => item.name === name && item.regNumber === regNumber);
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
	tableRanking.slice(0, rvpCount).forEach(item => (item.rvp = true));
	// compute rvp
	const rvp = Math.round(tableRanking.slice(0, rvpCount).reduce((a, b) => a + b.ranking, 0) / Math.min(rvpCount, tableRanking.length));

	// filter only finishers
	const finishedTableRanking = tableRanking.filter(x => x.position);
	if (finishedTableRanking.length >= finishedLimit) {
		// sort by time
		finishedTableRanking.sort((a, b) => a.time - b.time);
		// compute averageTime
		const averageTime = finishedTableRanking.slice(0, averateTimeCount).reduce((a, b) => a + b.time, 0) / averateTimeCount;

		// compute ranking
		finishedTableRanking.forEach(item => {
			//(2 – CZ/PC) * PB * (1 – KS * (U – 1)/(N – 1)) * KZ
			const result = (2 - item.time / averageTime) * rvp * (1 - (startCoefficient * (item.position - 1)) / (finishedTableRanking.length - 1)) * eventCoefficient;
			item.result = result < 0 ? 0 : Math.round(result);
		});
	}
	tableRanking.forEach(item => {
		const athlete = finishedTableRanking.find(item2 => item.name === item2.name && item.regNumber === item2.regNumber);
		item.result = athlete?.result || 0;
	});

	// update table
	rows.forEach(row => {
		const attributes = row.querySelectorAll('td');
		const name = normalizeString(attributes[1].textContent);
		const regNumber = normalizeString(attributes[2].textContent);

		const athlete = tableRanking.find(item => item.name === name && item.regNumber === regNumber);
		if (athlete) {
			createRVPColumn(attributes[1], athlete);
			createRankingColumn(attributes[0], athlete);
		}
	});

	// if (tableRanking.length > 0) {
	// 	createRVPAverage(document.querySelectorAll(`div.row.mt-3 h3`)[index], rvp);
	// }
}

function createRVPColumn(td: HTMLElement, athlete: Athlete) {
	td.classList.add('rvp-container');

	const div = document.createElement('div');
	div.classList.add('rvp-container');
	td.appendChild(div);

	if (athlete.rvp) {
		const span = document.createElement('span');
		span.classList.add('rvp-badge');
		span.textContent = 'RVP';
		div.appendChild(span);
	}

	const rvpSpan = document.createElement('span');
	rvpSpan.innerHTML = `(${athlete.ranking})`;
	div.appendChild(rvpSpan);
}

function createRankingColumn(td: HTMLElement, athlete: Athlete) {
	td.innerText = '';

	const div = document.createElement('div');
	div.classList.add('rvp-container');
	td.appendChild(div);

	const positionSpan = document.createElement('span');
	positionSpan.textContent = athlete.position ? `${athlete.position}.` : '';
	div.appendChild(positionSpan);

	const resultSpan = document.createElement('span');
	resultSpan.textContent = `(${athlete.result})`;
	if (athlete.result !== athlete.ranking) {
		resultSpan.style.color = athlete.result > athlete.ranking ? 'green' : 'red';
	}
	div.appendChild(resultSpan);
}

function createRVPAverage(el: Element, rvp: number) {
	const rvpSpan = document.createElement('span');
	rvpSpan.innerHTML = `(${rvp})`;
	el.appendChild(rvpSpan);
}
