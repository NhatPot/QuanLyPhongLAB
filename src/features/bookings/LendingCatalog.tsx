"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { bookingApi } from "@/services/booking-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const localDateTime = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
export const nearbyPeriod = () => {
  const start = new Date(Date.now() + 5 * 60000);
  return {
    startTime: localDateTime(start),
    endTime: localDateTime(new Date(start.getTime() + 3600000)),
  };
};
export type CatalogSelection = {
  startTime: string;
  endTime: string;
  equipmentId?: string;
  quantity: number;
};

export function LendingCatalog({
  onSelect,
}: {
  onSelect: (selection: CatalogSelection) => void;
}) {
  const [draft, setDraft] = useState(nearbyPeriod);
  const [period, setPeriod] = useState(draft);
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["lending-catalog", period, search, page],
    queryFn: () =>
      bookingApi.catalog({
        startTime: new Date(period.startTime).toISOString(),
        endTime: new Date(period.endTime).toISOString(),
        keyword: search,
        page,
      }),
    retry: 1,
  });
  const quantity = (id: string) => quantities[id] ?? 1;
  const picker = (id: string, available: number) => (
    <input
      aria-label={`Số lượng đăng ký ${id === "computers" ? "máy tính" : "thiết bị"}`}
      type="number"
      min={1}
      max={available}
      value={quantity(id)}
      disabled={!available || isFetching}
      onChange={(event) =>
        setQuantities((values) => ({
          ...values,
          [id]: Number(event.target.value),
        }))
      }
      className="w-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
    />
  );
  const canSelect = (id: string, available: number) =>
    !isFetching &&
    !isError &&
    Number.isInteger(quantity(id)) &&
    quantity(id) > 0 &&
    quantity(id) <= available;
  return (
    <section className="space-y-5" aria-label="Máy và thiết bị có thể đăng ký">
      <div>
        <h2 className="text-lg font-bold text-slate-950">
          Máy và thiết bị có thể đăng ký
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Chọn khoảng giờ để xem số lượng còn đáp ứng. Yêu cầu cần được duyệt và
          bàn giao trước khi sử dụng.
        </p>
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (
            !draft.startTime ||
            !draft.endTime ||
            new Date(draft.startTime) <= new Date() ||
            new Date(draft.startTime) >= new Date(draft.endTime)
          ) {
            setError(
              "Chọn thời gian bắt đầu trong tương lai và kết thúc sau bắt đầu.",
            );
            return;
          }
          setError("");
          setPeriod({ ...draft });
          setSearch(keyword);
          setPage(1);
          setQuantities({});
        }}
      >
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Bắt đầu
          <Input
            type="datetime-local"
            required
            value={draft.startTime}
            onChange={(event) =>
              setDraft({ ...draft, startTime: event.target.value })
            }
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Kết thúc
          <Input
            type="datetime-local"
            required
            value={draft.endTime}
            onChange={(event) =>
              setDraft({ ...draft, endTime: event.target.value })
            }
          />
        </label>
        <label className="min-w-40 flex-1 space-y-1 text-sm font-medium text-slate-700">
          Tìm thiết bị
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Mã hoặc tên thiết bị…"
          />
        </label>
        <Button type="submit" disabled={isFetching}>
          Xem khả dụng
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const next = nearbyPeriod();
            setDraft(next);
            setPeriod(next);
            setPage(1);
            setQuantities({});
          }}
        >
          Từ 5 phút nữa
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {isFetching && (
        <p role="status" className="text-sm text-blue-700">
          Đang kiểm tra lịch và số lượng…
        </p>
      )}
      {isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-800"
        >
          <p>
            Chưa tải được khả dụng. Kiểm tra kết nối, giờ đã chọn hoặc tải lại
            phiên đăng nhập.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      ) : (
        data && (
          <>
            <p className="text-sm text-slate-600">
              Kết quả cho {new Date(period.startTime).toLocaleString("vi-VN")} –{" "}
              {new Date(period.endTime).toLocaleString("vi-VN")}. Số lượng có
              thể thay đổi trước khi duyệt; không giả định thiết bị chưa trả sẽ
              được trả đúng giờ.
            </p>
            {!data.labAvailable && (
              <p
                role="status"
                className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
              >
                Phòng Lab đang ngừng nhận đăng ký.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 border-y border-slate-200 py-4">
              <div className="min-w-48 flex-1">
                <h3 className="font-semibold text-slate-950">
                  Máy tính tại phòng Lab · còn {data.computers.available} máy
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Đăng ký theo số lượng. Nhân viên Lab phân máy cụ thể khi nhận
                  phòng; không mang máy ra ngoài.
                </p>
              </div>
              {picker("computers", data.computers.available)}
              <Button
                disabled={!canSelect("computers", data.computers.available)}
                onClick={() =>
                  onSelect({ ...period, quantity: quantity("computers") })
                }
              >
                Đăng ký máy
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <caption className="sr-only">
                  Thiết bị cho phép mượn trong khoảng giờ đã chọn
                </caption>
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {[
                      "Thiết bị",
                      "Danh mục",
                      "Còn theo lịch",
                      "Số lượng",
                      "Đăng ký",
                    ].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-3 py-3 font-semibold"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((item) => (
                    <tr key={item.id}>
                      <td className="max-w-64 break-words px-3 py-4">
                        <p className="font-semibold text-slate-900">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {item.code}
                        </p>
                      </td>
                      <td className="max-w-56 break-words px-3 py-4">
                        {item.categoryName}
                      </td>
                      <td className="px-3 py-4 font-semibold tabular-nums">
                        {item.availableQuantity}
                      </td>
                      <td className="px-3 py-4">
                        {picker(item.id, item.availableQuantity)}
                      </td>
                      <td className="px-3 py-4">
                        <Button
                          variant="outline"
                          disabled={!canSelect(item.id, item.availableQuantity)}
                          onClick={() =>
                            onSelect({
                              ...period,
                              equipmentId: item.id,
                              quantity: quantity(item.id),
                            })
                          }
                        >
                          {item.availableQuantity
                            ? "Đăng ký mượn"
                            : "Hết khả dụng"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.data.length && (
              <p className="py-6 text-center text-sm text-slate-600">
                Không có thiết bị cho mượn phù hợp. Thử đổi từ khóa hoặc liên hệ
                nhân viên Lab.
              </p>
            )}
            {data.meta.totalPages > 1 && (
              <div className="flex items-center justify-end gap-3 text-sm">
                <Button
                  variant="outline"
                  disabled={page === 1 || isFetching}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Trước
                </Button>
                <span>
                  Trang {page}/{data.meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= data.meta.totalPages || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau
                </Button>
              </div>
            )}
          </>
        )
      )}
    </section>
  );
}
