export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: any;
  public readonly isOperational: boolean;

  constructor(message: string, code = "INTERNAL_SERVER_ERROR", statusCode = 500, details: any = null, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details: any = null) {
    super(message, "BAD_REQUEST", 400, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details: any = null) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Không có quyền truy cập.", code = "UNAUTHORIZED") {
    super(message, code, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Bạn không có quyền thực hiện hành động này.") {
    super(message, "FORBIDDEN", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Không tìm thấy tài nguyên yêu cầu.") {
    super(message, "RESOURCE_NOT_FOUND", 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = "DUPLICATE_RESOURCE") {
    super(message, code, 409);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, code: string) {
    super(message, code, 422);
  }
}
