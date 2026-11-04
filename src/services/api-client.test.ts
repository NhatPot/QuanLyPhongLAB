import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";

vi.mock("./data-mode", () => ({ isMockDataMode: false }));
vi.mock("./mock-api-adapter", () => ({ createMockApiAdapter: vi.fn() }));
beforeEach(() => vi.resetModules());
afterEach(() => vi.restoreAllMocks());

async function setup() {
  const { default: axios, AxiosError } = await import("axios");
  const { apiClient } = await import("./api-client");
  const bootstrap = vi
    .spyOn(axios, "get")
    .mockResolvedValue({ data: { data: { csrfToken: "csrf-initial" } } });
  function response(config: InternalAxiosRequestConfig, data: unknown = {}) {
    return { config, status: 200, statusText: "OK", headers: {}, data };
  }
  function fail(
    config: InternalAxiosRequestConfig,
    status: number,
    code: string,
  ) {
    return Promise.reject(
      new AxiosError("request failed", undefined, config, undefined, {
        config,
        status,
        statusText: "Error",
        headers: {},
        data: { error: { code } },
      }),
    );
  }
  return { client: apiClient, bootstrap, response, fail };
}

describe("cookie-only web API client", () => {
  it.each(['/auth/register/verify-code', '/auth/password/verify-reset', '/auth/google', '/auth/me/password/verify-code', '/auth/me/google/link'])("does not refresh or replay an auth challenge failure at %s", async path => {
    const s = await setup();
    const paths: string[] = [];
    s.client.defaults.adapter = async config => { paths.push(config.url!); return s.fail(config, 401, 'OTP_INVALID'); };
    await expect(s.client.post(path, {})).rejects.toBeTruthy();
    expect(paths).toEqual([path]);
  });
  it("sends CSRF on writes, never adds Authorization and adopts the new CSRF value after login", async () => {
    const s = await setup();
    const requests: InternalAxiosRequestConfig[] = [];
    s.client.defaults.adapter = async (config) => {
      requests.push(config);
      return s.response(
        config,
        config.url === "/auth/login"
          ? { data: { csrfToken: "csrf-after-login" } }
          : {},
      );
    };
    await s.client.post("/auth/login", { identifier: "user", password: "123" });
    await s.client.post("/bookings", {});
    expect(requests[0].headers.get("X-CSRF-Token")).toBe("csrf-initial");
    expect(requests[1].headers.get("X-CSRF-Token")).toBe("csrf-after-login");
    requests.forEach((r) => {
      expect(r.headers.get("Authorization")).toBeUndefined();
      expect(r.withCredentials).toBe(true);
    });
    expect(s.bootstrap).toHaveBeenCalledOnce();
  });
  it("uses only one refresh when concurrent reads return 401", async () => {
    const s = await setup();
    let refreshes = 0;
    let refreshed = false;
    s.client.defaults.adapter = (async (config) => {
      if (config.url === "/auth/refresh") {
        refreshes += 1;
        await Promise.resolve();
        refreshed = true;
        return s.response(config, { data: { csrfToken: "csrf-renewed" } });
      }
      if (!refreshed) return s.fail(config, 401, "TOKEN_EXPIRED");
      return s.response(config, { ok: true });
    }) as AxiosAdapter;
    const results = await Promise.all([
      s.client.get("/one"),
      s.client.get("/two"),
    ]);
    expect(results.every((r) => r.data.ok)).toBe(true);
    expect(refreshes).toBe(1);
  });
  it("does not try refreshing revoked sessions or invalid login credentials", async () => {
    const s = await setup();
    let calls = 0;
    s.client.defaults.adapter = async (config) => {
      calls += 1;
      return s.fail(config, 401, "SESSION_REVOKED");
    };
    await expect(s.client.get("/users")).rejects.toBeTruthy();
    expect(calls).toBe(1);
    await expect(s.client.post("/auth/login", {})).rejects.toBeTruthy();
    expect(calls).toBe(2);
  });
  it("retries CSRF rejection only once and does not loop on repeated failures", async () => {
    const s = await setup();
    let writes = 0;
    s.client.defaults.adapter = async (config) => {
      writes += 1;
      return s.fail(config, 403, "CSRF_INVALID");
    };
    await expect(s.client.post("/bookings", {})).rejects.toBeTruthy();
    expect(writes).toBe(2);
    expect(s.bootstrap).toHaveBeenCalledTimes(2);
  });
  it("does not replay the original write if session refresh fails", async () => {
    const s = await setup();
    const requests: string[] = [];
    s.client.defaults.adapter = async (config) => {
      requests.push(config.url!);
      return s.fail(config, 401, "UNAUTHORIZED");
    };
    await expect(s.client.post("/bookings", {})).rejects.toBeTruthy();
    expect(requests).toEqual(["/bookings", "/auth/refresh"]);
  });
});
