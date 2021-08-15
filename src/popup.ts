chrome.storage.local.get('rankingDates', (rankingDates: string[]) => {
	const select = document.querySelector('#rankingDate');

	rankingDates.forEach(item => {
		const option = document.createElement('option');
		option.value = item;
		option.innerText = item;
		select.appendChild(option);
	});
});
