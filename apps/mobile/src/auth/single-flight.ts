export function singleFlight<T>(task: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;

  return () => {
    if (!inFlight) {
      inFlight = Promise.resolve()
        .then(task)
        .finally(() => {
          inFlight = null;
        });
    }

    return inFlight;
  };
}
