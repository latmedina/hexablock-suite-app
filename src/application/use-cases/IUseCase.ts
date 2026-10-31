/**
 * Every use case implements this single-method contract so that aspects (logging, profiling,
 * retry, auth, cache) can wrap ANY use case as a Decorator — AOP without libraries. DRAFT (P1).
 */
export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
