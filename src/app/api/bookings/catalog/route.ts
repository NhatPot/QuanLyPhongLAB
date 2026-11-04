import { NextRequest } from "next/server";
import { container } from "@/server/container/dependency-container";
import {
  getAuthUser,
  checkPermissions,
  handleApiError,
  successResponse,
} from "@/server/utils/route-helper";
import { AppError } from "@/server/shared/errors/AppError";

export async function GET(req: NextRequest) {
  try {
    checkPermissions(await getAuthUser(req), "BOOKING_CREATE");
    const query = req.nextUrl.searchParams;
    return successResponse(
      await container.getLendingCatalogUseCase.execute({
        startTime: new Date(query.get("startTime") || ""),
        endTime: new Date(query.get("endTime") || ""),
        keyword: query.get("keyword") || undefined,
        page: Number(query.get("page") || 1),
      }),
    );
  } catch (error) {
    return handleApiError(
      error instanceof AppError
        ? error
        : new AppError(
            "Chưa tải được danh sách cho mượn. Quản trị viên cần kiểm tra kết nối và migration 029.",
            "LENDING_UNAVAILABLE",
            503,
          ),
    );
  }
}
