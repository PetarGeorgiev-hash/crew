/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "fragment AuthUserFields on UserModel {\n  id\n  email\n  userName\n  avatarUrl\n  emailVerified\n}\n\nmutation Login($loginModel: LoginModel!) {\n  login(loginModel: $loginModel) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation WebLogin($loginModel: LoginModel!) {\n  webLogin(loginModel: $loginModel) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n  }\n}\n\nmutation Register($registerModel: RegisterModel!) {\n  register(registerModel: $registerModel) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation Refresh($refreshTokenInput: RefreshTokenInput!) {\n  refresh(refreshTokenInput: $refreshTokenInput) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation WebRefreshToken {\n  webRefresh {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n  }\n}\n\nquery GetProfile {\n  getProfile {\n    ...AuthUserFields\n  }\n}\n\nmutation Logout {\n  logout {\n    success\n  }\n}\n\nmutation WebLogout {\n  webLogout {\n    success\n  }\n}\n\nmutation SignInWithGoogle($idToken: String!) {\n  signInWithGoogle(idToken: $idToken) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation WebSignInWithGoogle($idToken: String!) {\n  webSignInWithGoogle(idToken: $idToken) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n  }\n}": typeof types.AuthUserFieldsFragmentDoc,
};
const documents: Documents = {
    "fragment AuthUserFields on UserModel {\n  id\n  email\n  userName\n  avatarUrl\n  emailVerified\n}\n\nmutation Login($loginModel: LoginModel!) {\n  login(loginModel: $loginModel) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation WebLogin($loginModel: LoginModel!) {\n  webLogin(loginModel: $loginModel) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n  }\n}\n\nmutation Register($registerModel: RegisterModel!) {\n  register(registerModel: $registerModel) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation Refresh($refreshTokenInput: RefreshTokenInput!) {\n  refresh(refreshTokenInput: $refreshTokenInput) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation WebRefreshToken {\n  webRefresh {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n  }\n}\n\nquery GetProfile {\n  getProfile {\n    ...AuthUserFields\n  }\n}\n\nmutation Logout {\n  logout {\n    success\n  }\n}\n\nmutation WebLogout {\n  webLogout {\n    success\n  }\n}\n\nmutation SignInWithGoogle($idToken: String!) {\n  signInWithGoogle(idToken: $idToken) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation WebSignInWithGoogle($idToken: String!) {\n  webSignInWithGoogle(idToken: $idToken) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n  }\n}": types.AuthUserFieldsFragmentDoc,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "fragment AuthUserFields on UserModel {\n  id\n  email\n  userName\n  avatarUrl\n  emailVerified\n}\n\nmutation Login($loginModel: LoginModel!) {\n  login(loginModel: $loginModel) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation WebLogin($loginModel: LoginModel!) {\n  webLogin(loginModel: $loginModel) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n  }\n}\n\nmutation Register($registerModel: RegisterModel!) {\n  register(registerModel: $registerModel) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation Refresh($refreshTokenInput: RefreshTokenInput!) {\n  refresh(refreshTokenInput: $refreshTokenInput) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation WebRefreshToken {\n  webRefresh {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n  }\n}\n\nquery GetProfile {\n  getProfile {\n    ...AuthUserFields\n  }\n}\n\nmutation Logout {\n  logout {\n    success\n  }\n}\n\nmutation WebLogout {\n  webLogout {\n    success\n  }\n}\n\nmutation SignInWithGoogle($idToken: String!) {\n  signInWithGoogle(idToken: $idToken) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation WebSignInWithGoogle($idToken: String!) {\n  webSignInWithGoogle(idToken: $idToken) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n  }\n}"): (typeof documents)["fragment AuthUserFields on UserModel {\n  id\n  email\n  userName\n  avatarUrl\n  emailVerified\n}\n\nmutation Login($loginModel: LoginModel!) {\n  login(loginModel: $loginModel) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation WebLogin($loginModel: LoginModel!) {\n  webLogin(loginModel: $loginModel) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n  }\n}\n\nmutation Register($registerModel: RegisterModel!) {\n  register(registerModel: $registerModel) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation Refresh($refreshTokenInput: RefreshTokenInput!) {\n  refresh(refreshTokenInput: $refreshTokenInput) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation WebRefreshToken {\n  webRefresh {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n  }\n}\n\nquery GetProfile {\n  getProfile {\n    ...AuthUserFields\n  }\n}\n\nmutation Logout {\n  logout {\n    success\n  }\n}\n\nmutation WebLogout {\n  webLogout {\n    success\n  }\n}\n\nmutation SignInWithGoogle($idToken: String!) {\n  signInWithGoogle(idToken: $idToken) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n    refreshToken\n  }\n}\n\nmutation WebSignInWithGoogle($idToken: String!) {\n  webSignInWithGoogle(idToken: $idToken) {\n    user {\n      ...AuthUserFields\n    }\n    accessToken\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;