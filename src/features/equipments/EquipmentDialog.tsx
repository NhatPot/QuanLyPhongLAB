"use client";
import { useRef, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function EquipmentDialog({
  open,
  onClose,
  title,
  description,
  busy = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  busy?: boolean;
  children: ReactNode;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] m-0 bg-slate-900/50 backdrop-blur-sm" />
        <Dialog.Content
          onOpenAutoFocus={() => {
            opener.current = document.activeElement as HTMLElement;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (opener.current?.isConnected) opener.current.focus();
          }}
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          className="fixed left-1/2 top-1/2 z-[101] m-0 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white shadow-2xl focus:outline-none"
        >
          <div className="border-b border-slate-200 px-6 py-5 pr-16">
            <Dialog.Title className="text-xl font-bold text-slate-950">
              {title}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-slate-600">
              {description}
            </Dialog.Description>
            <Dialog.Close
              disabled={busy}
              aria-label="Đóng cửa sổ"
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-blue-600 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
