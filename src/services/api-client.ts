import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { isMockDataMode } from "./data-mode";
import { createMockApiAdapter } from "./mock-api-adapter";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Mock mode is deliberately opt-in. SQL/API remains the default for normal use.
if (isMockDataMode) {
  apiClient.defaults.adapter = createMockApiAdapter();
}

let csrfToken: string | undefined;
let csrfRequest: Promise<string> | undefined;
let refreshRequest: Promise<void> | undefined;

export async function getCsrfToken(force = false): Promise<string> {
  if (isMockDataMode) return "mock-csrf-token";
  if (force) csrfToken = undefined;
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = axios
      .get(`${apiClient.defaults.baseURL}/auth/csrf`, { withCredentials: true })
      .then((response) => {
        const token = response.data?.data?.csrfToken;
        if (typeof token !== "string")
          throw new Error("Không lấy được mã bảo vệ yêu cầu.");
        csrfToken = token;
        return token;
      })
      .finally(() => {
        csrfRequest = undefined;
      });
  }
  return csrfRequest;
}

type SessionRequest = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _csrfRetry?: boolean;
};

apiClient.interceptors.request.use(async (config) => {
  if (
    !["get", "head", "options"].includes((config.method || "get").toLowerCase())
  ) {
    config.headers.set("X-CSRF-Token", await getCsrfToken());
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const token = response.data?.data?.csrfToken;
    if (typeof token === "string") csrfToken = token;
    if (/\/auth\/(?:account-setup|logout(?:-all)?|password\/reset|me\/(?:password\/set|email\/change))$/.test(response.config.url || ""))
      csrfToken = undefined;
    return response;
  },
  async (error: AxiosError<{ error?: { code?: string } }>) => {
    const original = error.config as SessionRequest | undefined;
    if (!original) throw error;
    const code = error.response?.data?.error?.code;
    if (
      error.response?.status === 403 &&
      code === "CSRF_INVALID" &&
      !original._csrfRetry
    ) {
      original._csrfRetry = true;
      await getCsrfToken(true);
      return apiClient(original);
    }
    if (
      error.response?.status !== 401 ||
      original._retry ||
      /\/auth\/(login|refresh|logout|logout-all|sso\/(?:start|callback|pending|link)|google(?:\/nonce)?|register\/[^/]+|otp\/resend|password\/[^/]+|me\/(password|google|email)\/[^/]+)$/.test(original.url || "") ||
      code === "SESSION_REVOKED" ||
      code === "ACCOUNT_UNAVAILABLE"
    )
      throw error;
    original._retry = true;
    if (!refreshRequest) {
      refreshRequest = apiClient
        .post("/auth/refresh")
        .then(() => undefined)
        .finally(() => {
          refreshRequest = undefined;
        });
    }
    try{await refreshRequest;}catch(error){if(typeof window!=='undefined')window.dispatchEvent(new Event('lab-session-expired'));throw error;}
    return apiClient(original);
  },
);
