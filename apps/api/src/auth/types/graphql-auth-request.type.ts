export type GraphqlAuthRequest = {
  headers?: {
    authorization?: string;
  };
  user?: {
    sub: string;
    email: string;
  };
};
