import { Trend } from './types';
export declare function discoverTrends(nicheId: string, forceRefresh?: boolean): Promise<Trend[]>;
export declare function clearTrendCache(nicheId?: string): void;
export declare const getTrends: typeof discoverTrends;
//# sourceMappingURL=trendService.d.ts.map