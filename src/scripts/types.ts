export type ApiResponse<T> = {
	Data: T;
};

export type Discipline = {
	ID: string;
	ShortName: string;
	NameCZ: string;
	NameEN: string;
};

export type Event = {
	Date: string;
	Ranking: string;
	RankingKoef: string;
	RankingKS: string;
	RankingDecisionDate: string;
	Discipline: Discipline;
};

export type Athlete = {
	id: number;
	ranking: number;
	rvp?: boolean;
	position?: number | null;
	time?: number | null;
	result?: number;
};

/** The 2026 Soutěžní řád splits ranking into two: V.1 forest and V.2 sprint. */
export type RankingType = 'forest' | 'sprint';
