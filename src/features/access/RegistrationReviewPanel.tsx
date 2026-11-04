"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import { selfAuthApi } from "@/services/self-service-auth-api";
import { useAuth } from "@/features/auth/AuthContext";
import { authError } from "@/features/auth/AuthFields";
import { UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
interface Review {
  id: string;
  fullName: string;
  email: string;
  submittedAt: string;
}
export function RegistrationReviewPanel() {
  const { hasPermission } = useAuth(),
    cache = useQueryClient();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const enabled = hasPermission("ACCOUNT_REGISTRATION_REVIEW");
  const config = useQuery({
    queryKey: ["auth-features"],
    queryFn: selfAuthApi.config,
    enabled,
  });
  const reviews = useQuery<Review[]>({
    queryKey: ["registration-reviews"],
    queryFn: async () =>
      (await apiClient.get("/account-registrations")).data.data,
    enabled:
      enabled &&
      Boolean(config.data?.registrationEnabled || config.data?.googleEnabled),
    staleTime: 30_000,
    retry: false,
  });
  if (
    !enabled ||
    (!config.data?.registrationEnabled && !config.data?.googleEnabled)
  )
    return null;
  async function decide(id: string, approved: boolean) {
    setBusy(id);
    setError("");
    try {
      await apiClient.post("/account-registrations/" + id, {
        approved,
        note: notes[id] || "",
      });
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["registration-reviews"] }),
        cache.invalidateQueries({ queryKey: ["users"] }),
        cache.invalidateQueries({ queryKey: ["users-summary"] }),
      ]);
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (nextOpen) void reviews.refetch();
    }}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:text-sm"
        >
          <UserCheck className="h-4 w-4" aria-hidden="true" />
          Duyệt giảng viên
          {reviews.data && (
            <span
              className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold tabular-nums text-blue-700"
              aria-label={`${reviews.data.length} yêu cầu chờ duyệt`}
            >
              {reviews.data.length}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw_-_2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 data-[state=open]:animate-none">
        <DialogHeader className="shrink-0 border-b border-slate-100 p-5 pr-12">
          <DialogTitle>Đăng ký giảng viên chờ duyệt</DialogTitle>
          <DialogDescription>
            Xem hồ sơ và phê duyệt quyền truy cập của giảng viên.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto p-5">
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {reviews.isError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              Chưa tải được yêu cầu.{" "}
              <button onClick={() => reviews.refetch()} className="underline">
                Thử lại
              </button>
            </p>
          )}
          {reviews.isFetching && (
            <p className="mt-3 text-sm text-slate-600">Đang tải…</p>
          )}
          {reviews.data?.length === 0 && (
            <p className="mt-3 text-sm text-slate-600">
              Không có đăng ký đang chờ duyệt.
            </p>
          )}
          <div className="divide-y divide-slate-100">
            {reviews.data?.map((item) => (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 break-words">
                    <p className="text-sm font-semibold text-slate-900">
                      {item.fullName}
                    </p>
                    <p className="text-xs text-slate-600">{item.email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(item.submittedAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => decide(item.id, true)}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {busy === item.id ? "Đang xử lý…" : "Duyệt giảng viên"}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busy) || !notes[item.id]?.trim()}
                      onClick={() => decide(item.id, false)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
                <label className="mt-3 block text-xs text-slate-600">
                  Ghi chú / lý do từ chối
                  <input
                    className="mt-1 block w-full rounded-md border border-slate-200 p-2 text-sm"
                    maxLength={1000}
                    value={notes[item.id] || ""}
                    onChange={(e) =>
                      setNotes({ ...notes, [item.id]: e.target.value })
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
