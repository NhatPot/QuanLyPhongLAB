"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { AxiosError } from "axios";
import {
  selfAuthApi,
  type AuthOutcome,
} from "@/services/self-service-auth-api";
import { authError } from "./AuthFields";
import styles from "./auth-pages.module.css";
interface GoogleApi {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        nonce: string;
        auto_select: boolean;
        callback: (response: { credential: string }) => void;
      }): void;
      renderButton(
        element: HTMLElement,
        options: {
          theme: string;
          size: string;
          text: string;
          shape: string;
          width: number;
          locale: string;
        },
      ): void;
    };
  };
}
declare global {
  interface Window {
    google?: GoogleApi;
  }
}
let loading: Promise<void> | undefined;
function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return (loading ||= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    const fail = () => {
      clearTimeout(timer);
      loading = undefined;
      script.remove();
      reject(new Error("Google unavailable"));
    };
    const timer = setTimeout(fail, 12000);
    script.onload = () => {
      clearTimeout(timer);
      if (!window.google?.accounts?.id) return fail();
      resolve();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  }));
}
export function GoogleSignInButton({
  onResult,
  onLinked,
  onError,
  password,
  linking = false,
  onCredential,
}: {
  onResult?: (value: AuthOutcome) => void | Promise<void>;
  onLinked?: () => void | Promise<void>;
  onError: (message: string) => void;
  password?: string;
  linking?: boolean;
  onCredential?: (credential: string, challengeId: string) => Promise<void>;
}) {
  const node = useRef<HTMLDivElement>(null),
    callbacks = useRef({ onResult, onLinked, onError, password, onCredential });
  callbacks.current = { onResult, onLinked, onError, password, onCredential };
  const availabilityId = useId();
  const submitting = useRef(false);
  const [state, setState] = useState<
    "loading" | "ready" | "unavailable" | "busy" | "failed"
  >("loading");
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState("");
  const [retryAfter, setRetryAfter] = useState(0);
  useEffect(() => {
    if (!retryAfter) return;
    const timer = setTimeout(
      () => setRetryAfter((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [retryAfter]);
  useEffect(() => {
    let cancelled = false;
    let loadingLibrary = false;
    setState("loading");
    setFailure("");
    (async () => {
      try {
        const config = await selfAuthApi.config();
        if (cancelled) return;
        if (
          !config?.googleEnabled &&
          !(callbacks.current.onCredential && config?.legacyGoogleLinkEnabled)
        ) {
          if (!cancelled) setState("unavailable");
          return;
        }
        loadingLibrary = true;
        await loadGoogle();
        loadingLibrary = false;
        if (cancelled) return;
        const nonce = await selfAuthApi.nonce();
        if (cancelled || !node.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: nonce.clientId,
          nonce: nonce.nonce,
          auto_select: false,
          callback: async (response) => {
            if (cancelled || submitting.current) return;
            submitting.current = true;
            setState("busy");
            try {
              if (callbacks.current.onCredential)
                await callbacks.current.onCredential(
                  response.credential,
                  nonce.challengeId,
                );
              else if (linking) {
                await selfAuthApi.linkGoogle(
                  response.credential,
                  nonce.challengeId,
                  callbacks.current.password,
                );
                await callbacks.current.onLinked?.();
              } else
                await callbacks.current.onResult?.(
                  await selfAuthApi.google(
                    response.credential,
                    nonce.challengeId,
                  ),
                );
            } catch (error) {
              callbacks.current.onError(authError(error));
              setAttempt((v) => v + 1);
            } finally {
              submitting.current = false;
              if (!cancelled) setState("ready");
            }
          },
        });
        node.current.replaceChildren();
        window.google.accounts.id.renderButton(node.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: Math.max(
            200,
            Math.min(350, node.current.parentElement?.clientWidth || 350),
          ),
          locale: "vi",
        });
        setState("ready");
      } catch (error) {
        if (!cancelled) {
          const response = (
            error as AxiosError<{
              error?: { details?: { retryAfter?: number } };
            }>
          ).response;
          const seconds = Number(
            response?.data?.error?.details?.retryAfter ||
              response?.headers?.["retry-after"] ||
              60,
          );
          setRetryAfter(
            response?.status === 429
              ? Number.isFinite(seconds)
                ? Math.max(1, Math.ceil(seconds))
                : 60
              : 0,
          );
          setFailure(
            loadingLibrary
              ? "Không tải được đăng nhập Google. Kiểm tra kết nối mạng rồi thử lại."
              : authError(error),
          );
          setState("failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, linking]);
  return (
    <div>
      <div
        className={styles.google}
        ref={node}
        inert={state === "busy"}
        aria-busy={state === "busy"}
        style={{
          display: state === "ready" || state === "busy" ? "flex" : "none",
        }}
      />
      {(state === "loading" ||
        state === "unavailable" ||
        state === "failed") && (
        <button
          type="button"
          disabled
          className={styles.googleFallback}
          aria-describedby={availabilityId}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.61 4.61 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
            />
            <path
              fill="#34A853"
              d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
            />
            <path
              fill="#FBBC05"
              d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.06a10 10 0 0 0 0 9.02l3.35-2.59Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.35 2.59A5.99 5.99 0 0 1 12 5.96Z"
            />
          </svg>
          Tiếp tục bằng Google
        </button>
      )}
      <p id={availabilityId} className={styles.googleHint} aria-live="polite">
        {state === "unavailable"
          ? "Đăng nhập Google hiện chưa khả dụng."
          : state === "failed"
            ? failure + " "
            : state === "busy"
              ? "Đang xác minh tài khoản Google…"
              : ""}
        {state === "failed" && (
          <button
            type="button"
            className={`${styles.link} ${styles.resend}`}
            disabled={retryAfter > 0}
            onClick={() => setAttempt((value) => value + 1)}
          >
            {retryAfter > 0 ? `Thử lại sau ${retryAfter}s` : "Thử lại"}
          </button>
        )}
      </p>
    </div>
  );
}
