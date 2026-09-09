import { z } from "zod";

export const equipmentCategorySchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Mã danh mục không được trống.")
    .max(50, "Mã danh mục tối đa 50 ký tự."),
  name: z
    .string()
    .trim()
    .min(1, "Tên danh mục không được trống.")
    .max(255, "Tên danh mục tối đa 255 ký tự."),
  description: z.string().trim().max(500, "Mô tả tối đa 500 ký tự.").optional(),
});
