/** Source of pieces: seeded random generator or fixed list per level (Strategy). DRAFT (P1). */
export interface IPieceSource<TPiece> {
  next(): TPiece;
  peek(count: number): readonly TPiece[];
  hasNext(): boolean;
}
