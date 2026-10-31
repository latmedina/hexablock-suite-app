/** Segregated capability interfaces (ISP). A variant implements only what it needs. DRAFT (P1). */

export interface IUndoable {
  canUndo(): boolean;
  undo(): void;
}

export interface IRedoable {
  canRedo(): boolean;
  redo(): void;
}

export interface ITimed {
  readonly elapsedMs: number;
}

export interface IRandomSeeded {
  readonly seed: number;
}

/** Bounded generic used by Hexa Merge: TCell extends IMergeable<TCell> (F-bounded). */
export interface IMergeable<T extends IMergeable<T>> {
  canMergeWith(other: T): boolean;
  mergeWith(other: T): T;
}
