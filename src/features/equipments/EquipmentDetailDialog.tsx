"use client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertTriangle, Edit2, Loader2, Trash2 } from "lucide-react";
import {
  equipmentApi,
  type EquipmentCategoryData,
  type EquipmentData,
} from "@/services/equipment-api";
import { EquipmentDialog } from "./EquipmentDialog";

export type EquipmentDetailTab = "info" | "history";
const transactionLabels: Record<string, string> = {
  ADJUSTMENT: "Điều chỉnh số lượng",
  RESERVATION: "Đặt trước",
  RELEASE: "Hủy đặt trước",
  BORROW: "Mượn thiết bị",
  RETURN: "Trả thiết bị",
  DAMAGE_REPORT: "Báo hỏng",
  DAMAGE_RESOLVED: "Xử lý hỏng",
  MAINTENANCE_START: "Bắt đầu bảo trì",
  MAINTENANCE_COMPLETE: "Hoàn tất bảo trì",
};

const dateText = (value?: string) => {
  if (!value || Number.isNaN(new Date(value).getTime()))
    return "Chưa có thông tin";
  return new Date(value).toLocaleString("vi-VN");
};
export function EquipmentDetailDialog({
  id,
  categories,
  onClose,
  initialTab = "info",
  onAdjust,
  onEdit,
  onDamage,
  onDelete,
}: {
  id: string | null;
  categories?: EquipmentCategoryData[];
  onClose: () => void;
  initialTab?: EquipmentDetailTab;
  onAdjust?: (item: EquipmentData) => void;
  onEdit?: (item: EquipmentData) => void;
  onDamage?: (item: EquipmentData) => void;
  onDelete?: (item: EquipmentData) => void;
}) {
  const [tab, setTab] = useState<EquipmentDetailTab>(initialTab);
  useEffect(() => {
    if (id) setTab(initialTab);
  }, [id, initialTab]);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["equipment-detail", id],
    queryFn: () => equipmentApi.get(id!),
    enabled: !!id,
    staleTime: 0,
    retry: 1,
  });
  const history = useQuery({
    queryKey: ["equipment-txs", id],
    queryFn: () => equipmentApi.listTransactions(id!),
    enabled: !!id && tab === "history",
    retry: false,
  });
  const category = categories?.find((item) => item.id === data?.categoryId);
  const info = data
    ? [
        ["Mã thiết bị", data.code],
        ["Tên thiết bị", data.name],
        [
          "Danh mục",
          category ? `${category.name} (${category.code})` : data.categoryId,
        ],
        ["Vị trí cất giữ", data.location || "Chưa cập nhật"],
        [
          "Chế độ sử dụng",
          data.isLendable ? "Cho phép mượn" : "Nội bộ Lab — không cho mượn",
        ],
        [
          "Trạng thái hoạt động",
          {
            ACTIVE: "Kích hoạt",
            LOCKED: "Đã khóa",
            INACTIVE: "Không hoạt động",
          }[data.status],
        ],
        ["Ngày tạo", dateText(data.createdAt)],
        ["Cập nhật gần nhất", dateText(data.updatedAt)],
        ...(data.managerId ? [["Mã người quản lý", data.managerId]] : []),
      ]
    : [];
  const stock = data
    ? ([
        ["Tổng số", data.totalQuantity],
        ["Khả dụng", data.availableQuantity],
        ["Đặt trước", data.reservedQuantity],
        ["Đang mượn", data.borrowedQuantity],
        ["Hỏng", data.brokenQuantity],
        ["Bảo trì", data.maintenanceQuantity],
        ["Thất lạc", data.lostQuantity],
      ] as const)
    : [];
  return (
    <EquipmentDialog
      open={!!id}
      onClose={onClose}
      title={data?.name || "Chi tiết thiết bị"}
      description={
        data?.code || "Thông tin nhận diện và số lượng hiện tại của thiết bị."
      }
      wide
    >
      <div
        role="tablist"
        aria-label="Thông tin thiết bị"
        className="mb-5 flex gap-5 border-b border-slate-200"
      >
        {(
          [
            ["info", "Thông tin"],
            ["history", "Lịch sử"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            aria-controls={`equipment-panel-${value}`}
            id={`equipment-tab-${value}`}
            tabIndex={tab === value ? 0 : -1}
            onClick={() => setTab(value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                const next = value === "info" ? "history" : "info";
                setTab(next);
                document.getElementById(`equipment-tab-${next}`)?.focus();
              }
            }}
            className={`border-b-2 px-1 pb-3 text-sm font-semibold focus-visible:outline-blue-600 ${tab === value ? "border-blue-600 text-blue-700" : "border-transparent text-slate-600 hover:text-slate-900"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "history" ? (
        <div
          role="tabpanel"
          id="equipment-panel-history"
          aria-labelledby="equipment-tab-history"
        >
          {history.isLoading ? (
            <p role="status" className="py-8 text-sm text-slate-600">
              Đang tải lịch sử…
            </p>
          ) : history.isError ? (
            <div role="alert" className="space-y-2 py-4 text-sm text-red-700">
              <p>Không tải được lịch sử thiết bị.</p>
              <button
                type="button"
                onClick={() => history.refetch()}
                className="font-semibold underline"
              >
                Thử lại
              </button>
            </div>
          ) : !history.data?.length ? (
            <p className="py-8 text-sm text-slate-600">
              Chưa có biến động nào được ghi nhận.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    {[
                      "Thời gian",
                      "Loại biến động",
                      "Tổng",
                      "Khả dụng",
                      "Đang mượn",
                      "Hỏng",
                      "Ghi chú",
                    ].map((label) => (
                      <th key={label} className="px-3 py-3 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.data.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {dateText(tx.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        {transactionLabels[tx.transactionType] ||
                          tx.transactionType}
                      </td>
                      {[
                        tx.deltaTotal,
                        tx.deltaAvailable,
                        tx.deltaBorrowed,
                        tx.deltaBroken,
                      ].map((value, index) => (
                        <td key={index} className="px-3 py-3 tabular-nums">
                          {value > 0 ? `+${value}` : value}
                        </td>
                      ))}
                      <td className="max-w-64 whitespace-pre-wrap break-words px-3 py-3">
                        {tx.note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div
          role="tabpanel"
          id="equipment-panel-info"
          aria-labelledby="equipment-tab-info"
        >
          {isPending && (
            <p
              role="status"
              className="flex items-center gap-2 py-8 text-sm text-slate-600"
            >
              <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />{" "}
              Đang tải thông tin thiết bị…
            </p>
          )}
          {isError ? (
            <div
              role="alert"
              className="space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-800"
            >
              <p>
                Không tải được thiết bị. Thiết bị có thể đã bị xóa hoặc kết nối
                đang gián đoạn.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-lg border border-red-300 px-3 py-2 font-semibold"
              >
                Thử lại
              </button>
            </div>
          ) : (
            data && (
              <div className="space-y-6">
                <dl className="divide-y divide-slate-100">
                  {info.map(([label, value]) => (
                    <div
                      key={label}
                      className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"
                    >
                      <dt className="text-sm text-slate-600">{label}</dt>
                      <dd className="whitespace-pre-wrap break-words text-sm font-medium text-slate-900">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <section aria-label="Số lượng thiết bị">
                  <h3 className="mb-3 font-semibold text-slate-950">
                    Số lượng theo tình trạng
                  </h3>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                    {stock.map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-sm text-slate-600">{label}</dt>
                        <dd className="mt-1 font-semibold tabular-nums text-slate-950">
                          {value.toLocaleString("vi-VN")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
                <section>
                  <h3 className="mb-2 font-semibold text-slate-950">
                    Ghi chú thiết bị
                  </h3>
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-700">
                    {data.note || "Chưa có ghi chú."}
                  </p>
                </section>
                {category?.description && (
                  <section>
                    <h3 className="mb-2 font-semibold text-slate-950">
                      Mô tả danh mục
                    </h3>
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-700">
                      {category.description}
                    </p>
                  </section>
                )}
                {data.imageUrl && /^https?:\/\//i.test(data.imageUrl) && (
                  <a
                    href={data.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm font-semibold text-blue-700 underline underline-offset-4"
                  >
                    Mở hình ảnh thiết bị
                  </a>
                )}
              </div>
            )
          )}
        </div>
      )}
      {tab === "info" && data && !isError && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {onAdjust && (
              <button
                type="button"
                onClick={() => onAdjust(data)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Điều chỉnh số lượng
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(data)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Edit2 className="h-4 w-4" aria-hidden="true" /> Sửa thông tin
              </button>
            )}
            {onDamage && (
              <button
                type="button"
                onClick={() => onDamage(data)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Báo
                hỏng
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(data)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Xóa
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>
      )}
      {tab === "history" && (
        <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>
      )}
    </EquipmentDialog>
  );
}
