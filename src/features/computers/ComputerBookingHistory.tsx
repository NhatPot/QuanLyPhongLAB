"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { bookingApi } from "@/services/booking-api";
import { useAuth } from "@/features/auth/AuthContext";
import { canManageLabAssets } from "@/lib/lending-policy";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  CHECKED_IN: "Đang sử dụng",
  COMPLETED: "Đã trả",
  CANCELLED: "Đã hủy",
  REJECTED: "Từ chối",
};

export function ComputerBookingHistory({ computerId }: { computerId: string }) {
  const { user, hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const canView =
    canManageLabAssets(user?.roles) && hasPermission("COMPUTER_VIEW");
  const query = useQuery({
    queryKey: ["computer-booking-history", computerId, page],
    queryFn: () => bookingApi.computerHistory(computerId, page),
    enabled: open && canView,
    retry: 1,
  });
  if (!canView) return null;
  return (
    <section className="mt-6 border-t border-slate-200 pt-4">
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Lịch sử đăng ký & bàn giao máy
      </Button>
      {open && (
        <div className="mt-4 space-y-4 text-sm text-slate-800">
          <p className="text-slate-600">
            Tra cứu người đứng tên, giờ sử dụng và tình trạng khi nhận/trả để
            đối chiếu khi có sự cố. Dữ liệu từ khi bật chức năng chọn máy.
          </p>
          {query.isFetching && <p role="status">Đang tải lịch sử…</p>}
          {query.isError ? (
            <div role="alert">
              Không tải được lịch sử.{" "}
              <Button
                type="button"
                variant="outline"
                onClick={() => query.refetch()}
              >
                Thử lại
              </Button>
            </div>
          ) : (
            query.data && (
              <>
                {!query.data.data.length && (
                  <p>Máy chưa có lượt đăng ký theo mã.</p>
                )}
                {query.data.data.map((item) => (
                  <article
                    key={item.bookingId}
                    className="space-y-2 border-b border-slate-200 pb-4"
                  >
                    <p className="font-semibold">
                      {item.requestCode} ·{" "}
                      {statusLabel[item.status] || item.status}
                    </p>
                    <p>
                      {item.requesterName} · @{item.requesterUsername} ·{" "}
                      {item.requesterEmail}
                    </p>
                    <p>
                      Mã máy lúc đăng ký: <strong>{item.computerCode}</strong> ·{" "}
                      {item.computerName}
                    </p>
                    <p>
                      Giờ đăng ký: {formatDateTime(item.startTime)} →{" "}
                      {formatDateTime(item.endTime)}
                    </p>
                    <p>Mục đích: {item.purpose}</p>
                    <p>
                      Nhận máy:{" "}
                      {item.receivedAt
                        ? formatDateTime(item.receivedAt)
                        : "Chưa bàn giao"}
                      {item.checkedInByName &&
                        ` · Nhân viên: ${item.checkedInByName}`}
                    </p>
                    <p>
                      Tình trạng khi nhận:{" "}
                      {item.initialCondition || "Chưa ghi nhận"}
                    </p>
                    <p>
                      Trả máy:{" "}
                      {item.returnedAt
                        ? formatDateTime(item.returnedAt)
                        : "Chưa ghi nhận trả"}
                      {item.checkedOutByName &&
                        ` · Nhân viên: ${item.checkedOutByName}`}
                    </p>
                    <p>
                      Tình trạng khi trả:{" "}
                      {item.returnCondition || "Chưa ghi nhận"}
                    </p>
                  </article>
                ))}
                {query.data.total > 20 && (
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={page === 1 || query.isFetching}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Trước
                    </Button>
                    <span>
                      Trang {page}/{Math.ceil(query.data.total / 20)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        page * 20 >= query.data.total || query.isFetching
                      }
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Sau
                    </Button>
                  </div>
                )}
              </>
            )
          )}
        </div>
      )}
    </section>
  );
}
