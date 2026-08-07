"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LogIn,
  LogOut,
  Monitor,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import {
  bookingApi,
  type CalendarEvent,
  type CheckInPayload,
} from "@/services/booking-api";
import { computerApi, type ComputerData } from "@/services/computer-api";
import { useAuth } from "@/features/auth/AuthContext";

const weekdays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];
const eventClass: Record<string, string> = {
  FULL_LAB: "border-blue-200 bg-blue-50 text-blue-700",
  COMPUTERS_ONLY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  EQUIPMENT_ONLY: "border-violet-200 bg-violet-50 text-violet-700",
};

function startMonday(date: Date) {
  const result = new Date(date);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  result.setHours(0, 0, 0, 0);
  return result;
}

function endSunday(date: Date) {
  const result = startMonday(date);
  result.setDate(result.getDate() + 41);
  result.setHours(23, 59, 59, 999);
  return result;
}

export default function LabCalendar() {
  const [month, setMonth] = useState(() => new Date());
  const [checkInEvent, setCheckInEvent] = useState<CalendarEvent | null>(null);
  const [actualPeopleCount, setActualPeopleCount] = useState(0);
  const [selectedComputerIds, setSelectedComputerIds] = useState<string[]>([]);
  const [computerKeyword, setComputerKeyword] = useState("");
  const [checkOutEvent, setCheckOutEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [checkOutError, setCheckOutError] = useState("");
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = startMonday(first);
  const gridEnd = endSunday(first);
  const canCheckIn = hasPermission("BOOKING_CHECK_IN");
  const canCheckOut = hasPermission("BOOKING_CHECK_OUT");

  const { data: eventsRaw = [], isLoading } = useQuery({
    queryKey: ["booking-calendar", month.getFullYear(), month.getMonth()],
    queryFn: () => bookingApi.calendar(gridStart, gridEnd),
    retry: false,
  });
  const events: CalendarEvent[] = useMemo(() => Array.isArray(eventsRaw) ? eventsRaw : ((eventsRaw as any)?.data ?? []), [eventsRaw]);
  const availableComputersQuery = useQuery({
    queryKey: ["computers", "check-in-available"],
    queryFn: () =>
      computerApi.list({ page: 1, pageSize: 100, status: "ACTIVE" }),
    enabled: canCheckIn,
    staleTime: 10_000,
  });
  const availableComputers = useMemo(() => {
    const d = availableComputersQuery.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  }, [availableComputersQuery.data]);
  const days = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) => {
        const date = new Date(gridStart);
        date.setDate(date.getDate() + index);
        return date;
      }),
    [gridStart.getTime()],
  );

  const refreshOperationData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["booking-calendar"] }),
      queryClient.invalidateQueries({ queryKey: ["booking-usage-statistics"] }),
      queryClient.invalidateQueries({ queryKey: ["computers"] }),
      queryClient.invalidateQueries({ queryKey: ["computer-summary"] }),
    ]);
  };
  const checkInMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CheckInPayload }) =>
      bookingApi.checkIn(id, payload),
    onSuccess: async () => {
      setCheckInEvent(null);
      toast.success("Đã check-in và mở nhật ký cho từng máy được chọn.");
      await refreshOperationData();
    },
    onError: (error: any) =>
      toast.error(
        error?.response?.data?.error || "Không thể check-in lịch này.",
      ),
  });
  const checkOutMutation = useMutation({
    mutationFn: ({
      id,
      returnCondition,
    }: {
      id: string;
      returnCondition?: string;
    }) => bookingApi.checkOut(id, { returnCondition }),
    onSuccess: async () => {
      setCheckOutEvent(null);
      setCheckOutError("");
      toast.success(
        "Đã check-out, chốt giờ từng máy và trả máy về trạng thái sẵn sàng.",
      );
      await refreshOperationData();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error || "Không thể check-out lịch này.";
      setCheckOutError(message);
      toast.error(message);
    },
  });

  const openCheckIn = (event: CalendarEvent) => {
    setCheckInEvent(event);
    setActualPeopleCount(event.numberOfPeople ?? 0);
    setSelectedComputerIds([]);
    setComputerKeyword("");
  };
  const submitCheckIn = () => {
    if (!checkInEvent) return;
    if (!Number.isInteger(actualPeopleCount) || actualPeopleCount < 0) {
      toast.error("Số người thực tế phải là số nguyên không âm.");
      return;
    }
    if (
      (checkInEvent.numberOfComputers ?? 0) > 0 &&
      selectedComputerIds.length === 0
    ) {
      toast.error("Hãy chọn ít nhất một máy tính thực tế được sử dụng.");
      return;
    }
    checkInMutation.mutate({
      id: checkInEvent.id,
      payload: {
        actualPeopleCount,
        actualComputerCount: selectedComputerIds.length,
        computerIds: selectedComputerIds,
      },
    });
  };
  const handleCheckOut = (event: CalendarEvent) => {
    setCheckOutError("");
    setCheckOutEvent(event);
  };
  const go = (offset: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  const today = new Date();
  const todayEvents = events.filter(
    (event) =>
      new Date(event.start).toDateString() === today.toDateString() &&
      (event.status === "APPROVED" || event.status === "CHECKED_IN"),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Lịch phòng"
        title="Lịch sử dụng phòng Lab"
        description="Theo dõi lịch đã duyệt, check-in/check-out và giờ sử dụng thực tế của từng máy."
      >
        <Button variant="outline" onClick={() => setMonth(new Date())}>
          Hôm nay
        </Button>
      </PageHeader>
      {(canCheckIn || canCheckOut) && (
        <OperationPanel
          events={todayEvents}
          canCheckIn={canCheckIn}
          canCheckOut={canCheckOut}
          onCheckIn={openCheckIn}
          onCheckOut={handleCheckOut}
          pending={checkInMutation.isPending || checkOutMutation.isPending}
        />
      )}
      <CalendarGrid
        month={month}
        days={days}
        events={events}
        today={today}
        isLoading={isLoading}
        onPrevious={() => go(-1)}
        onNext={() => go(1)}
      />
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <Legend color="bg-blue-500" label="Toàn bộ phòng" />
        <Legend color="bg-emerald-500" label="Máy tính" />
        <Legend color="bg-violet-500" label="Thiết bị" />
      </div>
      <CheckInComputerDialog
        event={checkInEvent}
        computers={availableComputers}
        loading={availableComputersQuery.isLoading}
        peopleCount={actualPeopleCount}
        selectedIds={selectedComputerIds}
        keyword={computerKeyword}
        pending={checkInMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setCheckInEvent(null);
        }}
        onPeopleCountChange={setActualPeopleCount}
        onSelectedIdsChange={setSelectedComputerIds}
        onKeywordChange={setComputerKeyword}
        onSubmit={submitCheckIn}
      />
      <ReasonDialog
        open={Boolean(checkOutEvent)}
        onOpenChange={(open) => {
          if (!open) setCheckOutEvent(null);
        }}
        title="Xác nhận check-out"
        description="Ghi nhận tình trạng phòng sau khi bàn giao. Bạn có thể để trống nếu không có ghi chú."
        reference={checkOutEvent ? `${checkOutEvent.title}${checkOutEvent.requester?.fullName ? ` · ${checkOutEvent.requester.fullName}` : ""}` : undefined}
        label="Tình trạng sau bàn giao"
        placeholder="Ví dụ: Phòng đã được kiểm tra, không có bất thường..."
        confirmLabel="Xác nhận check-out"
        destructive={false}
        required={false}
        pending={checkOutMutation.isPending}
        error={checkOutError}
        onConfirm={(returnCondition) => {
          if (checkOutEvent)
            checkOutMutation.mutate({
              id: checkOutEvent.id,
              returnCondition: returnCondition || undefined,
            });
        }}
      />
    </div>
  );
}

