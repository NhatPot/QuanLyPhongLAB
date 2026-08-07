"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";

export type ReasonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  reference?: string;
  label?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  maxLength?: number;
  required?: boolean;
  destructive?: boolean;
  pending?: boolean;
  error?: string;
  onConfirm: (reason: string) => void;
};

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  reference,
  label = "Lý do",
  placeholder = "Nhập lý do...",
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  maxLength = 500,
  required = true,
  destructive = true,
  pending = false,
  error,
  onConfirm,
}: ReasonDialogProps) {
  const [reason, setReason] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setReason("");
    setTouched(false);
    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  const trimmedReason = reason.trim();
  const validationError =
    touched && required && !trimmedReason
      ? "Vui lòng nhập lý do, không thể chỉ chứa khoảng trắng."
      : touched && reason.length > maxLength
        ? `Lý do không được dài quá ${maxLength} ký tự.`
        : undefined;
  const valid =
    (required ? Boolean(trimmedReason) : true) && reason.length <= maxLength;
  const handleOpenChange = (nextOpen: boolean) => {
    if (!pending) onOpenChange(nextOpen);
  };
  const confirmReason = () => {
    setTouched(true);
    if (!valid || pending) return;
    onConfirm(trimmedReason);
  };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    confirmReason();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-[520px] overflow-y-auto"
        onEscapeKeyDown={(event: any) => {
          if (pending) event.preventDefault();
        }}
        onPointerDownOutside={(event: any) => {
          if (pending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          {reference && (
            <p className="mt-1 text-xs font-bold text-blue-700">{reference}</p>
          )}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-2">
          <label
            htmlFor="reason-dialog-input"
            className="block text-xs font-bold text-slate-700"
          >
            {label}
          </label>
          <textarea
            id="reason-dialog-input"
            ref={textareaRef}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={placeholder}
            maxLength={maxLength}
            aria-invalid={Boolean(validationError)}
            aria-describedby="reason-dialog-hint reason-dialog-error"
            rows={5}
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 aria-[invalid=true]:border-red-300 aria-[invalid=true]:focus:ring-red-100"
          />
          <div className="flex items-start justify-between gap-3 text-[11px]">
            <p id="reason-dialog-error" className="min-h-4 text-red-600">
              {validationError || error || ""}
            </p>
            <p id="reason-dialog-hint" className="shrink-0 text-slate-400">
              {reason.length}/{maxLength}
            </p>
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={confirmReason}
            disabled={!valid || pending}
          >
            {pending && <LoaderCircle className="animate-spin" />}
            {pending ? "Đang gửi..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
