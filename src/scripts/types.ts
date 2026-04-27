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

/**
 * Per the 2026 Soutěžní řád (V.1, V.2): forest and sprint are separate rankings.
 * Mapped from {@link Discipline.ID}.
 *  - `forest` (rt=2): Long (1), Middle (2), Night (9)
 *  - `sprint` (rt=8): Sprint (3), Knock-out sprint (16)
 *  - `none`: any other discipline (no preview is shown)
 */
export type RankingType = 'forest' | 'sprint' | 'none';
