import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { ErrorLink } from "@apollo/client/link/error";
import { Observable, type Subscription } from "rxjs";

export function createAuthErrorLink(refreshSession: () => Promise<unknown>) {
  return new ErrorLink(({ error, operation, forward }) => {
    const isUnauthorized =
      (CombinedGraphQLErrors.is(error) &&
        error.errors.some(
          ({ extensions }) => extensions?.code === "UNAUTHENTICATED",
        )) ||
      (ServerError.is(error) && error.statusCode === 401);

    if (
      !isUnauthorized ||
      operation.getContext().authRetryAttempted ||
      operation.getContext().skipAuthRefresh
    ) {
      return;
    }

    operation.setContext({ authRetryAttempted: true });

    return new Observable((observer) => {
      let cancelled = false;
      let retrySubscription: Subscription | undefined;

      void refreshSession()
        .then((session) => {
          if (session == null) {
            throw new Error("No refresh session is available");
          }
          if (cancelled) return;

          retrySubscription = forward(operation).subscribe({
            next: (value) => observer.next(value),
            error: (retryError) => observer.error(retryError),
            complete: () => observer.complete(),
          });
        })
        .catch((refreshError: unknown) => {
          if (!cancelled) {
            observer.error(
              refreshError instanceof Error
                ? refreshError
                : new Error(String(refreshError)),
            );
          }
        });

      return () => {
        cancelled = true;
        retrySubscription?.unsubscribe();
      };
    });
  });
}
