import type { ProgressSnapshot } from '../../domain/scoring/IProgressModel';

/** Ports (interfaces) owned by the application layer; adapters implement them (DIP). DRAFT (P1). */

export interface IProgressRepository {
  get(gameId: string, levelId?: string): Promise<ProgressSnapshot | undefined>;
  save(snapshot: ProgressSnapshot): Promise<void>;
  all(gameId: string): Promise<readonly ProgressSnapshot[]>;
}

export interface ILevelRepository<TLevel> {
  list(gameId: string): Promise<readonly TLevel[]>;
  get(gameId: string, levelId: string): Promise<TLevel | undefined>;
}

export interface ILogger {
  info(message: string, data?: unknown): void;
  error(message: string, error?: unknown): void;
}

export interface ISession {
  isAuthenticated(): boolean;
  token(): string | undefined;
}

export interface IClock {
  now(): number;
}
