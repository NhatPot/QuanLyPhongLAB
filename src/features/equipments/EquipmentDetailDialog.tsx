"use client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  equipmentApi,
  type EquipmentCategoryData,
} from "@/services/equipment-api";
import { EquipmentDialog } from "./EquipmentDialog";

const dateText = (value?: string) => {
  if (!value || Number.isNaN(new Date(value).getTime()))
    return "Chưa có thông tin";
  return new Date(value).toLocaleString("vi-VN");
};
export function EquipmentDetailDialog({
  id,
  categories,
  onClose,
}: {
  id: string | null;
  categories?: EquipmentCategoryData[];
  onClose: () => void;
}) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["equipment-detail", id],
    queryFn: () => equipmentApi.get(id!),
    enabled: !!id,
    staleTime: 0,
    retry: 1,
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
      title="Chi tiết thiết bị"
      description="Thông tin nhận diện và số lượng hiện tại của thiết bị."
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
            Không tải được thiết bị. Thiết bị có thể đã bị xóa hoặc kết nối đang
            gián đoạn.
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
      <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Đóng
        </button>
      </div>
    </EquipmentDialog>
  );
}
