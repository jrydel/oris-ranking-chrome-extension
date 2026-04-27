import { bootstrap } from './scripts/bootstrap';
import { computeResults } from './scripts/compute';

bootstrap((tables, ranking, event) => {
	tables.forEach((table) => {
		computeResults(table, ranking, event);
	});
});
