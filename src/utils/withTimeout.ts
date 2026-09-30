/**
 * Bound a promise in time.
 *
 * Several operations in this app await network calls that have no timeout of
 * their own. When one of them stalls, the UI spins forever with no error, which
 * is impossible to diagnose. Wrapping them here turns a silent hang into a
 * readable message naming the step that stalled.
 */
export class TimeoutError extends Error {
  readonly step: string;

  constructor(step: string, ms: number) {
    super(
      `Le serveur n'a pas répondu dans le délai imparti (${Math.round(ms / 1000)} s) — étape : ${step}.`
    );
    this.name = 'TimeoutError';
    this.step = step;
  }
}

export function withTimeout<T>(promise: PromiseLike<T>, ms: number, step: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(step, ms)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
