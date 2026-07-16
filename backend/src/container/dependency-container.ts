import { IClock } from '../application/ports/IClock';
import { IIdGenerator } from '../application/ports/IIdGenerator';
import { ILogger } from '../application/ports/ILogger';
import { IPasswordHasher } from '../application/ports/IPasswordHasher';
import { ITokenService } from '../application/ports/ITokenService';
import { IRolePermissionQuery } from '../application/ports/IRolePermissionQuery';

import { SystemClock } from '../infrastructure/services/SystemClock';
import { UuidGenerator } from '../infrastructure/services/UuidGenerator';
import { PinoLogger } from '../infrastructure/logger/PinoLogger';
import { BcryptHasher } from '../infrastructure/auth/BcryptHasher';
import { JwtTokenService } from '../infrastructure/auth/JwtTokenService';

import { IUserRepository } from '../domain/repositories/IUserRepository';
import { IAuthSessionRepository } from '../domain/repositories/IAuthSessionRepository';
import { IAuditLogRepository } from '../domain/repositories/IAuditLogRepository';
import { IUnitOfWork } from '../domain/repositories/IUnitOfWork';
import { IRolePermissionRepository } from '../domain/repositories/IRolePermissionRepository';
import { IMaintenanceScheduleRepository } from '../domain/repositories/IMaintenanceScheduleRepository';
import { IComputerActivityRepository } from '../domain/repositories/IComputerActivityRepository';

import { SqlUserRepository } from '../infrastructure/database/sqlserver/repositories/SqlUserRepository';
import { SqlAuthSessionRepository } from '../infrastructure/database/sqlserver/repositories/SqlAuthSessionRepository';
import { SqlRolePermissionQuery } from '../infrastructure/database/sqlserver/repositories/SqlRolePermissionQuery';
import { SqlRolePermissionRepository } from '../infrastructure/database/sqlserver/repositories/SqlRolePermissionRepository';
import { SqlAuditLogRepository } from '../infrastructure/database/sqlserver/repositories/SqlAuditLogRepository';
import { SqlUnitOfWork } from '../infrastructure/database/sqlserver/unit-of-work/SqlUnitOfWork';
import { SqlLabProfileRepository } from '../infrastructure/database/sqlserver/repositories/SqlLabProfileRepository';
import { SqlComputerRepository } from '../infrastructure/database/sqlserver/repositories/SqlComputerRepository';
import { SqlEquipmentCategoryRepository } from '../infrastructure/database/sqlserver/repositories/SqlEquipmentCategoryRepository';
import { SqlEquipmentRepository } from '../infrastructure/database/sqlserver/repositories/SqlEquipmentRepository';
import { SqlEquipmentInventoryTransactionRepository } from '../infrastructure/database/sqlserver/repositories/SqlEquipmentInventoryTransactionRepository';
import { SqlBookingRequestRepository } from '../infrastructure/database/sqlserver/repositories/SqlBookingRequestRepository';
import { SqlBookingEquipmentItemRepository } from '../infrastructure/database/sqlserver/repositories/SqlBookingEquipmentItemRepository';
import { SqlCheckInOutLogRepository } from '../infrastructure/database/sqlserver/repositories/SqlCheckInOutLogRepository';
import { SqlAvailabilityQueryService } from '../infrastructure/database/sqlserver/repositories/SqlAvailabilityQueryService';
import { SqlMaintenanceScheduleRepository } from '../infrastructure/database/sqlserver/repositories/SqlMaintenanceScheduleRepository';
import { SqlComputerActivityRepository } from '../infrastructure/database/sqlserver/repositories/SqlComputerActivityRepository';

import { GetHealthUseCase } from '../application/use-cases/GetHealthUseCase';
import { LoginUseCase } from '../application/use-cases/auth/LoginUseCase';
import { RefreshSessionUseCase } from '../application/use-cases/auth/RefreshSessionUseCase';
import { LogoutUseCase } from '../application/use-cases/auth/LogoutUseCase';
import { GetCurrentUserUseCase } from '../application/use-cases/auth/GetCurrentUserUseCase';
import { ChangePasswordUseCase } from '../application/use-cases/auth/ChangePasswordUseCase';

