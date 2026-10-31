/** Command pattern: each move is an object, enabling history, undo and redo. DRAFT (P1). */
export interface IMoveCommand<TState> {
  execute(state: TState): TState;
  undo(state: TState): TState;
}
