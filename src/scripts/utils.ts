export const regexRankingId = /(?<=id=)(.*?)(?=" >)/g;
export const regexEntriesId = /(?<=id=)(.*)/g;

export function normalizeString(text?: string) {
    if (!text) return text;
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/  |\r\n|\n|\r/gm, '')
        .toLowerCase();
}

export function createOrUpdateNotificationBar(text: string) {
    var div = document.querySelector('#rvp-notification-bar');
    if (!div) {
        div = document.createElement('div');
        div.id = 'rvp-notification-bar';
        div.classList.add('notification-container');
        document.body.appendChild(div);

        const img = document.createElement('img');
        img.setAttribute('src', chrome.runtime.getURL('images/icon.png'));
        img.classList.add('rvp-notification-bar-image');
        div.appendChild(img);

        const span = document.createElement('span');
        span.innerHTML = text;
        div.appendChild(span);
    } else {
        div.querySelector('span').innerText = text;
    }
}

export function findClosestDate(date: string, dates: string[]) {
    const time = new Date(date).getTime();
    const filtered = dates.filter((it) => time >= new Date(it).getTime());
    filtered.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return filtered[0];
}

export async function process(fn: () => Promise<void>) {
    createOrUpdateNotificationBar('Nacitam data z ORISU ...');
    await fn();
    createOrUpdateNotificationBar('Spocitano');
}
