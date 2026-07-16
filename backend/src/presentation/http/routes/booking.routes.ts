import { Router } from 'express';
import { z } from 'zod';
import { BookingController } from '../controllers/BookingController';
import { CreateBookingUseCase } from '../../../application/use-cases/booking/CreateBookingUseCase';
import { GetBookingUseCase } from '../../../application/use-cases/booking/GetBookingUseCase';
import { GetMyBookingsUseCase } from '../../../application/use-cases/booking/GetMyBookingsUseCase';
import { GetBookingCalendarUseCase } from '../../../application/use-cases/booking/GetBookingCalendarUseCase';
import { CancelBookingUseCase } from '../../../application/use-cases/booking/CancelBookingUseCase';
import { ListPendingBookingsUseCase } from '../../../application/use-cases/booking/ListPendingBookingsUseCase';
import { ApproveBookingUseCase } from '../../../application/use-cases/booking/ApproveBookingUseCase';
import { RejectBookingUseCase } from '../../../application/use-cases/booking/RejectBookingUseCase';
import { CheckInBookingUseCase } from '../../../application/use-cases/booking/CheckInBookingUseCase';
import { CheckOutBookingUseCase } from '../../../application/use-cases/booking/CheckOutBookingUseCase';
import { GetLabUsageStatisticsUseCase } from '../../../application/use-cases/booking/GetLabUsageStatisticsUseCase';
import { CheckAvailabilityUseCase } from '../../../application/use-cases/booking/CheckAvailabilityUseCase';
import { SqlBookingRequestRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlBookingRequestRepository';
import { SqlBookingEquipmentItemRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlBookingEquipmentItemRepository';
import { SqlLabProfileRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlLabProfileRepository';
import { SqlComputerRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlComputerRepository';
import { SqlEquipmentRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlEquipmentRepository';
import { SqlAvailabilityQueryService } from '../../../infrastructure/database/sqlserver/repositories/SqlAvailabilityQueryService';
import { SqlUnitOfWork } from '../../../infrastructure/database/sqlserver/unit-of-work/SqlUnitOfWork';
import { SqlAuditLogRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlAuditLogRepository';
import { SqlCheckInOutLogRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlCheckInOutLogRepository';
import { SqlComputerActivityRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlComputerActivityRepository';
import { authMiddleware, requirePermissions } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequestMiddleware';

const bookingIdParams = z.object({ id: z.string().uuid('ID lịch sử dụng không hợp lệ.') });
const checkInSchema = z.object({
  params: bookingIdParams,
  body: z.object({
    actualPeopleCount: z.number().int().min(0).max(1000).optional(),
    actualComputerCount: z.number().int().min(0).max(1000).optional(),
    computerIds: z.array(z.string().uuid('ID máy tính không hợp lệ.')).max(200).optional(),
    initialCondition: z.string().trim().max(4000).optional(),
    note: z.string().trim().max(4000).optional(),
  }),
});
const checkOutSchema = z.object({
  params: bookingIdParams,
  body: z.object({
    returnCondition: z.string().trim().max(4000).optional(),
    note: z.string().trim().max(4000).optional(),
  }),
});

export function createBookingRouter(): Router {
  const router = Router();

  // Repositories
  const bookingRepo = new SqlBookingRequestRepository();
  const equipmentItemRepo = new SqlBookingEquipmentItemRepository();
  const labProfileRepo = new SqlLabProfileRepository();
  const computerRepo = new SqlComputerRepository();
  const equipmentRepo = new SqlEquipmentRepository();
  const availabilityQueryService = new SqlAvailabilityQueryService();
  const uow = new SqlUnitOfWork();
  const auditLogRepo = new SqlAuditLogRepository();
  const checkInOutLogRepo = new SqlCheckInOutLogRepository();
  const computerActivityRepo = new SqlComputerActivityRepository();

  // Shared Use Cases
  const checkAvailabilityUseCase = new CheckAvailabilityUseCase(
    labProfileRepo,
    computerRepo,
    equipmentRepo,
    availabilityQueryService
  );

  // Use Cases
  const createBookingUseCase = new CreateBookingUseCase(
    bookingRepo,
    equipmentItemRepo,
    checkAvailabilityUseCase,
    uow,
    auditLogRepo
  );
  
  const getBookingUseCase = new GetBookingUseCase(bookingRepo, equipmentItemRepo);
  const getMyBookingsUseCase = new GetMyBookingsUseCase(bookingRepo, equipmentItemRepo);
  const getBookingCalendarUseCase = new GetBookingCalendarUseCase(bookingRepo);
  const cancelBookingUseCase = new CancelBookingUseCase(bookingRepo, equipmentItemRepo, uow, auditLogRepo);
  const listPendingBookingsUseCase = new ListPendingBookingsUseCase(bookingRepo, equipmentItemRepo);
  const approveBookingUseCase = new ApproveBookingUseCase(bookingRepo, equipmentItemRepo, checkAvailabilityUseCase, uow, auditLogRepo);
  const rejectBookingUseCase = new RejectBookingUseCase(bookingRepo, uow, auditLogRepo);
  const checkInBookingUseCase = new CheckInBookingUseCase(bookingRepo, checkInOutLogRepo, computerRepo, computerActivityRepo, uow, auditLogRepo);
  const checkOutBookingUseCase = new CheckOutBookingUseCase(bookingRepo, checkInOutLogRepo, computerRepo, computerActivityRepo, uow, auditLogRepo);
  const getLabUsageStatisticsUseCase = new GetLabUsageStatisticsUseCase(checkInOutLogRepo, computerActivityRepo);

  // Controller
  const controller = new BookingController(
    createBookingUseCase,
    getBookingUseCase,
    getMyBookingsUseCase,
    getBookingCalendarUseCase,
    cancelBookingUseCase,
    listPendingBookingsUseCase,
    approveBookingUseCase,
    rejectBookingUseCase,
    checkInBookingUseCase,
    checkOutBookingUseCase,
    getLabUsageStatisticsUseCase,
  );

  // Routes
  // Calendar public (but maybe require login)
  router.get('/calendar', authMiddleware, requirePermissions('LAB_CALENDAR_VIEW'), controller.getCalendar.bind(controller));
  router.get('/usage-statistics', authMiddleware, requirePermissions('REPORT_VIEW'), controller.getUsageStatistics.bind(controller));

  // User booking operations
  router.post('/', authMiddleware, requirePermissions('BOOKING_CREATE'), controller.create.bind(controller));
  router.get('/my-bookings', authMiddleware, requirePermissions('BOOKING_CREATE'), controller.getMyBookings.bind(controller));
  router.get('/:id', authMiddleware, controller.getById.bind(controller)); // Detail access controlled inside UC
  router.post('/:id/cancel', authMiddleware, controller.cancel.bind(controller)); // Cancellation access controlled inside UC

  // Admin booking operations
  router.get('/admin/pending', authMiddleware, requirePermissions('BOOKING_APPROVE'), controller.listPending.bind(controller));
  router.post('/:id/approve', authMiddleware, requirePermissions('BOOKING_APPROVE'), controller.approve.bind(controller));
  router.post('/:id/reject', authMiddleware, requirePermissions('BOOKING_APPROVE'), controller.reject.bind(controller));
  router.post('/:id/check-in', authMiddleware, requirePermissions('BOOKING_CHECK_IN'), validateRequest(checkInSchema), controller.checkIn.bind(controller));
  router.post('/:id/check-out', authMiddleware, requirePermissions('BOOKING_CHECK_OUT'), validateRequest(checkOutSchema), controller.checkOut.bind(controller));

  return router;
}