import { GetLabProfileUseCase } from '../application/use-cases/lab/GetLabProfileUseCase';
import { UpdateLabProfileUseCase } from '../application/use-cases/lab/UpdateLabProfileUseCase';
import { UpdateLabStatusUseCase } from '../application/use-cases/lab/UpdateLabStatusUseCase';

import { CreateComputerUseCase } from '../application/use-cases/computer/CreateComputerUseCase';
import { GetComputerUseCase } from '../application/use-cases/computer/GetComputerUseCase';
import { ListComputersUseCase } from '../application/use-cases/computer/ListComputersUseCase';
import { UpdateComputerUseCase } from '../application/use-cases/computer/UpdateComputerUseCase';
import { UpdateComputerStatusUseCase } from '../application/use-cases/computer/UpdateComputerStatusUseCase';
import { DeleteComputerUseCase } from '../application/use-cases/computer/DeleteComputerUseCase';

import { CreateEquipmentCategoryUseCase } from '../application/use-cases/equipment-category/CreateEquipmentCategoryUseCase';
import { ListEquipmentCategoriesUseCase } from '../application/use-cases/equipment-category/ListEquipmentCategoriesUseCase';
import { CreateEquipmentUseCase } from '../application/use-cases/equipment/CreateEquipmentUseCase';
import { GetEquipmentUseCase } from '../application/use-cases/equipment/GetEquipmentUseCase';
import { ListEquipmentUseCase } from '../application/use-cases/equipment/ListEquipmentUseCase';
import { UpdateEquipmentUseCase } from '../application/use-cases/equipment/UpdateEquipmentUseCase';
import { AdjustInventoryUseCase } from '../application/use-cases/equipment/AdjustInventoryUseCase';
import { ReportBrokenEquipmentUseCase } from '../application/use-cases/equipment/ReportBrokenEquipmentUseCase';

import { CheckAvailabilityUseCase } from '../application/use-cases/booking/CheckAvailabilityUseCase';
import { CreateBookingUseCase } from '../application/use-cases/booking/CreateBookingUseCase';
import { GetBookingUseCase } from '../application/use-cases/booking/GetBookingUseCase';
import { GetMyBookingsUseCase } from '../application/use-cases/booking/GetMyBookingsUseCase';
import { GetBookingCalendarUseCase } from '../application/use-cases/booking/GetBookingCalendarUseCase';
import { CancelBookingUseCase } from '../application/use-cases/booking/CancelBookingUseCase';
import { ListPendingBookingsUseCase } from '../application/use-cases/booking/ListPendingBookingsUseCase';
import { ApproveBookingUseCase } from '../application/use-cases/booking/ApproveBookingUseCase';
import { RejectBookingUseCase } from '../application/use-cases/booking/RejectBookingUseCase';
import { CheckInBookingUseCase } from '../application/use-cases/booking/CheckInBookingUseCase';
import { CheckOutBookingUseCase } from '../application/use-cases/booking/CheckOutBookingUseCase';
import { GetLabUsageStatisticsUseCase } from '../application/use-cases/booking/GetLabUsageStatisticsUseCase';
import {
  AssignUserRolesUseCase,
  CreateUserUseCase,
  GetUserSummaryUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  ResetUserPasswordUseCase,
  UpdateUserStatusUseCase,
  UpdateUserUseCase,
} from '../application/use-cases/user/UserManagementUseCases';
import {
  GetRoleCatalogUseCase,
  GetRoleUseCase,
  ListRolesUseCase,
  UpdateRolePermissionsUseCase,
} from '../application/use-cases/role/RoleManagementUseCases';

