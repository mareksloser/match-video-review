import { UserManager, WebStorageStateStore, type User as OidcUser } from 'oidc-client-ts';

/** Where to sign in; served by the backend (GET /api/auth/config) so builds don't embed it. */
export interface AuthConfig {
  issuer: string;
  clientId: string;
}

/** The sign-in session with the club IdP, as the API client needs it. Swap for a fake in tests. */
export interface AuthSession {
  config(): Promise<AuthConfig>;
  /** Current access token, renewed with the refresh token when expired; null when signed out. */
  accessToken(): Promise<string | null>;
  /** Redirects to the club login. `returnTo` comes back from completeSignIn(). */
  signIn(returnTo?: string): Promise<void>;
  /** Handles the redirect back from the IdP; returns the path passed to signIn(). */
  completeSignIn(): Promise<string | null>;
  /** Signs out of MVR and of the club IdP (redirects). */
  signOut(): Promise<void>;
  /** Drops the local session only, e.g. when the backend rejects the token. */
  forget(): Promise<void>;
}

export const OIDC_SCOPES = 'openid profile email roles teams offline_access';

type SignInState = { returnTo?: string };

/** oidc-client-ts implementation: Authorization Code + PKCE, tokens in localStorage. */
export class OidcAuthSession implements AuthSession {
  private configPromise: Promise<AuthConfig> | null = null;
  private managerPromise: Promise<UserManager> | null = null;
  private renewing: Promise<OidcUser | null> | null = null;

  constructor(
    private readonly loadConfig: () => Promise<AuthConfig>,
    private readonly origin: string = window.location.origin,
  ) {}

  config(): Promise<AuthConfig> {
    // A failed load (backend down) is not cached, the next call tries again.
    return (this.configPromise ??= this.loadConfig().catch((e: unknown) => {
      this.configPromise = null;
      throw e;
    }));
  }

  async accessToken(): Promise<string | null> {
    const manager = await this.manager();
    const user = await manager.getUser();
    if (!user) return null;
    if (!user.expired) return user.access_token;
    if (!user.refresh_token) {
      await manager.removeUser();
      return null;
    }
    try {
      return (await this.renew(manager))?.access_token ?? null;
    } catch {
      await manager.removeUser(); // refresh token expired or revoked: signed out
      return null;
    }
  }

  async signIn(returnTo?: string): Promise<void> {
    const state: SignInState = { returnTo };
    await (await this.manager()).signinRedirect({ state });
  }

  async completeSignIn(): Promise<string | null> {
    const user = await (await this.manager()).signinRedirectCallback();
    return (user.state as SignInState | undefined)?.returnTo ?? null;
  }

  async signOut(): Promise<void> {
    const manager = await this.manager();
    try {
      await manager.signoutRedirect(); // ends the IdP session too, then comes back to post_logout_redirect_uri
    } catch {
      await manager.removeUser(); // IdP unreachable: at least forget the tokens here
    }
  }

  async forget(): Promise<void> {
    await (await this.manager()).removeUser();
  }

  /** Several API calls may hit an expired token at once; they share one refresh. */
  private renew(manager: UserManager): Promise<OidcUser | null> {
    return (this.renewing ??= manager.signinSilent().finally(() => {
      this.renewing = null;
    }));
  }

  private manager(): Promise<UserManager> {
    return (this.managerPromise ??= this.config()
      .then(
        (config) =>
          new UserManager({
            authority: config.issuer,
            client_id: config.clientId,
            redirect_uri: `${this.origin}/auth/callback`,
            post_logout_redirect_uri: `${this.origin}/`,
            response_type: 'code',
            scope: OIDC_SCOPES,
            userStore: new WebStorageStateStore({ store: window.localStorage }),
            automaticSilentRenew: true,
            loadUserInfo: false, // roles and teams are in the access token, the backend reads them there
          }),
      )
      .catch((e: unknown) => {
        this.managerPromise = null;
        throw e;
      }));
  }
}
