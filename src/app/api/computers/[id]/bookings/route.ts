import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { getAuthUser, checkPermissions, successResponse, handleApiError } from '@/server/utils/route-helper';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = getAuthUser(req);
    checkPermissions(user, 'COMPUTER_VIEW');
    const { id } = await context.params;
    return successResponse(await container.getComputerBookingHistoryUseCase.execute(id, Number(req.nextUrl.searchParams.get('page') || 1), user.roles));
  } catch (error) { return handleApiError(error); }
}
