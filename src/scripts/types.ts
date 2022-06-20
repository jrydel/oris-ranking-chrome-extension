export type ApiResponse<T> = {
    Data: T;
};
export type Event = {
    Date: string;
    Ranking: string;
    RankingKoef: string;
    RankingKS: string;
    RankingDecisionDate: string;
};

export type Athlete = {
    id: number;
    ranking: number;
    rvp?: boolean;
    position?: number;
    time?: number;
    result?: number;
};
