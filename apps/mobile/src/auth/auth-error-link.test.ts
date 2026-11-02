import { ApolloClient, ApolloLink, gql, InMemoryCache } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { Observable, firstValueFrom } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { createAuthErrorLink } from "./auth-error-link";
import { singleFlight } from "./single-flight";

const firstQuery = gql`
  query FirstQuery {
    test
  }
`;

const secondQuery = gql`
  query SecondQuery {
    test
  }
`;

function unauthorizedError() {
  return new CombinedGraphQLErrors({
    errors: [
      {
        message: "Unauthorized",
        extensions: { code: "UNAUTHENTICATED" },
      },
    ],
  });
}

function failingOnceLink(attempts: Map<string, number>) {
  return new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        const operationName = operation.operationName ?? "";
        const count = (attempts.get(operationName) ?? 0) + 1;
        attempts.set(operationName, count);
        if (count === 1) {
          observer.error(unauthorizedError());
          return;
        }

        observer.next({ data: { test: true } });
        observer.complete();
      }),
  );
}

function execute(link: ApolloLink, query: typeof firstQuery, context = {}) {
  const client = new ApolloClient({
    link: ApolloLink.empty(),
    cache: new InMemoryCache(),
  });
  return ApolloLink.execute(link, { query, context }, { client });
}

describe("createAuthErrorLink", () => {
  it("refreshes and retries an unauthorized request once", async () => {
    const attempts = new Map<string, number>();
    const refreshSession = vi.fn().mockResolvedValue({});
    const link = createAuthErrorLink(refreshSession).concat(
      failingOnceLink(attempts),
    );

    const result = await firstValueFrom(execute(link, firstQuery));

    expect(result.data).toEqual({ test: true });
    expect(attempts.get("FirstQuery")).toBe(2);
    expect(refreshSession).toHaveBeenCalledOnce();
  });

  it("shares a refresh across concurrent unauthorized requests", async () => {
    const attempts = new Map<string, number>();
    let resolveRefresh!: (value: object) => void;
    const refresh = vi.fn(
      () =>
        new Promise<object>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const refreshSession = singleFlight(refresh);
    const link = createAuthErrorLink(refreshSession).concat(
      failingOnceLink(attempts),
    );

    const first = firstValueFrom(execute(link, firstQuery));
    const second = firstValueFrom(execute(link, secondQuery));

    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    resolveRefresh({});

    const results = await Promise.all([first, second]);
    expect(results.map((result) => result.data)).toEqual([
      { test: true },
      { test: true },
    ]);
    expect(attempts.get("FirstQuery")).toBe(2);
    expect(attempts.get("SecondQuery")).toBe(2);
  });

  it("does not retry the request when refresh fails", async () => {
    const attempts = new Map<string, number>();
    const refreshError = new Error("Refresh failed");
    const refreshSession = vi.fn().mockRejectedValue(refreshError);
    const link = createAuthErrorLink(refreshSession).concat(
      failingOnceLink(attempts),
    );

    await expect(firstValueFrom(execute(link, firstQuery))).rejects.toBe(
      refreshError,
    );
    expect(attempts.get("FirstQuery")).toBe(1);
    expect(refreshSession).toHaveBeenCalledOnce();
  });

  it("does not retry when there is no refresh session", async () => {
    const attempts = new Map<string, number>();
    const refreshSession = vi.fn().mockResolvedValue(null);
    const link = createAuthErrorLink(refreshSession).concat(
      failingOnceLink(attempts),
    );

    await expect(firstValueFrom(execute(link, firstQuery))).rejects.toThrow(
      "No refresh session is available",
    );
    expect(attempts.get("FirstQuery")).toBe(1);
    expect(refreshSession).toHaveBeenCalledOnce();
  });

  it("skips refresh when the operation opts out", async () => {
    const attempts = new Map<string, number>();
    const refreshSession = vi.fn().mockResolvedValue({});
    const link = createAuthErrorLink(refreshSession).concat(
      failingOnceLink(attempts),
    );

    await expect(
      firstValueFrom(execute(link, firstQuery, { skipAuthRefresh: true })),
    ).rejects.toMatchObject({
      message: "Unauthorized",
    });
    expect(attempts.get("FirstQuery")).toBe(1);
    expect(refreshSession).not.toHaveBeenCalled();
  });
});
