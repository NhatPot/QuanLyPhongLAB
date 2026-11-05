"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  AlertTriangle,
  Edit2,
  History,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

export function EquipmentActionsMenu({
  name,
  onEdit,
  onDamage,
  onHistory,
  onDelete,
}: {
  name: string;
  onEdit?: () => void;
  onDamage?: () => void;
  onHistory?: () => void;
  onDelete?: () => void;
}) {
  if (!onEdit && !onDamage && !onHistory && !onDelete) return null;
  const item =
    "flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none focus:bg-slate-100 data-[highlighted]:bg-slate-100";
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Thao tác cho ${name}`}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          onClick={(event) => event.stopPropagation()}
          className="z-[150] min-w-44 rounded-lg border border-slate-200 bg-white p-1 text-slate-700 shadow-lg"
        >
          {onEdit && (
            <DropdownMenu.Item className={item} onSelect={onEdit}>
              <Edit2 className="h-4 w-4" /> Sửa thông tin
            </DropdownMenu.Item>
          )}
          {onDamage && (
            <DropdownMenu.Item className={item} onSelect={onDamage}>
              <AlertTriangle className="h-4 w-4" /> Báo hỏng
            </DropdownMenu.Item>
          )}
          {onHistory && (
            <DropdownMenu.Item className={item} onSelect={onHistory}>
              <History className="h-4 w-4" /> Lịch sử
            </DropdownMenu.Item>
          )}
          {onDelete && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />
              <DropdownMenu.Item
                className={`${item} text-red-700`}
                onSelect={onDelete}
              >
                <Trash2 className="h-4 w-4" /> Xóa thiết bị
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