import { HealthController } from '../presentation/http/controllers/HealthController';
import { LabController } from '../presentation/http/controllers/LabController';
import { ComputerController } from '../presentation/http/controllers/ComputerController';
import { EquipmentController } from '../presentation/http/controllers/EquipmentController';
import { BookingController } from '../presentation/http/controllers/BookingController';
import { AvailabilityController } from '../presentation/http/controllers/AvailabilityController';
import { UserController } from '../presentation/http/controllers/UserController';
import { RoleController } from '../presentation/http/controllers/RoleController';
import { AuditLogController } from '../presentation/http/controllers/AuditLogController';
import { ListAuditLogsUseCase } from '../application/use-cases/audit/AuditLogUseCases';
import {
  CancelMaintenanceUseCase,
  CompleteMaintenanceUseCase,
  CreateMaintenanceUseCase,
  DeleteMaintenanceUseCase,
  GetMaintenanceOptionsUseCase,
  GetMaintenanceSummaryUseCase,
  GetMaintenanceUseCase,
  ListMaintenancesUseCase,
  StartMaintenanceUseCase,
  UpdateMaintenanceUseCase,
} from '../application/use-cases/maintenance/MaintenanceManagementUseCases';
import { MaintenanceController } from '../presentation/http/controllers/MaintenanceController';
import {
  ComputerMaintenanceProposalService,
  SyncComputerMaintenanceRemindersUseCase,
} from '../application/use-cases/maintenance/ComputerMaintenanceProposalService';

import { ILabProfileRepository } from '../domain/repositories/ILabProfileRepository';
import { IComputerRepository } from '../domain/repositories/IComputerRepository';
import { IEquipmentCategoryRepository } from '../domain/repositories/IEquipmentCategoryRepository';
import { IEquipmentRepository } from '../domain/repositories/IEquipmentRepository';
import { IEquipmentInventoryTransactionRepository } from '../domain/repositories/IEquipmentInventoryTransactionRepository';
import { IBookingRequestRepository } from '../domain/repositories/IBookingRequestRepository';
import { IBookingEquipmentItemRepository } from '../domain/repositories/IBookingEquipmentItemRepository';
import { ICheckInOutLogRepository } from '../domain/repositories/ICheckInOutLogRepository';
import { IAvailabilityQueryService } from '../domain/services/IAvailabilityQueryService';

class DependencyContainer {
  public readonly clock: IClock;
  public readonly idGenerator: IIdGenerator;
  public readonly logger: ILogger;
  public readonly hasher: IPasswordHasher;
  public readonly tokenService: ITokenService;
  
  public readonly userRepo: IUserRepository;
  public readonly rolePermissionRepo: IRolePermissionRepository;
  public readonly sessionRepo: IAuthSessionRepository;
  public readonly auditLogRepo: IAuditLogRepository;
  public readonly rolePermQuery: IRolePermissionQuery;
  public readonly uow: IUnitOfWork;
  public readonly labProfileRepo: ILabProfileRepository;
  public readonly computerRepo: IComputerRepository;
  public readonly equipmentCategoryRepo: IEquipmentCategoryRepository;
  public readonly equipmentRepo: IEquipmentRepository;
  public readonly equipmentTxRepo: IEquipmentInventoryTransactionRepository;
  public readonly bookingRepo: IBookingRequestRepository;
  public readonly bookingEqItemRepo: IBookingEquipmentItemRepository;
  public readonly checkInOutLogRepo: ICheckInOutLogRepository;
  public readonly availabilityQueryService: IAvailabilityQueryService;
  public readonly maintenanceRepo: IMaintenanceScheduleRepository;
  public readonly computerActivityRepo: IComputerActivityRepository;
  public readonly maintenanceProposalService: ComputerMaintenanceProposalService;

  // Controllers
  public readonly healthController: HealthController;
  public readonly labController: LabController;
  public readonly computerController: ComputerController;
  public readonly equipmentController: EquipmentController;
  public readonly bookingController: BookingController;
  public readonly availabilityController: AvailabilityController;
  public readonly userController: UserController;
  public readonly roleController: RoleController;
  public readonly auditLogController: AuditLogController;
  public readonly maintenanceController: MaintenanceController;

  // Use cases
  public readonly getHealthUseCase: GetHealthUseCase;
  public readonly loginUseCase: LoginUseCase;
  public readonly refreshSessionUseCase: RefreshSessionUseCase;
  public readonly logoutUseCase: LogoutUseCase;
  public readonly getCurrentUserUseCase: GetCurrentUserUseCase;
  public readonly changePasswordUseCase: ChangePasswordUseCase;
  
  public readonly getLabProfileUseCase: GetLabProfileUseCase;
  public readonly updateLabProfileUseCase: UpdateLabProfileUseCase;
  public readonly updateLabStatusUseCase: UpdateLabStatusUseCase;

