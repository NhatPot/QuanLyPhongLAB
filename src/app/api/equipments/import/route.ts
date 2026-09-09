import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MAX_IMPORT_ROWS } from "@/lib/equipment-import";
import {
  checkPermissions,
  getAuthUser,
  handleApiError,
  successResponse,
} from "@/server/utils/route-helper";
import { importEquipments } from "@/server/application/use-cases/equipment/ImportEquipments";

export const runtime = "nodejs";
const payloadSchema = z.object({
  rows: z.array(z.unknown()).min(1).max(MAX_IMPORT_ROWS),
  commit: z.boolean().default(false),
});
const fail = (message: string, status = 400) =>
  NextResponse.json(
    { success: false, error: { code: "IMPORT_ERROR", message } },
    { status },
  );

export async function POST(req: NextRequest) {
  let user;
  try {
    user = getAuthUser(req);
    checkPermissions(user, "EQUIPMENT_CREATE");
  } catch (error) {
    return handleApiError(error);
  }
  try {
    if (
      req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
      "application/json"
    )
      return fail("Yêu cầu phải dùng Content-Type: application/json.", 415);
    // Bound the actual streamed body; Content-Length alone can be omitted/spoofed.
    const reader = req.body?.getReader();
    if (!reader) return fail("Thiếu dữ liệu nhập.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 5 * 1024 * 1024) {
        await reader.cancel();
        return fail("Dữ liệu vượt quá 5 MB.", 413);
      }
      chunks.push(value);
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return fail("Dữ liệu JSON không hợp lệ.");
    }
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success)
      return fail(
        `Mỗi lần nhập cần từ 1 đến ${MAX_IMPORT_ROWS} dòng thiết bị.`,
      );
    // Each row is independently validated in the planner, with row-level errors.
    const result = await importEquipments(
      parsed.data.rows,
      parsed.data.commit,
      user.userId,
    );
    return successResponse(
      result,
      result.imported
        ? `Đã thêm ${result.imported} thiết bị.`
        : "Đã kiểm tra dữ liệu.",
    );
  } catch (error) {
    console.error("Equipment import failed", error);
    return fail(
      "Không thể xác nhận kết quả nhập. Hãy tải lại danh sách và kiểm tra các mã thiết bị trước khi thử lại.",
      500,
    );
  }
}
