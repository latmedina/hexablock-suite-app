/** Progress model: endless high score (Lines, Merge) vs levels with stars (Fit, Sort). DRAFT (P1). */
export interface ProgressSnapshot {
  readonly gameId: string;
  readonly levelId?: string;
  readonly score: number;
  readonly stars?: number;
}

export interface IProgressModel {
  record(current: ProgressSnapshot | undefined, result: ProgressSnapshot): ProgressSnapshot;
  isUnlocked(levelId: string, completed: readonly ProgressSnapshot[]): boolean;
}