  public readonly createComputerUseCase: CreateComputerUseCase;
  public readonly getComputerUseCase: GetComputerUseCase;
  public readonly listComputersUseCase: ListComputersUseCase;
  public readonly updateComputerUseCase: UpdateComputerUseCase;
  public readonly updateComputerStatusUseCase: UpdateComputerStatusUseCase;
  public readonly deleteComputerUseCase: DeleteComputerUseCase;

  public readonly createEquipmentCategoryUseCase: CreateEquipmentCategoryUseCase;
  public readonly listEquipmentCategoriesUseCase: ListEquipmentCategoriesUseCase;
  public readonly createEquipmentUseCase: CreateEquipmentUseCase;
  public readonly getEquipmentUseCase: GetEquipmentUseCase;
  public readonly listEquipmentUseCase: ListEquipmentUseCase;
  public readonly updateEquipmentUseCase: UpdateEquipmentUseCase;
  public readonly adjustInventoryUseCase: AdjustInventoryUseCase;
  public readonly reportBrokenEquipmentUseCase: ReportBrokenEquipmentUseCase;

  public readonly checkAvailabilityUseCase: CheckAvailabilityUseCase;
  public readonly createBookingUseCase: CreateBookingUseCase;
  public readonly getBookingUseCase: GetBookingUseCase;
  public readonly getMyBookingsUseCase: GetMyBookingsUseCase;
  public readonly getBookingCalendarUseCase: GetBookingCalendarUseCase;
  public readonly cancelBookingUseCase: CancelBookingUseCase;
  public readonly listPendingBookingsUseCase: ListPendingBookingsUseCase;
  public readonly approveBookingUseCase: ApproveBookingUseCase;
  public readonly rejectBookingUseCase: RejectBookingUseCase;
  public readonly checkInBookingUseCase: CheckInBookingUseCase;
  public readonly checkOutBookingUseCase: CheckOutBookingUseCase;
  public readonly getLabUsageStatisticsUseCase: GetLabUsageStatisticsUseCase;

  public readonly listUsersUseCase: ListUsersUseCase;
  public readonly getUserSummaryUseCase: GetUserSummaryUseCase;
  public readonly getUserUseCase: GetUserUseCase;
  public readonly createUserUseCase: CreateUserUseCase;
  public readonly updateUserUseCase: UpdateUserUseCase;
  public readonly updateUserStatusUseCase: UpdateUserStatusUseCase;
  public readonly assignUserRolesUseCase: AssignUserRolesUseCase;
  public readonly resetUserPasswordUseCase: ResetUserPasswordUseCase;

  public readonly listRolesUseCase: ListRolesUseCase;
  public readonly getRoleCatalogUseCase: GetRoleCatalogUseCase;
  public readonly getRoleUseCase: GetRoleUseCase;
  public readonly updateRolePermissionsUseCase: UpdateRolePermissionsUseCase;
  public readonly listAuditLogsUseCase: ListAuditLogsUseCase;
  public readonly listMaintenancesUseCase: ListMaintenancesUseCase;
  public readonly getMaintenanceSummaryUseCase: GetMaintenanceSummaryUseCase;
  public readonly getMaintenanceOptionsUseCase: GetMaintenanceOptionsUseCase;
  public readonly getMaintenanceUseCase: GetMaintenanceUseCase;
  public readonly createMaintenanceUseCase: CreateMaintenanceUseCase;
  public readonly updateMaintenanceUseCase: UpdateMaintenanceUseCase;
  public readonly startMaintenanceUseCase: StartMaintenanceUseCase;
  public readonly completeMaintenanceUseCase: CompleteMaintenanceUseCase;
  public readonly cancelMaintenanceUseCase: CancelMaintenanceUseCase;
  public readonly deleteMaintenanceUseCase: DeleteMaintenanceUseCase;
  public readonly syncComputerMaintenanceRemindersUseCase: SyncComputerMaintenanceRemindersUseCase;

