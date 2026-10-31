import type {
  AuditEvent,
  AuthResponse,
  RegisterRequest,
  UserProfile,
} from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface CsrfResponse {
  token: string;
  header_name: string;
}

const messages: Record<string, string> = {
  INVALID_CREDENTIALS: "Invalid credentials",
  INVALID_SESSION: "Your session has expired. Please sign in again.",
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You do not have permission to access this page.",
  VALIDATION_ERROR: "Check the submitted fields.",
  REGISTRATION_FAILED: "Unable to create account with these details",
  RATE_LIMITED: "Too many attempts. Please try again in a minute.",
  CSRF_ERROR: "Security token expired. Please try again.",
};

/** Access credentials stay in this instance; the refresh credential is never readable by JavaScript. */
export class AuthClient {
  private accessToken: string | null = null;
  private csrfPromise: Promise<CsrfResponse> | null = null;
  private refreshPromise: Promise<UserProfile | null> | null = null;
  private readonly expiredListeners = new Set<() => void>();

  constructor(
    private readonly fetcher: typeof fetch = (...args) => fetch(...args),
  ) {}

  onSessionExpired(listener: () => void): () => void {
    this.expiredListeners.add(listener);
    return () => {
      this.expiredListeners.delete(listener);
    };
  }

  private expireSession(): void {
    this.accessToken = null;
    this.expiredListeners.forEach((listener) => listener());
  }

  async login(email: string, password: string): Promise<UserProfile> {
    const session = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.accessToken = session.access_token;
    return session.user;
  }

  register(input: RegisterRequest): Promise<UserProfile> {
    return this.request<UserProfile>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  restoreSession(): Promise<UserProfile | null> {
    if (!this.refreshPromise) {
      const rotate = async (): Promise<UserProfile | null> => {
        try {
          const session = await this.request<AuthResponse>("/auth/refresh", {
            method: "POST",
          });
          this.accessToken = session.access_token;
          return session.user;
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            this.expireSession();
            return null;
          }
          throw error;
        }
      };
      // Serialize cookie rotation across tabs in browsers supporting the Web Locks API.
      const operation =
        typeof navigator !== "undefined" && navigator.locks
          ? navigator.locks.request("carebridge-refresh", rotate)
          : rotate();
      this.refreshPromise = operation.finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  async logout(): Promise<void> {
    // Logout must work even when the access JWT has expired.
    await this.request<void>("/auth/logout", { method: "POST" });
    this.accessToken = null;
  }

  getProfile(): Promise<UserProfile> {
    return this.request("/auth/me", {}, true);
  }
  getAudit(): Promise<AuditEvent[]> {
    return this.request("/admin/audit", {}, true);
  }

  private async fetch(input: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetcher(input, {
        signal: AbortSignal.timeout(15000),
        ...init,
        credentials: "same-origin",
        cache: "no-store",
      });
    } catch {
      throw new ApiError(
        0,
        "NETWORK_ERROR",
        "Cannot connect to CareBridge. Please try again.",
      );
    }
  }

  private csrf(): Promise<CsrfResponse> {
    if (!this.csrfPromise) {
      this.csrfPromise = this.fetch("/api/v1/auth/csrf", {
        headers: { Accept: "application/json" },
      })
        .then(async (response) => {
          if (!response.ok)
            throw new ApiError(
              response.status,
              "UNAVAILABLE",
              "CareBridge is temporarily unavailable. Please try again.",
            );
          return (await response.json()) as CsrfResponse;
        })
        .catch((error) => {
          this.csrfPromise = null;
          throw error;
        });
    }
    return this.csrfPromise;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    authorized = false,
    retryAuth = true,
    retryCsrf = true,
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    if (init.method && !["GET", "HEAD"].includes(init.method)) {
      const csrf = await this.csrf();
      headers.set(csrf.header_name, csrf.token);
    }
    if (authorized && this.accessToken)
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    const response = await this.fetch(`/api/v1${path}`, { ...init, headers });
    if (response.status === 401 && authorized && retryAuth) {
      const user = await this.restoreSession();
      if (user)
        return this.request<T>(path, init, authorized, false, retryCsrf);
    }
    if (!response.ok) {
      if (response.status === 401 && authorized) this.expireSession();
      const body = (await response.json().catch(() => ({}))) as {
        code?: string;
      };
      if (response.status === 403 && body.code === "CSRF_ERROR" && retryCsrf) {
        this.csrfPromise = null;
        return this.request<T>(path, init, authorized, retryAuth, false);
      }
      const code = body.code ?? "REQUEST_ERROR";
      throw new ApiError(
        response.status,
        code,
        messages[code] ??
          (response.status >= 500
            ? "CareBridge is temporarily unavailable. Please try again."
            : "Unable to complete request. Please try again."),
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}

export const authClient = new AuthClient();