function CheckInComputerDialog({
  event,
  computers,
  loading,
  peopleCount,
  selectedIds,
  keyword,
  pending,
  onOpenChange,
  onPeopleCountChange,
  onSelectedIdsChange,
  onKeywordChange,
  onSubmit,
}: {
  event: CalendarEvent | null;
  computers: ComputerData[];
  loading: boolean;
  peopleCount: number;
  selectedIds: string[];
  keyword: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onPeopleCountChange: (value: number) => void;
  onSelectedIdsChange: (ids: string[]) => void;
  onKeywordChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const requested = event?.numberOfComputers ?? 0;
  const filtered = computers.filter((computer) =>
    `${computer.code} ${computer.name} ${computer.position || ""}`
      .toLowerCase()
      .includes(keyword.toLowerCase()),
  );
  const toggle = (id: string) =>
    onSelectedIdsChange(
      selectedIds.includes(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id],
    );
  const selectSuggested = () =>
    onSelectedIdsChange(
      computers
        .slice(0, requested || computers.length)
        .map((computer) => computer.id),
    );

  return (
    <Dialog open={Boolean(event)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Check-in và chọn máy sử dụng</DialogTitle>
          <DialogDescription>
            {event?.title}{event?.requester?.fullName ? ` · Người đăng ký: ${event.requester.fullName}` : ""} · yêu cầu {requested} máy. Mỗi máy được chọn sẽ có
            giờ vào và giờ rời riêng.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">
              Số người thực tế
            </label>
            <Input
              type="number"
              min={0}
              step={1}
              value={peopleCount}
              onChange={(e) => onPeopleCountChange(Number(e.target.value))}
            />
            <div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
              <p className="font-bold">Đã chọn {selectedIds.length} máy</p>
              <p className="mt-1 text-blue-600">
                Dự kiến theo lịch: {requested} máy
              </p>
            </div>
            {requested > 0 && (
              <Button
                className="mt-3 w-full"
                type="button"
                variant="outline"
                onClick={selectSuggested}
                disabled={!computers.length}
              >
                <CheckSquare2 /> Chọn đủ {Math.min(requested, computers.length)}{" "}
                máy
              </Button>
            )}
          </div>
          <div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={keyword}
                onChange={(e) => onKeywordChange(e.target.value)}
                placeholder="Tìm mã máy, tên hoặc vị trí..."
                className="pl-9"
              />
            </div>
            <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 p-2">
              {loading && (
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className="h-16" />
                  ))}
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <p className="py-12 text-center text-sm text-slate-400">
                  Không có máy sẵn sàng phù hợp.
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {filtered.map((computer) => {
                  const selected = selectedIds.includes(computer.id);
                  return (
                    <button
                      key={computer.id}
                      type="button"
                      onClick={() => toggle(computer.id)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"}`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? "bg-blue-600 text-white" : "bg-emerald-50 text-emerald-600"}`}
                      >
                        <Monitor className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-800">
                          {computer.code}
                        </span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {computer.position || computer.name}
                        </span>
                      </span>
                      <span
                        className={`h-4 w-4 rounded border ${selected ? "border-blue-600 bg-blue-600" : "border-slate-300"}`}
                      >
                        {selected && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Hủy
          </Button>
          <Button onClick={onSubmit} disabled={pending || loading}>
            <LogIn />{" "}
            {pending
              ? "Đang check-in..."
              : `Check-in ${selectedIds.length} máy`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OperationPanel({
  events,
  canCheckIn,
  canCheckOut,
  onCheckIn,
  onCheckOut,
  pending,
}: {
  events: CalendarEvent[];
  canCheckIn: boolean;
  canCheckOut: boolean;
  onCheckIn: (event: CalendarEvent) => void;
  onCheckOut: (event: CalendarEvent) => void;
  pending: boolean;
}) {
  return (
    <Card className="mb-4 border-blue-100">
      <CardHeader className="flex-row items-center justify-between py-4">
        <div>
          <CardTitle>Vận hành hôm nay</CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            Chọn đúng máy khi check-in. Hệ thống sẽ ghi nhận thời gian sử dụng
            thực tế khi check-out.
          </p>
        </div>
        <CheckCircle2 className="h-5 w-5 text-blue-600" />
      </CardHeader>
      <CardContent className="space-y-2">
        {events.length ? (
          events.map((event) => (
            <div
              key={event.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">
                  {event.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatTime(event.start)} – {formatTime(event.end)} ·{" "}
                  {event.numberOfComputers ?? 0} máy
                </p>
                {event.requester?.fullName && (
                  <p className="mt-1 truncate text-[11px] font-semibold text-blue-700">
                    <UserRound className="mr-1 inline h-3 w-3" />
                    {event.requester.fullName} · @{event.requester.username}
                  </p>
                )}
              </div>
              <Badge
                variant={event.status === "CHECKED_IN" ? "success" : "outline"}
              >
                {event.status === "CHECKED_IN" ? "Đang sử dụng" : "Đã duyệt"}
              </Badge>
              {event.status === "APPROVED" && canCheckIn && (
                <Button
                  size="sm"
                  onClick={() => onCheckIn(event)}
                  disabled={pending}
                >
                  <LogIn /> Check-in
                </Button>
              )}
              {event.status === "CHECKED_IN" && canCheckOut && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCheckOut(event)}
                  disabled={pending}
                >
                  <LogOut /> Check-out
                </Button>
              )}
            </div>
          ))
        ) : (
          <p className="py-2 text-sm text-slate-500">
            Hôm nay không có lịch cần vận hành.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CalendarGrid({
  month,
  days,
  events,
  today,
  isLoading,
  onPrevious,
  onNext,
}: {
  month: Date;
  days: Date[];
  events: CalendarEvent[];
  today: Date;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <Button variant="ghost" size="icon" onClick={onPrevious}>
            <ChevronLeft />
          </Button>
          <div className="text-center">
            <p className="text-base font-extrabold text-slate-900">
              Tháng {month.getMonth() + 1}, {month.getFullYear()}
            </p>
            <p className="text-[11px] text-slate-400">
              {events.length} lịch đã duyệt
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onNext}>
            <ChevronRight />
          </Button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-7 gap-px bg-slate-200">
            <Skeleton className="col-span-7 h-[560px] rounded-none" />
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-7 border-b bg-slate-50 sm:grid">
              {weekdays.map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="hidden grid-cols-7 bg-slate-200/80 sm:grid">
              {days.map((day) => (
                <DayCell
                  key={day.toISOString()}
                  day={day}
                  month={month}
                  today={today}
                  events={events.filter(
                    (event) =>
                      new Date(event.start).toDateString() ===
                      day.toDateString(),
                  )}
                />
              ))}
            </div>
            <div className="divide-y sm:hidden">
              {days
                .filter((day) => day.getMonth() === month.getMonth())
                .map((day) => {
                  const dayEvents = events.filter(
                    (event) =>
                      new Date(event.start).toDateString() ===
                      day.toDateString(),
                  );
                  if (!dayEvents.length) return null;
                  return (
                    <div key={day.toISOString()} className="p-4">
                      <p className="mb-3 text-sm font-bold text-slate-800">
                        {day.toLocaleDateString("vi-VN", {
                          weekday: "long",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </p>
                      <div className="space-y-2">
                        {dayEvents.map((event) => (
                          <EventRow key={event.id} event={event} />
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DayCell({
  day,
  month,
  today,
  events,
}: {
  day: Date;
  month: Date;
  today: Date;
  events: CalendarEvent[];
}) {
  const current = day.getMonth() === month.getMonth();
  const isToday = day.toDateString() === today.toDateString();
  return (
    <div className={`min-h-28 bg-white p-2 ${current ? "" : "bg-slate-50/80"}`}>
      <div
        className={`mb-1 flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold ${isToday ? "bg-blue-600 text-white" : current ? "text-slate-700" : "text-slate-300"}`}
      >
        {day.getDate()}
      </div>
      <div className="space-y-1">
        {events.slice(0, 3).map((event) => (
          <EventRow key={event.id} event={event} compact />
        ))}
        {events.length > 3 && (
          <p className="pl-1 text-[9px] font-semibold text-slate-400">
            +{events.length - 3} lịch khác
          </p>
        )}
      </div>
    </div>
  );
}

function EventRow({
  event,
  compact = false,
}: {
  event: CalendarEvent;
  compact?: boolean;
}) {
  return (
    <div
      title={`${event.title}${event.requester?.fullName ? ` · ${event.requester.fullName}` : ""}`}
      className={`rounded-lg border ${eventClass[event.type]} ${compact ? "px-2 py-1.5" : "p-3"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`${compact ? "text-[9px]" : "text-xs"} truncate font-bold`}
        >
          {event.title}
        </p>
        {!compact && (
          <Badge
            variant={event.status === "CHECKED_IN" ? "success" : "outline"}
          >
            {event.status}
          </Badge>
        )}
      </div>
      {event.requester?.fullName && (
        <p className={`${compact ? "text-[8px]" : "mt-1 text-[10px]"} truncate font-semibold opacity-80`}>
          <UserRound className="mr-1 inline h-3 w-3" />
          {event.requester.fullName}
        </p>
      )}
      <p
        className={`${compact ? "text-[8px]" : "mt-2 text-[10px]"} opacity-75`}
      >
        <Clock3 className="mr-1 inline h-3 w-3" />
        {formatTime(event.start)} - {formatTime(event.end)}
        {!compact && event.numberOfPeople ? (
          <>
            <UsersRound className="ml-3 mr-1 inline h-3 w-3" />
            {event.numberOfPeople} người
          </>
        ) : null}
      </p>
    </div>
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <i className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