  constructor() {
    this.clock = new SystemClock();
    this.idGenerator = new UuidGenerator();
    this.logger = new PinoLogger();
    this.hasher = new BcryptHasher();
    this.tokenService = new JwtTokenService();

    this.userRepo = new SqlUserRepository();
    this.rolePermissionRepo = new SqlRolePermissionRepository();
    this.sessionRepo = new SqlAuthSessionRepository();
    this.auditLogRepo = new SqlAuditLogRepository();
    this.rolePermQuery = new SqlRolePermissionQuery();
    this.uow = new SqlUnitOfWork();
    this.labProfileRepo = new SqlLabProfileRepository();
    this.computerRepo = new SqlComputerRepository();
    this.equipmentCategoryRepo = new SqlEquipmentCategoryRepository();
    this.equipmentRepo = new SqlEquipmentRepository();
    this.equipmentTxRepo = new SqlEquipmentInventoryTransactionRepository();
    this.bookingRepo = new SqlBookingRequestRepository();
    this.bookingEqItemRepo = new SqlBookingEquipmentItemRepository();
    this.checkInOutLogRepo = new SqlCheckInOutLogRepository();
    this.availabilityQueryService = new SqlAvailabilityQueryService();
    this.maintenanceRepo = new SqlMaintenanceScheduleRepository();
    this.computerActivityRepo = new SqlComputerActivityRepository();
    this.maintenanceProposalService = new ComputerMaintenanceProposalService(
      this.maintenanceRepo,
      this.idGenerator,
      this.auditLogRepo,
    );

    this.getHealthUseCase = new GetHealthUseCase();
    this.healthController = new HealthController(this.getHealthUseCase);

    this.getLabProfileUseCase = new GetLabProfileUseCase(this.labProfileRepo);
    this.updateLabProfileUseCase = new UpdateLabProfileUseCase(this.labProfileRepo, this.uow, this.auditLogRepo);
    this.updateLabStatusUseCase = new UpdateLabStatusUseCase(this.labProfileRepo, this.uow, this.auditLogRepo);
    this.labController = new LabController(this.getLabProfileUseCase, this.updateLabProfileUseCase, this.updateLabStatusUseCase);

    this.createComputerUseCase = new CreateComputerUseCase(this.computerRepo, this.uow, this.auditLogRepo, this.maintenanceProposalService, this.computerActivityRepo);
    this.getComputerUseCase = new GetComputerUseCase(this.computerRepo);
    this.listComputersUseCase = new ListComputersUseCase(this.computerRepo);
    this.updateComputerUseCase = new UpdateComputerUseCase(this.computerRepo, this.uow, this.auditLogRepo, this.maintenanceProposalService, this.computerActivityRepo);
    this.updateComputerStatusUseCase = new UpdateComputerStatusUseCase(this.computerRepo, this.uow, this.auditLogRepo, this.maintenanceProposalService, this.computerActivityRepo);
    this.deleteComputerUseCase = new DeleteComputerUseCase(this.computerRepo, this.uow, this.auditLogRepo, this.computerActivityRepo);
    this.computerController = new ComputerController(
      this.createComputerUseCase,
      this.getComputerUseCase,
      this.listComputersUseCase,
      this.updateComputerUseCase,
      this.updateComputerStatusUseCase,
      this.deleteComputerUseCase,
      this.computerRepo
    );

    this.createEquipmentCategoryUseCase = new CreateEquipmentCategoryUseCase(this.equipmentCategoryRepo);
    this.listEquipmentCategoriesUseCase = new ListEquipmentCategoriesUseCase(this.equipmentCategoryRepo);
    this.createEquipmentUseCase = new CreateEquipmentUseCase(this.equipmentRepo, this.uow, this.auditLogRepo);
    this.getEquipmentUseCase = new GetEquipmentUseCase(this.equipmentRepo);
    this.listEquipmentUseCase = new ListEquipmentUseCase(this.equipmentRepo);
    this.updateEquipmentUseCase = new UpdateEquipmentUseCase(this.equipmentRepo, this.uow, this.auditLogRepo);
    this.adjustInventoryUseCase = new AdjustInventoryUseCase(this.equipmentRepo, this.equipmentTxRepo, this.uow, this.auditLogRepo);
    this.reportBrokenEquipmentUseCase = new ReportBrokenEquipmentUseCase(this.equipmentRepo, this.equipmentTxRepo, this.uow, this.auditLogRepo);
    this.equipmentController = new EquipmentController(
      this.createEquipmentCategoryUseCase,
      this.listEquipmentCategoriesUseCase,
      this.createEquipmentUseCase,
      this.getEquipmentUseCase,
      this.listEquipmentUseCase,
      this.updateEquipmentUseCase,
      this.adjustInventoryUseCase,
      this.reportBrokenEquipmentUseCase,
      this.equipmentTxRepo
    );

    this.checkAvailabilityUseCase = new CheckAvailabilityUseCase(
      this.labProfileRepo,
      this.computerRepo,
      this.equipmentRepo,
      this.availabilityQueryService
    );

    this.availabilityController = new AvailabilityController(this.checkAvailabilityUseCase);

    this.createBookingUseCase = new CreateBookingUseCase(
      this.bookingRepo,
      this.bookingEqItemRepo,
      this.checkAvailabilityUseCase,
      this.uow,
      this.auditLogRepo
    );
    this.getBookingUseCase = new GetBookingUseCase(this.bookingRepo, this.bookingEqItemRepo);
    this.getMyBookingsUseCase = new GetMyBookingsUseCase(this.bookingRepo, this.bookingEqItemRepo);
    this.getBookingCalendarUseCase = new GetBookingCalendarUseCase(this.bookingRepo);
    this.cancelBookingUseCase = new CancelBookingUseCase(this.bookingRepo, this.bookingEqItemRepo, this.uow, this.auditLogRepo);
    this.listPendingBookingsUseCase = new ListPendingBookingsUseCase(this.bookingRepo, this.bookingEqItemRepo);
    this.approveBookingUseCase = new ApproveBookingUseCase(this.bookingRepo, this.bookingEqItemRepo, this.checkAvailabilityUseCase, this.uow, this.auditLogRepo);
    this.rejectBookingUseCase = new RejectBookingUseCase(this.bookingRepo, this.uow, this.auditLogRepo);
    this.checkInBookingUseCase = new CheckInBookingUseCase(this.bookingRepo, this.checkInOutLogRepo, this.computerRepo, this.computerActivityRepo, this.uow, this.auditLogRepo);
    this.checkOutBookingUseCase = new CheckOutBookingUseCase(this.bookingRepo, this.checkInOutLogRepo, this.computerRepo, this.computerActivityRepo, this.uow, this.auditLogRepo);
    this.getLabUsageStatisticsUseCase = new GetLabUsageStatisticsUseCase(this.checkInOutLogRepo, this.computerActivityRepo);

    this.bookingController = new BookingController(
      this.createBookingUseCase,
      this.getBookingUseCase,
      this.getMyBookingsUseCase,
      this.getBookingCalendarUseCase,
      this.cancelBookingUseCase,
      this.listPendingBookingsUseCase,
      this.approveBookingUseCase,
      this.rejectBookingUseCase,
      this.checkInBookingUseCase,
      this.checkOutBookingUseCase,
      this.getLabUsageStatisticsUseCase
    );

    this.loginUseCase = new LoginUseCase(
      this.userRepo,
      this.sessionRepo,
      this.rolePermQuery,
      this.hasher,
      this.tokenService,
      this.uow,
      this.auditLogRepo
    );
    this.refreshSessionUseCase = new RefreshSessionUseCase(
      this.userRepo,
      this.sessionRepo,
      this.rolePermQuery,
      this.tokenService,
      this.uow
    );
    this.logoutUseCase = new LogoutUseCase(
      this.sessionRepo,
      this.uow
    );
    this.getCurrentUserUseCase = new GetCurrentUserUseCase(
      this.userRepo,
      this.rolePermQuery
    );
    this.changePasswordUseCase = new ChangePasswordUseCase(
      this.userRepo,
      this.sessionRepo,
      this.hasher,
      this.uow,
      this.auditLogRepo
    );

    this.listUsersUseCase = new ListUsersUseCase(this.userRepo);
    this.getUserSummaryUseCase = new GetUserSummaryUseCase(this.userRepo);
    this.getUserUseCase = new GetUserUseCase(this.userRepo);
    this.createUserUseCase = new CreateUserUseCase(
      this.userRepo,
      this.hasher,
      this.uow,
      this.auditLogRepo
    );
    this.updateUserUseCase = new UpdateUserUseCase(
      this.userRepo,
      this.uow,
      this.auditLogRepo
    );
    this.updateUserStatusUseCase = new UpdateUserStatusUseCase(
      this.userRepo,
      this.uow,
      this.auditLogRepo
    );
    this.assignUserRolesUseCase = new AssignUserRolesUseCase(
      this.userRepo,
      this.uow,
      this.auditLogRepo
    );
    this.resetUserPasswordUseCase = new ResetUserPasswordUseCase(
      this.userRepo,
      this.sessionRepo,
      this.hasher,
      this.uow,
      this.auditLogRepo
    );
    this.userController = new UserController(
      this.listUsersUseCase,
      this.getUserSummaryUseCase,
      this.getUserUseCase,
      this.createUserUseCase,
      this.updateUserUseCase,
      this.updateUserStatusUseCase,
      this.assignUserRolesUseCase,
      this.resetUserPasswordUseCase
    );

    this.listRolesUseCase = new ListRolesUseCase(this.rolePermissionRepo);
    this.getRoleCatalogUseCase = new GetRoleCatalogUseCase(this.rolePermissionRepo);
    this.getRoleUseCase = new GetRoleUseCase(this.rolePermissionRepo);
    this.updateRolePermissionsUseCase = new UpdateRolePermissionsUseCase(
      this.rolePermissionRepo,
      this.uow,
      this.auditLogRepo
    );
    this.roleController = new RoleController(
      this.listRolesUseCase,
      this.getRoleCatalogUseCase,
      this.getRoleUseCase,
      this.updateRolePermissionsUseCase
    );

    this.listAuditLogsUseCase = new ListAuditLogsUseCase(this.auditLogRepo);
    this.auditLogController = new AuditLogController(this.listAuditLogsUseCase);

    const maintenanceDependencies = {
      maintenanceRepo: this.maintenanceRepo,
      labRepo: this.labProfileRepo,
      computerRepo: this.computerRepo,
      computerActivityRepo: this.computerActivityRepo,
      equipmentRepo: this.equipmentRepo,
      userRepo: this.userRepo,
      equipmentTxRepo: this.equipmentTxRepo,
      uow: this.uow,
      auditLogRepo: this.auditLogRepo,
    };
    this.listMaintenancesUseCase = new ListMaintenancesUseCase(this.maintenanceRepo);
    this.getMaintenanceSummaryUseCase = new GetMaintenanceSummaryUseCase(this.maintenanceRepo);
    this.getMaintenanceOptionsUseCase = new GetMaintenanceOptionsUseCase(this.maintenanceRepo);
    this.getMaintenanceUseCase = new GetMaintenanceUseCase(this.maintenanceRepo);
    this.createMaintenanceUseCase = new CreateMaintenanceUseCase(maintenanceDependencies, this.idGenerator);
    this.updateMaintenanceUseCase = new UpdateMaintenanceUseCase(maintenanceDependencies);
    this.startMaintenanceUseCase = new StartMaintenanceUseCase(maintenanceDependencies);
    this.completeMaintenanceUseCase = new CompleteMaintenanceUseCase(maintenanceDependencies);
    this.cancelMaintenanceUseCase = new CancelMaintenanceUseCase(maintenanceDependencies);
    this.deleteMaintenanceUseCase = new DeleteMaintenanceUseCase(maintenanceDependencies);
    this.syncComputerMaintenanceRemindersUseCase = new SyncComputerMaintenanceRemindersUseCase(
      this.computerRepo,
      this.maintenanceProposalService,
      this.uow,
    );
    this.maintenanceController = new MaintenanceController(
      this.listMaintenancesUseCase,
      this.getMaintenanceSummaryUseCase,
      this.getMaintenanceOptionsUseCase,
      this.getMaintenanceUseCase,
      this.createMaintenanceUseCase,
      this.updateMaintenanceUseCase,
      this.startMaintenanceUseCase,
      this.completeMaintenanceUseCase,
      this.cancelMaintenanceUseCase,
      this.deleteMaintenanceUseCase,
      this.syncComputerMaintenanceRemindersUseCase,
    );
  }
}


export const container = new DependencyContainer();
