import { Router } from 'express';
import { BookingController } from '../controllers/BookingController';
import { CreateBookingUseCase } from '../../../application/use-cases/booking/CreateBookingUseCase';
import { GetBookingUseCase } from '../../../application/use-cases/booking/GetBookingUseCase';
import { GetMyBookingsUseCase } from '../../../application/use-cases/booking/GetMyBookingsUseCase';
import { GetBookingCalendarUseCase } from '../../../application/use-cases/booking/GetBookingCalendarUseCase';
import { CancelBookingUseCase } from '../../../application/use-cases/booking/CancelBookingUseCase';
import { ListPendingBookingsUseCase } from '../../../application/use-cases/booking/ListPendingBookingsUseCase';
import { ApproveBookingUseCase } from '../../../application/use-cases/booking/ApproveBookingUseCase';
import { RejectBookingUseCase } from '../../../application/use-cases/booking/RejectBookingUseCase';
import { CheckAvailabilityUseCase } from '../../../application/use-cases/booking/CheckAvailabilityUseCase';
import { SqlBookingRequestRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlBookingRequestRepository';
import { SqlBookingEquipmentItemRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlBookingEquipmentItemRepository';
import { SqlLabProfileRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlLabProfileRepository';
import { SqlComputerRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlComputerRepository';
import { SqlEquipmentRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlEquipmentRepository';
import { SqlAvailabilityQueryService } from '../../../infrastructure/database/sqlserver/repositories/SqlAvailabilityQueryService';
import { SqlUnitOfWork } from '../../../infrastructure/database/sqlserver/unit-of-work/SqlUnitOfWork';
import { SqlAuditLogRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlAuditLogRepository';
import { authMiddleware, requirePermissions } from '../middlewares/authMiddleware';

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

  // Controller
  const controller = new BookingController(
    createBookingUseCase,
    getBookingUseCase,
    getMyBookingsUseCase,
    getBookingCalendarUseCase,
    cancelBookingUseCase,
    listPendingBookingsUseCase,
    approveBookingUseCase,
    rejectBookingUseCase
  );

  // Routes
  // Calendar public (but maybe require login)
  router.get('/calendar', authMiddleware, requirePermissions('LAB_CALENDAR_VIEW'), controller.getCalendar.bind(controller));

  // User booking operations
  router.post('/', authMiddleware, requirePermissions('BOOKING_CREATE'), controller.create.bind(controller));
  router.get('/my-bookings', authMiddleware, requirePermissions('BOOKING_CREATE'), controller.getMyBookings.bind(controller));
  router.get('/:id', authMiddleware, controller.getById.bind(controller)); // Detail access controlled inside UC
  router.post('/:id/cancel', authMiddleware, controller.cancel.bind(controller)); // Cancellation access controlled inside UC

  // Admin booking operations
  router.get('/admin/pending', authMiddleware, requirePermissions('BOOKING_APPROVE'), controller.listPending.bind(controller));
  router.post('/:id/approve', authMiddleware, requirePermissions('BOOKING_APPROVE'), controller.approve.bind(controller));
  router.post('/:id/reject', authMiddleware, requirePermissions('BOOKING_APPROVE'), controller.reject.bind(controller));

  return router;
}
