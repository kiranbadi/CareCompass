import { describe, expect, it, vi } from "vitest";
import { AuthClient } from "./client";

const profile = {
  id: "1",
  email: "guardian@example.com",
  role: "care_seeker",
  navigation: [],
};
const response = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const session = (token: string): Response =>
  response({
    access_token: token,
    token_type: "Bearer",
    expires_in: 900,
    user: profile,
  });

describe("AuthClient", () => {
  it("notifies React when the session expires, but not on service outages", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ token: "csrf", header_name: "X-XSRF-TOKEN" }),
      )
      .mockResolvedValueOnce(response({ code: "INVALID_SESSION" }, 401))
      .mockResolvedValueOnce(response({}, 503));
    const client = new AuthClient(fetcher);
    const expired = vi.fn();
    client.onSessionExpired(expired);
    expect(await client.restoreSession()).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
    await expect(client.restoreSession()).rejects.toThrow(
      "temporarily unavailable",
    );
    expect(expired).toHaveBeenCalledOnce();
  });
  it("bootstraps CSRF and submits credentials without persisting tokens in browser storage", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ token: "csrf-token", header_name: "X-XSRF-TOKEN" }),
      )
      .mockResolvedValueOnce(session("access-token"));
    const storage = vi.spyOn(Storage.prototype, "setItem");
    const client = new AuthClient(fetcher);
    expect(await client.login("guardian@example.com", "a-password")).toEqual(
      profile,
    );
    const init = fetcher.mock.calls[1][1]!;
    expect(new Headers(init.headers).get("X-XSRF-TOKEN")).toBe("csrf-token");
    expect(init.credentials).toBe("same-origin");
    expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
  });

  it("treats a missing refresh cookie as signed out but preserves network failures", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ token: "csrf", header_name: "X-XSRF-TOKEN" }),
      )
      .mockResolvedValueOnce(response({ code: "INVALID_SESSION" }, 401));
    expect(await new AuthClient(fetcher).restoreSession()).toBeNull();
    const offline = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("fetch failed"));
    await expect(new AuthClient(offline).restoreSession()).rejects.toThrow(
      "Cannot connect",
    );
  });

  it("shares concurrent refresh requests instead of replaying the same refresh token", async () => {
    let refreshes = 0;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      if (String(input).endsWith("/csrf"))
        return response({ token: "csrf", header_name: "X-XSRF-TOKEN" });
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return session("new-access");
    });
    const client = new AuthClient(fetcher);
    expect(
      await Promise.all([client.restoreSession(), client.restoreSession()]),
    ).toEqual([profile, profile]);
    expect(refreshes).toBe(1);
  });

  it("retries an authorized request after refreshing an expired access token", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ token: "csrf", header_name: "X-XSRF-TOKEN" }),
      )
      .mockResolvedValueOnce(session("expired-access"))
      .mockResolvedValueOnce(response({ code: "INVALID_SESSION" }, 401))
      .mockResolvedValueOnce(session("new-access"))
      .mockResolvedValueOnce(response(profile));
    const client = new AuthClient(fetcher);
    await client.login("guardian@example.com", "a-password");
    expect(await client.getProfile()).toEqual(profile);
    expect(
      new Headers(fetcher.mock.calls[4][1]!.headers).get("Authorization"),
    ).toBe("Bearer new-access");
  });

  it("retries an expired CSRF token once without exposing refresh credentials", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ token: "old-csrf", header_name: "X-XSRF-TOKEN" }),
      )
      .mockResolvedValueOnce(response({ code: "CSRF_ERROR" }, 403))
      .mockResolvedValueOnce(
        response({ token: "new-csrf", header_name: "X-XSRF-TOKEN" }),
      )
      .mockResolvedValueOnce(session("access"));
    const client = new AuthClient(fetcher);
    await client.login("guardian@example.com", "a-password");
    expect(
      new Headers(fetcher.mock.calls[3][1]!.headers).get("X-XSRF-TOKEN"),
    ).toBe("new-csrf");
    expect(
      fetcher.mock.calls.every(
        ([, init]) => !JSON.stringify(init).includes("refresh_token"),
      ),
    ).toBe(true);
  });

  it("does not turn service errors into a silent logout", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ token: "csrf", header_name: "X-XSRF-TOKEN" }),
      )
      .mockResolvedValueOnce(
        response({ message: "internal database details" }, 503),
      );
    await expect(new AuthClient(fetcher).restoreSession()).rejects.toThrow(
      "temporarily unavailable",
    );
  });
});
