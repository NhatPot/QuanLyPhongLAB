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
import { SqlAvailabilityQueryService } from '../infrastructure/database/sqlserver/repositories/SqlAvailabilityQueryService';

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

import { ILabProfileRepository } from '../domain/repositories/ILabProfileRepository';
import { IComputerRepository } from '../domain/repositories/IComputerRepository';
import { IEquipmentCategoryRepository } from '../domain/repositories/IEquipmentCategoryRepository';
import { IEquipmentRepository } from '../domain/repositories/IEquipmentRepository';
import { IEquipmentInventoryTransactionRepository } from '../domain/repositories/IEquipmentInventoryTransactionRepository';
import { IBookingRequestRepository } from '../domain/repositories/IBookingRequestRepository';
import { IBookingEquipmentItemRepository } from '../domain/repositories/IBookingEquipmentItemRepository';
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
  public readonly availabilityQueryService: IAvailabilityQueryService;

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
    this.availabilityQueryService = new SqlAvailabilityQueryService();

    this.getHealthUseCase = new GetHealthUseCase();
    this.healthController = new HealthController(this.getHealthUseCase);

    this.getLabProfileUseCase = new GetLabProfileUseCase(this.labProfileRepo);
    this.updateLabProfileUseCase = new UpdateLabProfileUseCase(this.labProfileRepo, this.uow, this.auditLogRepo);
    this.updateLabStatusUseCase = new UpdateLabStatusUseCase(this.labProfileRepo, this.uow, this.auditLogRepo);
    this.labController = new LabController(this.getLabProfileUseCase, this.updateLabProfileUseCase, this.updateLabStatusUseCase);

    this.createComputerUseCase = new CreateComputerUseCase(this.computerRepo, this.uow, this.auditLogRepo);
    this.getComputerUseCase = new GetComputerUseCase(this.computerRepo);
    this.listComputersUseCase = new ListComputersUseCase(this.computerRepo);
    this.updateComputerUseCase = new UpdateComputerUseCase(this.computerRepo, this.uow, this.auditLogRepo);
    this.updateComputerStatusUseCase = new UpdateComputerStatusUseCase(this.computerRepo, this.uow, this.auditLogRepo);
    this.deleteComputerUseCase = new DeleteComputerUseCase(this.computerRepo, this.uow, this.auditLogRepo);
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

    this.bookingController = new BookingController(
      this.createBookingUseCase,
      this.getBookingUseCase,
      this.getMyBookingsUseCase,
      this.getBookingCalendarUseCase,
      this.cancelBookingUseCase,
      this.listPendingBookingsUseCase,
      this.approveBookingUseCase,
      this.rejectBookingUseCase
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
  }
}


export const container = new DependencyContainer();
