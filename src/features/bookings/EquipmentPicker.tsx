"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { LendingCatalogData } from "@/services/booking-api";

type EquipmentOption = LendingCatalogData["data"][number];

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();

/** The form stores an equipment ID; the search text is never submitted as one. */
export function EquipmentPicker({
  value,
  onChange,
  onBlur,
  inputRef,
  options,
  loading,
  validPeriod,
  unavailable,
  label,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  inputRef: (element: HTMLInputElement | null) => void;
  options: EquipmentOption[];
  loading: boolean;
  validPeriod: boolean;
  unavailable: boolean;
  label: string;
  error?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = options.find((item) => item.id === value);
  const available = useMemo(
    () => options.filter((item) => item.availableQuantity > 0),
    [options],
  );
  const matches = useMemo(() => {
    const term = normalize(editing ? query : "");
    return term
      ? available.filter((item) => normalize(item.name).includes(term))
      : available;
  }, [available, editing, query]);
  const active = matches[Math.min(activeIndex, matches.length - 1)];
  const activeOptionIndex = Math.min(activeIndex, matches.length - 1);
  const listOpen = open && validPeriod && !loading && !unavailable;
  const selectionUnavailable =
    !!value &&
    validPeriod &&
    !loading &&
    !unavailable &&
    (!selected || selected.availableQuantity <= 0);
  useEffect(() => {
    if (listOpen && active)
      document
        .getElementById(`${id}-option-${activeOptionIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, activeOptionIndex, id, listOpen]);
  const display = editing ? query : selected?.name || "";
  const status = !validPeriod
    ? "Chọn thời gian trước khi chọn thiết bị."
    : loading
      ? "Đang tải thiết bị…"
      : unavailable
        ? "Không tải được danh sách thiết bị."
        : available.length === 0
          ? "Chưa có thiết bị khả dụng."
          : "Không tìm thấy thiết bị phù hợp.";
  const select = (item: EquipmentOption) => {
    onChange(item.id);
    setQuery("");
    setEditing(false);
    setOpen(false);
    setActiveIndex(0);
  };

  return (
    <div
      className="min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          onBlur();
        }
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        />
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={listOpen}
          aria-controls={listOpen ? `${id}-list` : undefined}
          aria-activedescendant={
            listOpen && active ? `${id}-option-${activeOptionIndex}` : undefined
          }
          aria-invalid={!!error || selectionUnavailable}
          aria-describedby={
            [
              error && `${id}-error`,
              selectionUnavailable && `${id}-unavailable`,
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          value={display}
          disabled={!validPeriod || loading || unavailable}
          placeholder={
            !validPeriod
              ? "Chọn thời gian trước"
              : loading
                ? "Đang tải thiết bị…"
                : "Tìm và chọn thiết bị"
          }
          className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-600"
          onFocus={() => {
            setOpen(true);
            setActiveIndex(0);
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setEditing(true);
            setOpen(true);
            setActiveIndex(0);
            if (value) onChange("");
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!open) {
                setOpen(true);
                setActiveIndex(0);
              } else if (matches.length)
                setActiveIndex((current) =>
                  event.key === "ArrowDown"
                    ? Math.min(current + 1, matches.length - 1)
                    : Math.max(current - 1, 0),
                );
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              if (active) select(active);
            } else if (event.key === "Escape" && open) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            }
          }}
        />
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        />
      </div>
      {listOpen && (
        <div className="mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul
            id={`${id}-list`}
            role="listbox"
            aria-label={`Kết quả ${label.toLowerCase()}`}
            className="max-h-48 overflow-y-auto py-1"
          >
            {matches.map((item, index) => (
              <li
                key={item.id}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={item.id === value}
                className={index === activeIndex ? "bg-blue-50" : ""}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(item)}
                  className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm text-slate-900 hover:bg-blue-50"
                >
                  <span className="min-w-0 break-words font-medium">
                    {item.name}
                  </span>
                  <span className="shrink-0 text-xs text-slate-600">
                    Còn {item.availableQuantity}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!matches.length && (
            <p role="status" className="px-3 py-3 text-sm text-slate-600">
              {status}
            </p>
          )}
        </div>
      )}
      {selectionUnavailable && (
        <p
          id={`${id}-unavailable`}
          role="status"
          className="mt-1 text-xs text-amber-800"
        >
          Thiết bị đã chọn không còn khả dụng trong thời gian này. Vui lòng chọn
          thiết bị khác.
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-xs text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
