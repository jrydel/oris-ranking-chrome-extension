import { bootstrap } from './scripts/bootstrap';
import { computeStartList } from './scripts/compute';

bootstrap((tables, ranking) => {
	tables.forEach((table, index) => {
		computeStartList(index, table, ranking);
	});
});
