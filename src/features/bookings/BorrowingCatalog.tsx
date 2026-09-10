"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Clock3,
  Info,
  MapPin,
  Monitor,
  Package,
  Search,
  Wrench,
  X,
  Minus,
  Plus,
} from "lucide-react";
import { bookingApi, type LendingCatalogData } from "@/services/booking-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { nearbyPeriod } from "./LendingCatalog";

type Selection = {
  startTime: string;
  endTime: string;
  computerIds: string[];
  equipments: { equipmentId: string; quantity: number }[];
};
type Equipment = LendingCatalogData["data"][number];
type PickedEquipment = Equipment & { quantity: number };
type Filter = "all" | "ready" | "busy" | "unavailable";

export function BorrowingCatalog({
  onSelect,
}: {
  onSelect: (selection: Selection) => void;
}) {
  const [draft, setDraft] = useState(nearbyPeriod);
  const [period, setPeriod] = useState(draft);
  const [computerSearch, setComputerSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState("code");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<Record<string, PickedEquipment>>({});
  const [selectedComputers, setSelectedComputers] = useState<string[]>([]);
  const [error, setError] = useState("");
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["lending-catalog", period, equipmentSearch, page],
    queryFn: () =>
      bookingApi.catalog({
        startTime: new Date(period.startTime).toISOString(),
        endTime: new Date(period.endTime).toISOString(),
        keyword: equipmentSearch,
        page,
      }),
    retry: 1,
  });
  const dirty =
    draft.startTime !== period.startTime || draft.endTime !== period.endTime;
  const computers = data?.computers.items || [];
  const selected = computers.filter((c) => selectedComputers.includes(c.id));
  const equipmentItems = Object.values(picked);
  const totalEquipment = equipmentItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const staleSelection =
    selectedComputers.some(
      (id) => !computers.some((c) => c.id === id && c.available),
    ) ||
    selectedComputers.length > (data?.computers.available || 0) ||
    equipmentItems.some((item) => {
      const current = data?.data.find((c) => c.id === item.id);
      return (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > (current?.availableQuantity ?? item.availableQuantity)
      );
    });
  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: computers.length },
    {
      key: "ready",
      label: "Có thể chọn",
      count: computers.filter((c) => c.available).length,
    },
    {
      key: "busy",
      label: "Đang dùng / đã đặt",
      count: computers.filter(
        (c) => c.status === "IN_USE" || (c.status === "ACTIVE" && !c.available),
      ).length,
    },
    {
      key: "unavailable",
      label: "Bảo trì / ngừng dùng",
      count: computers.filter((c) => !["ACTIVE", "IN_USE"].includes(c.status))
        .length,
    },
  ];
  const shown = computers
    .filter((c) =>
      `${c.code} ${c.name} ${c.position || ""}`
        .toLocaleLowerCase("vi")
        .includes(computerSearch.toLocaleLowerCase("vi")),
    )
    .filter(
      (c) =>
        filter === "all" ||
        (filter === "ready" && c.available) ||
        (filter === "busy" &&
          (c.status === "IN_USE" || (c.status === "ACTIVE" && !c.available))) ||
        (filter === "unavailable" && !["ACTIVE", "IN_USE"].includes(c.status)),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "vi", { numeric: true })
        : a.code.localeCompare(b.code, "vi", { numeric: true }),
    );
  const clear = () => {
    setSelectedComputers([]);
    setPicked({});
  };
  const applyPeriod = (next: typeof period) => {
    if (
      !Number.isFinite(new Date(next.startTime).getTime()) ||
      !Number.isFinite(new Date(next.endTime).getTime()) ||
      new Date(next.startTime) <= new Date() ||
      new Date(next.startTime) >= new Date(next.endTime)
    ) {
      setError(
        "Chọn giờ bắt đầu trong tương lai và giờ kết thúc sau giờ bắt đầu.",
      );
      return;
    }
    clear();
    setError("");
    setPeriod({ ...next });
    setPage(1);
  };
  const changeQuantity = (item: Equipment, quantity: number) => {
    if (
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > item.availableQuantity
    )
      return;
    setPicked((previous) => {
      const next = { ...previous };
      if (!quantity) delete next[item.id];
      else next[item.id] = { ...item, quantity };
      return next;
    });
  };
  const submit = () => {
    if (
      dirty ||
      isFetching ||
      isError ||
      staleSelection ||
      !data?.labAvailable ||
      (!selectedComputers.length && !equipmentItems.length)
    )
      return;
    if (new Date(period.startTime) <= new Date()) {
      setError(
        "Giờ bắt đầu đã qua. Hãy chọn lại thời gian và bấm Xem khả dụng.",
      );
      return;
    }
    onSelect({
      ...period,
      computerIds: selectedComputers,
      equipments: equipmentItems.map((item) => ({
        equipmentId: item.id,
        quantity: item.quantity,
      })),
    });
  };
  return (
    <section className="space-y-6" aria-label="Chọn máy và thiết bị">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
          <CalendarClock className="h-5 w-5 text-blue-600" />
          Chọn thời gian sử dụng
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Sinh viên và giảng viên đều có thể đăng ký. Gửi yêu cầu, chờ duyệt rồi
          nhận máy hoặc thiết bị tại phòng Lab.
        </p>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            applyPeriod(draft);
          }}
        >
          <label className="min-w-0 flex-1 basis-52 space-y-1 text-sm font-medium text-slate-700">
            Bắt đầu
            <Input
              type="datetime-local"
              required
              value={draft.startTime}
              onChange={(e) =>
                setDraft({ ...draft, startTime: e.target.value })
              }
            />
          </label>
          <label className="min-w-0 flex-1 basis-52 space-y-1 text-sm font-medium text-slate-700">
            Kết thúc
            <Input
              type="datetime-local"
              required
              value={draft.endTime}
              onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
            />
          </label>
          <Button type="submit" disabled={isFetching}>
            Xem khả dụng
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isFetching}
            onClick={() => {
              const next = nearbyPeriod();
              setDraft(next);
              applyPeriod(next);
            }}
          >
            Từ 5 phút nữa
          </Button>
        </form>
        {dirty && (
          <p role="status" className="mt-3 text-sm text-amber-800">
            Thời gian đã thay đổi. Bấm Xem khả dụng để cập nhật; lựa chọn cũ sẽ
            được xóa.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
      {isFetching && (
        <p role="status" className="text-sm text-blue-700">
          Đang kiểm tra lịch và số lượng…
        </p>
      )}
      {isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          Không tải được khả dụng. Kiểm tra kết nối và thời gian đã chọn.
          <Button variant="outline" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      )}
      {data && !isError && (
        <>
          {!data.labAvailable && (
            <p
              role="status"
              className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
            >
              Phòng Lab đang ngừng nhận đăng ký. Vui lòng liên hệ nhân viên Lab.
            </p>
          )}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-8">
              <section aria-labelledby="computer-picker-title">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3
                    id="computer-picker-title"
                    className="flex items-center gap-2 text-lg font-bold text-slate-950"
                  >
                    <Monitor className="h-5 w-5 text-blue-600" />
                    Chọn máy tính
                  </h3>
                  <span className="text-sm font-medium text-emerald-700">
                    Còn đáp ứng {data.computers.available} máy
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Chọn từng mã máy để dùng tại Lab, không mang máy ra ngoài. Có
                  thể bỏ qua nếu chỉ mượn thiết bị.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <label className="relative min-w-0 flex-1 basis-48">
                    <span className="sr-only">
                      Tìm máy theo tên, mã hoặc vị trí
                    </span>
                    <Search
                      aria-hidden
                      className="absolute left-3 top-3 h-4 w-4 text-slate-500"
                    />
                    <Input
                      className="pl-9"
                      value={computerSearch}
                      onChange={(e) => setComputerSearch(e.target.value)}
                      placeholder="Tìm tên máy, mã, vị trí…"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="sr-only">Sắp xếp máy</span>
                    <select
                      className="h-10 rounded-xl border border-slate-300 bg-white px-3"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="code">Sắp xếp: mã máy</option>
                      <option value="name">Sắp xếp: tên máy</option>
                    </select>
                  </label>
                </div>
                <div
                  className="my-3 flex flex-wrap gap-2"
                  role="group"
                  aria-label="Lọc trạng thái máy"
                >
                  {filters.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={filter === item.key}
                      onClick={() => setFilter(item.key)}
                      className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${filter === item.key ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                      {item.label} ({item.count})
                    </button>
                  ))}
                </div>
                <div
                  className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3"
                  role="group"
                  aria-label="Danh sách máy theo khung giờ"
                >
                  {shown.map((computer) => {
                    const checked = selectedComputers.includes(computer.id);
                    const disabled =
                      dirty ||
                      isFetching ||
                      (!checked &&
                        (!computer.available ||
                          selectedComputers.length >=
                            data.computers.available));
                    const status = computer.available
                      ? "Có thể chọn theo giờ"
                      : computer.status === "MAINTENANCE"
                        ? "Đang bảo trì"
                        : computer.status === "BROKEN"
                          ? "Đang hỏng"
                          : computer.status === "IN_USE"
                            ? "Đang sử dụng"
                            : computer.status === "ACTIVE"
                              ? "Đã đặt / hết khả dụng"
                              : "Ngừng sử dụng";
                    return (
                      <label
                        key={computer.id}
                        className={`relative flex min-w-0 flex-col rounded-xl border p-4 focus-within:ring-2 focus-within:ring-blue-600 ${checked ? "border-blue-600 bg-blue-50 text-blue-950" : "border-slate-200 bg-white text-slate-800"} ${disabled ? "cursor-default" : "cursor-pointer hover:border-blue-400"}`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${computer.available ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}
                          >
                            {computer.status === "MAINTENANCE" ? (
                              <Wrench className="h-5 w-5" />
                            ) : (
                              <Monitor className="h-5 w-5" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1 break-words">
                            <p className="font-semibold">{computer.name}</p>
                            <p className="mt-1 text-sm">{computer.code}</p>
                          </div>
                          <input
                            aria-label={`Chọn ${computer.code}`}
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            className="mt-1 h-5 w-5 shrink-0 accent-blue-600"
                            onChange={(e) =>
                              setSelectedComputers((ids) =>
                                e.target.checked
                                  ? [...ids, computer.id]
                                  : ids.filter((id) => id !== computer.id),
                              )
                            }
                          />
                        </div>
                        <p
                          className={`mt-3 text-sm font-medium ${computer.available ? "text-emerald-800" : "text-amber-900"}`}
                        >
                          {status}
                        </p>
                        <p className="mt-2 flex items-start gap-1.5 break-words text-sm">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                          {computer.position || "Chưa có vị trí"}
                        </p>
                        <span
                          className={`mt-4 flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold ${checked ? "bg-blue-100 text-blue-800" : computer.available ? "bg-slate-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                        >
                          {checked ? (
                            <>
                              <Check className="h-4 w-4" />
                              Đã chọn
                            </>
                          ) : computer.available ? (
                            "Chọn máy này"
                          ) : (
                            "Không khả dụng"
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {!shown.length && (
                  <p className="py-8 text-center text-sm text-slate-600">
                    Không có máy phù hợp. Thử đổi từ khóa hoặc bộ lọc.
                  </p>
                )}
              </section>
              <section aria-labelledby="equipment-picker-title">
                <h3
                  id="equipment-picker-title"
                  className="flex items-center gap-2 text-lg font-bold text-slate-950"
                >
                  <Package className="h-5 w-5 text-blue-600" />
                  Thiết bị có thể mượn
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Mượn riêng hoặc dùng cùng máy tính. Nhập số lượng cần mượn; 0
                  nghĩa là chưa chọn. Thiết bị nội bộ không xuất hiện ở đây.
                </p>
                <label className="mt-4 block">
                  <span className="sr-only">Tìm thiết bị cho mượn</span>
                  <Input
                    value={equipmentSearch}
                    onChange={(e) => {
                      setEquipmentSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Tìm tên hoặc mã thiết bị…"
                  />
                </label>
                <div className="mt-3 divide-y divide-slate-200">
                  {data.data.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-4"
                    >
                      <div className="min-w-0 flex-1 basis-40 break-words">
                        <p className="font-semibold text-slate-950">
                          {item.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {item.code} · {item.categoryName}
                        </p>
                        <p
                          className={`mt-1 text-sm ${item.availableQuantity ? "text-emerald-700" : "text-amber-800"}`}
                        >
                          Còn {item.availableQuantity} theo lịch
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          aria-label={`Giảm số lượng ${item.name}`}
                          disabled={!picked[item.id] || dirty || isFetching}
                          onClick={() =>
                            changeQuantity(
                              item,
                              Math.max(0, (picked[item.id]?.quantity || 0) - 1),
                            )
                          }
                        >
                          <Minus />
                        </Button>
                        <input
                          aria-label={`Số lượng ${item.name}`}
                          type="number"
                          min={0}
                          max={item.availableQuantity}
                          step={1}
                          value={picked[item.id]?.quantity || 0}
                          disabled={
                            dirty || isFetching || !item.availableQuantity
                          }
                          onChange={(e) =>
                            changeQuantity(item, Number(e.target.value))
                          }
                          className="h-10 w-16 rounded-lg border border-slate-300 bg-white text-center text-base text-slate-900 focus-visible:outline-blue-600"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          aria-label={`Tăng số lượng ${item.name}`}
                          disabled={
                            dirty ||
                            isFetching ||
                            (picked[item.id]?.quantity || 0) >=
                              item.availableQuantity
                          }
                          onClick={() =>
                            changeQuantity(
                              item,
                              (picked[item.id]?.quantity || 0) + 1,
                            )
                          }
                        >
                          <Plus />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {!data.data.length && (
                  <p className="py-6 text-sm text-slate-600">
                    Không có thiết bị cho mượn phù hợp. Thử đổi từ khóa.
                  </p>
                )}
                {data.meta.totalPages > 1 && (
                  <div className="mt-3 flex items-center justify-end gap-3 text-sm">
                    <Button
                      variant="outline"
                      disabled={page === 1 || isFetching}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Trước
                    </Button>
                    <span>
                      {page} / {data.meta.totalPages}
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
              </section>
            </div>
            <aside
              aria-label="Tóm tắt lựa chọn"
              className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 xl:sticky xl:top-24"
            >
              <h3 className="text-lg font-bold text-slate-950">
                Tóm tắt lựa chọn
              </h3>
              <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                <p aria-live="polite" className="font-medium text-slate-800">
                  {selectedComputers.length} máy · {totalEquipment} thiết bị
                </p>
                <Button
                  variant="link"
                  className="h-auto p-1"
                  disabled={!selectedComputers.length && !equipmentItems.length}
                  onClick={clear}
                >
                  Xóa tất cả
                </Button>
              </div>
              <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-slate-100">
                {!selectedComputers.length && !equipmentItems.length && (
                  <p className="py-4 text-sm text-slate-600">
                    Chọn máy hoặc tăng số lượng thiết bị để bắt đầu.
                  </p>
                )}
                {selected.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 py-3">
                    <Monitor className="h-4 w-4 shrink-0 text-blue-600" />
                    <div className="min-w-0 flex-1 break-words text-sm">
                      <p className="font-semibold text-slate-900">
                        {item.code}
                      </p>
                      <p className="text-slate-600">{item.name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Bỏ chọn ${item.code}`}
                      onClick={() =>
                        setSelectedComputers((ids) =>
                          ids.filter((id) => id !== item.id),
                        )
                      }
                    >
                      <X />
                    </Button>
                  </div>
                ))}
                {equipmentItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 py-3">
                    <Package className="h-4 w-4 shrink-0 text-blue-600" />
                    <p className="min-w-0 flex-1 break-words text-sm text-slate-900">
                      {item.name} <strong>× {item.quantity}</strong>
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Bỏ ${item.name}`}
                      onClick={() => changeQuantity(item, 0)}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="my-4 space-y-3 border-y border-slate-200 py-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">
                  Thời gian đã kiểm tra
                </p>
                <p>
                  {formatDateTime(period.startTime)}
                  <br />
                  đến {formatDateTime(period.endTime)}
                </p>
                <p className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-blue-600" />
                  {Math.round(
                    (new Date(period.endTime).getTime() -
                      new Date(period.startTime).getTime()) /
                      60000,
                  )}{" "}
                  phút
                </p>
              </div>
              {staleSelection && (
                <p role="alert" className="mb-3 text-sm text-red-700">
                  Một lựa chọn không còn đủ khả dụng. Bỏ chọn máy hoặc giảm số
                  lượng thiết bị rồi thử lại.
                </p>
              )}
              <Button
                className="w-full"
                disabled={
                  dirty ||
                  isFetching ||
                  isError ||
                  staleSelection ||
                  !data.labAvailable ||
                  (!selectedComputers.length && !equipmentItems.length)
                }
                onClick={submit}
              >
                Tiếp tục đăng ký
                <ArrowRight />
              </Button>
              <p className="mt-3 text-sm text-slate-600">
                Bước tiếp theo: điền mục đích và kiểm tra yêu cầu trước khi gửi.
              </p>
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                Máy chỉ được giữ sau khi duyệt. Người đứng tên và giờ nhận/trả
                được lưu để đối chiếu khi có sự cố.
              </p>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
