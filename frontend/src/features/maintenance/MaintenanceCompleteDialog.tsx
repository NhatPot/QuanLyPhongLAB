"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, CircleAlert, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  MaintenanceOutcome,
  MaintenanceRecord,
} from "@/services/maintenance-api";

const schema = z.object({
  resultNote: z.string().trim().min(2, "Vui lòng nhập kết quả bảo trì."),
  actualCost: z.coerce.number().min(0, "Chi phí không được âm."),
  partsNote: z.string().optional(),
  outcome: z.enum(["AVAILABLE", "BROKEN"]),
});

export type MaintenanceCompleteValues = z.infer<typeof schema>;

export function MaintenanceCompleteDialog({
  target,
  open,
  onOpenChange,
  pending,
  error,
  onSubmit,
}: {
  target: MaintenanceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  error?: string;
  onSubmit: (values: MaintenanceCompleteValues) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MaintenanceCompleteValues>({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (open && target)
      reset({
        resultNote: "",
        actualCost: target.estimatedCost || 0,
        partsNote: target.partsNote || "",
        outcome: "AVAILABLE",
      });
  }, [open, target, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Hoàn tất bảo trì</DialogTitle>
          <DialogDescription>
            {target?.code} · {target?.targetCode} · {target?.targetName}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
          >
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">
              Kết quả xử lý
            </span>
            <textarea
              {...register("resultNote")}
              rows={4}
              className={textAreaClass}
              placeholder="Mô tả công việc đã thực hiện và kết quả kiểm tra..."
            />
            {errors.resultNote && (
              <small className="text-red-600">
                {errors.resultNote.message}
              </small>
            )}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700">
                Chi phí thực tế
              </span>
              <Input
                type="number"
                min={0}
                step={1000}
                {...register("actualCost")}
              />
              {errors.actualCost && (
                <small className="text-red-600">
                  {errors.actualCost.message}
                </small>
              )}
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700">
                Trạng thái sau bảo trì
              </span>
              <select {...register("outcome")} className={inputClass}>
                <option value="AVAILABLE">Hoạt động/khả dụng</option>
                <option value="BROKEN">Vẫn bị hỏng</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">
              Linh kiện đã sử dụng
            </span>
            <textarea
              {...register("partsNote")}
              rows={2}
              className={textAreaClass}
              placeholder="Ghi lại linh kiện, vật tư đã thay thế..."
            />
          </label>
          <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
            <PackageCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Khi hoàn tất, hệ thống sẽ cập nhật trạng thái tài sản và ghi lịch sử
            kho nếu đây là thiết bị.
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>
            <Button type="submit" disabled={pending}>
              <CheckCircle2 />
              {pending ? "Đang hoàn tất..." : "Xác nhận hoàn tất"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const textAreaClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
