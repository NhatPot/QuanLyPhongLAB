export interface PaginatedMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export class ApiResponse {
  public static success<T>(data: T, message = "Thao tác thành công"): any {
    return {
      success: true,
      message,
      data,
      meta: null
    };
  }

  public static created<T>(data: T, message = "Tạo mới thành công"): any {
    return {
      success: true,
      message,
      data,
      meta: null
    };
  }

  public static paginated<T>(data: T[], meta: PaginatedMeta, message = "Lấy dữ liệu thành công"): any {
    return {
      success: true,
      message,
      data,
      meta
    };
  }

  public static error(code: string, message: string, details: any = null, correlationId?: string): any {
    return {
      success: false,
      error: {
        code,
        message,
        details,
        correlationId
      }
    };
  }
}
