import { getRankingDates } from './scripts/fetcher';

processRankingDates();

chrome.alarms.onAlarm.addListener(function () {
	processRankingDates();
});

chrome.alarms.create('', { periodInMinutes: 60 });

async function processRankingDates() {
	const data = await getRankingDates();
	chrome.storage.local.set({ 'rankingDates': data }, () => {
		if (chrome.runtime.lastError) {
			console.error('Error setting rankingDates to ' + JSON.stringify(data) + ': ' + chrome.runtime.lastError.message);
		}
	});
}
