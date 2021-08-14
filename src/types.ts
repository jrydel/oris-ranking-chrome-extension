export class ApiResponse<T> {
	Data: T;
}

export class Event {
	Date: string;
	Ranking: string;
	RankingKoef: string;
	RankingKS: string;
	RankingDecisionDate: string;
}

export class Athlete {
	id: number;
	name: string;
	regNumber: string;
	ranking: number;
	rvp?: boolean;
	position?: number;
	time?: number;
	result?: number;
}

export class Registration {
	UserID: string;
	FirstName: string;
	LastName: string;
	RegNo: string;
}
