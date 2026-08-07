import { NextRequest, NextResponse } from 'next/server';
import { container } from '../container/dependency-container';
import { AppError, UnauthorizedError, ForbiddenError } from '../shared/errors/AppError';
import { hashDeviceApiKey, normalizeMacAddress } from '../shared/utils/deviceIdentity';

export interface AuthenticatedUser {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details || null,
        },
      },
      { status: error.statusCode }
    );
  }

  console.error('Unhandled API Error:', error);
  const message = error instanceof Error ? error.message : 'Đã có lỗi hệ thống xảy ra.';
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message,
        details: null,
      },
    },
    { status: 500 }
  );
}

export function successResponse(data: any, message = 'Thành công', status = 200, meta: any = null) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      meta,
    },
    { status }
  );
}

export function getAuthUser(req: NextRequest): AuthenticatedUser {
  const authHeader = req.headers.get('authorization');
  let token: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = req.cookies.get('accessToken')?.value || req.cookies.get('token')?.value || req.cookies.get('auth_token')?.value || null;
  }

  if (!token) {
    throw new UnauthorizedError('Vui lòng đăng nhập để tiếp tục.');
  }

  try {
    const payload = container.tokenService.verifyAccessToken(token);
    return payload as AuthenticatedUser;
  } catch {
    throw new UnauthorizedError('Phiên làm việc đã hết hạn hoặc không hợp lệ.');
  }
}

export function checkPermissions(user: AuthenticatedUser, ...requiredPermissions: string[]) {
  const isAdministrator = Array.isArray(user.roles) && user.roles.includes('ADMIN');
  const hasPermission = isAdministrator || requiredPermissions.every((perm) => user.permissions.includes(perm));
  if (!hasPermission) {
    throw new ForbiddenError('Bạn không có quyền thực hiện hành động này.');
  }
}

export function checkAnyPermissions(user: AuthenticatedUser, ...requiredPermissions: string[]) {
  const isAdministrator = Array.isArray(user.roles) && user.roles.includes('ADMIN');
  const hasPermission = isAdministrator || requiredPermissions.some((perm) => user.permissions.includes(perm));
  if (!hasPermission) {
    throw new ForbiddenError('Bạn không có quyền thực hiện hành động này.');
  }
}

export function extractApiKey(req: NextRequest): string | null {
  const headerKey = req.headers.get('x-api-key')?.trim();
  const authorization = req.headers.get('authorization')?.trim();
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  const bearerKey = bearerMatch?.[1]?.trim();

  if (headerKey && bearerKey && headerKey !== bearerKey) return null;
  return headerKey || bearerKey || null;
}

export async function authenticateDeviceAgent(req: NextRequest, bodyDeviceId?: string) {
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    throw new UnauthorizedError('API key bị thiếu hoặc hai header không khớp.');
  }

  const agent = await container.deviceAgentRepo.findByApiKeyHash(hashDeviceApiKey(apiKey));
  if (!agent) {
    throw new UnauthorizedError('API key không hợp lệ hoặc đã bị thay thế.');
  }

  if (bodyDeviceId && normalizeMacAddress(bodyDeviceId) !== agent.deviceId) {
    throw new ForbiddenError('API key không thuộc thiết bị này.');
  }

  return agent;
}

export function parseQueryParams(req: NextRequest): Record<string, string> {
  const { searchParams } = new URL(req.url);
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export async function handleExpressRoute(
  req: NextRequest,
  params: Promise<Record<string, string>> | Record<string, string> | undefined,
  action: (req: any, res: any, next: any) => Promise<any>,
  options?: { requireAuth?: boolean; permissions?: string[] }
) {
  try {
    const requireAuth = options?.requireAuth ?? true;
    let authUser: AuthenticatedUser | undefined;

    if (requireAuth) {
      authUser = getAuthUser(req);
      if (options?.permissions && options.permissions.length > 0) {
        checkAnyPermissions(authUser, ...options.permissions);
      }
    } else {
      try {
        authUser = getAuthUser(req);
      } catch {
        // guest request
      }
    }

    const resolvedParams = await Promise.resolve(params || {});
    const query = parseQueryParams(req);
    let body: any = {};
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const cookies: Record<string, string> = {};
    req.cookies.getAll().forEach((c) => {
      cookies[c.name] = c.value;
    });

    let responseStatus = 200;
    let responseBody: any = null;
    const cookiesToSet: Array<{ name: string; value: string; options?: any }> = [];
    const cookiesToClear: string[] = [];
    const responseHeaders: Record<string, string> = {};

    const mockRes: any = {
      status(code: number) {
        responseStatus = code;
        return mockRes;
      },
      json(data: any) {
        responseBody = data;
        return mockRes;
      },
      send(data: any) {
        responseBody = data;
        return mockRes;
      },
      cookie(name: string, value: string, opts?: any) {
        cookiesToSet.push({ name, value, options: opts });
        return mockRes;
      },
      clearCookie(name: string) {
        cookiesToClear.push(name);
        return mockRes;
      },
      setHeader(name: string, value: string) {
        responseHeaders[name] = value;
        return mockRes;
      },
    };

    const mockReq: any = {
      query,
      params: resolvedParams,
      body,
      user: authUser,
      cookies,
      headers: Object.fromEntries(req.headers.entries()),
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      get: (headerName: string) => req.headers.get(headerName) || undefined,
    };

    let nextError: any = null;
    const mockNext = (err?: any) => {
      if (err) nextError = err;
    };

    await action(mockReq, mockRes, mockNext);

    if (nextError) {
      return handleApiError(nextError);
    }

    const nextResponse = NextResponse.json(responseBody, { status: responseStatus, headers: responseHeaders });

    for (const c of cookiesToSet) {
      nextResponse.cookies.set(c.name, c.value, c.options);
    }
    for (const name of cookiesToClear) {
      nextResponse.cookies.delete(name);
    }

    return nextResponse;
  } catch (error) {
    return handleApiError(error);
  }
}
