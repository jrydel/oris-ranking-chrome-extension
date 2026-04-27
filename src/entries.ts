import { bootstrap } from './scripts/bootstrap';
import { computeEntries } from './scripts/compute';

bootstrap((tables, ranking) => {
	tables.forEach((table, index) => {
		computeEntries(index, table, ranking);
	});
});
