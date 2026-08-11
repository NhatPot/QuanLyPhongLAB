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
import { IIncidentReportRepository } from '../domain/repositories/IIncidentReportRepository';
import { IExpenseRepository } from '../domain/repositories/IExpenseRepository';
import { IDeviceAgentRepository } from '../domain/repositories/IDeviceAgentRepository';

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
import { SqlIncidentReportRepository } from '../infrastructure/database/sqlserver/repositories/SqlIncidentReportRepository';
import { SqlExpenseRepository } from '../infrastructure/database/sqlserver/repositories/SqlExpenseRepository';
import { SqlDeviceAgentRepository } from '../infrastructure/database/sqlserver/repositories/SqlDeviceAgentRepository';
import { SqlBookingPurposeGroupRepository } from '../infrastructure/database/sqlserver/repositories/SqlBookingPurposeGroupRepository';

import { GetHealthUseCase } from '../application/use-cases/GetHealthUseCase';
import { LoginUseCase } from '../application/use-cases/auth/LoginUseCase';
import { RefreshSessionUseCase } from '../application/use-cases/auth/RefreshSessionUseCase';
import { LogoutUseCase } from '../application/use-cases/auth/LogoutUseCase';
import { GetCurrentUserUseCase } from '../application/use-cases/auth/GetCurrentUserUseCase';
import { ChangePasswordUseCase } from '../application/use-cases/auth/ChangePasswordUseCase';
import { UpdateCurrentUserProfileUseCase } from '../application/use-cases/auth/UpdateCurrentUserProfileUseCase';

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
import { DeleteEquipmentCategoryUseCase } from '../application/use-cases/equipment-category/DeleteEquipmentCategoryUseCase';
import { CreateEquipmentUseCase } from '../application/use-cases/equipment/CreateEquipmentUseCase';
import { GetEquipmentUseCase } from '../application/use-cases/equipment/GetEquipmentUseCase';
import { ListEquipmentUseCase } from '../application/use-cases/equipment/ListEquipmentUseCase';
import { UpdateEquipmentUseCase } from '../application/use-cases/equipment/UpdateEquipmentUseCase';
import { AdjustInventoryUseCase } from '../application/use-cases/equipment/AdjustInventoryUseCase';
import { ReportBrokenEquipmentUseCase } from '../application/use-cases/equipment/ReportBrokenEquipmentUseCase';
import { DeleteEquipmentUseCase } from '../application/use-cases/equipment/DeleteEquipmentUseCase';

import { CheckAvailabilityUseCase } from '../application/use-cases/booking/CheckAvailabilityUseCase';
import { CreateBookingUseCase } from '../application/use-cases/booking/CreateBookingUseCase';
import { GetBookingUseCase } from '../application/use-cases/booking/GetBookingUseCase';
import { GetMyBookingsUseCase } from '../application/use-cases/booking/GetMyBookingsUseCase';
import { GetBookingCalendarUseCase } from '../application/use-cases/booking/GetBookingCalendarUseCase';
import { ListBookingRequesterOptionsUseCase } from '../application/use-cases/booking/ListBookingRequesterOptionsUseCase';
import { ListBookingPurposeOptionsUseCase } from '../application/use-cases/booking/ListBookingPurposeOptionsUseCase';
import { CreatePurposeGroupUseCase } from '../application/use-cases/booking/CreatePurposeGroupUseCase';
import { DeletePurposeGroupUseCase } from '../application/use-cases/booking/DeletePurposeGroupUseCase';
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
  DeleteUserUseCase,
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

import { AuthController } from '../presentation/http/controllers/AuthController';
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
import {
  AssignIncidentUseCase,
  CloseIncidentUseCase,
  CreateIncidentUseCase,
  GetIncidentOptionsUseCase,
  GetIncidentSummaryUseCase,
  GetIncidentUseCase,
  ListIncidentsUseCase,
  ResolveIncidentUseCase,
  StartIncidentUseCase,
  UpdateIncidentUseCase,
} from '../application/use-cases/incident/IncidentManagementUseCases';
import { IncidentController } from '../presentation/http/controllers/IncidentController';
import {
  ApproveExpenseUseCase,
  CancelExpenseUseCase,
  CreateExpenseCategoryUseCase,
  CreateExpenseUseCase,
  DeleteExpenseUseCase,
  GetExpenseOptionsUseCase,
  GetExpenseSummaryUseCase,
  GetExpenseUseCase,
  ListExpenseCategoriesUseCase,
  ListExpensesUseCase,
  MarkExpensePaidUseCase,
  RejectExpenseUseCase,
  SubmitExpenseUseCase,
  UpdateExpenseCategoryUseCase,
  UpdateExpenseUseCase,
} from '../application/use-cases/expense/ExpenseManagementUseCases';
import { ExpenseController } from '../presentation/http/controllers/ExpenseController';
import { RegisterDeviceUseCase } from '../application/use-cases/device/RegisterDeviceUseCase';
import { UnregisterDeviceUseCase } from '../application/use-cases/device/UnregisterDeviceUseCase';
import { UpdateDeviceMetricsUseCase } from '../application/use-cases/device/UpdateDeviceMetricsUseCase';
import { ReportHardwareChangeUseCase } from '../application/use-cases/device/ReportHardwareChangeUseCase';
import { GetAllDeviceMetricsUseCase } from '../application/use-cases/device/GetAllDeviceMetricsUseCase';
import { BindUserDeviceUseCase } from '../application/use-cases/device/BindUserDeviceUseCase';
import { UnbindUserDeviceUseCase } from '../application/use-cases/device/UnbindUserDeviceUseCase';
import { DeviceController } from '../presentation/http/controllers/DeviceController';

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
  public readonly incidentRepo: IIncidentReportRepository;
  public readonly expenseRepo: IExpenseRepository;
  public readonly deviceAgentRepo: IDeviceAgentRepository;
  public readonly maintenanceProposalService: ComputerMaintenanceProposalService;

  // Controllers
  public readonly authController: AuthController;
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
  public readonly incidentController: IncidentController;
  public readonly expenseController: ExpenseController;
  public readonly deviceController: DeviceController;

  // Use cases
  public readonly getHealthUseCase: GetHealthUseCase;
  public readonly loginUseCase: LoginUseCase;
  public readonly refreshSessionUseCase: RefreshSessionUseCase;
  public readonly logoutUseCase: LogoutUseCase;
  public readonly getCurrentUserUseCase: GetCurrentUserUseCase;
  public readonly updateCurrentUserProfileUseCase: UpdateCurrentUserProfileUseCase;
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
  public readonly deleteEquipmentCategoryUseCase: DeleteEquipmentCategoryUseCase;
  public readonly createEquipmentUseCase: CreateEquipmentUseCase;
  public readonly getEquipmentUseCase: GetEquipmentUseCase;
  public readonly listEquipmentUseCase: ListEquipmentUseCase;
  public readonly updateEquipmentUseCase: UpdateEquipmentUseCase;
  public readonly adjustInventoryUseCase: AdjustInventoryUseCase;
  public readonly reportBrokenEquipmentUseCase: ReportBrokenEquipmentUseCase;
  public readonly deleteEquipmentUseCase: DeleteEquipmentUseCase;

  public readonly checkAvailabilityUseCase: CheckAvailabilityUseCase;
  public readonly createBookingUseCase: CreateBookingUseCase;
  public readonly getBookingUseCase: GetBookingUseCase;
  public readonly getMyBookingsUseCase: GetMyBookingsUseCase;
  public readonly getBookingCalendarUseCase: GetBookingCalendarUseCase;
  public readonly listBookingRequesterOptionsUseCase: ListBookingRequesterOptionsUseCase;
  public readonly listBookingPurposeOptionsUseCase: ListBookingPurposeOptionsUseCase;
  public readonly createPurposeGroupUseCase: CreatePurposeGroupUseCase;
  public readonly deletePurposeGroupUseCase: DeletePurposeGroupUseCase;
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
  public readonly deleteUserUseCase: DeleteUserUseCase;

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
  public readonly listIncidentsUseCase: ListIncidentsUseCase;
  public readonly getIncidentSummaryUseCase: GetIncidentSummaryUseCase;
  public readonly getIncidentOptionsUseCase: GetIncidentOptionsUseCase;
  public readonly getIncidentUseCase: GetIncidentUseCase;
  public readonly createIncidentUseCase: CreateIncidentUseCase;
  public readonly updateIncidentUseCase: UpdateIncidentUseCase;
  public readonly assignIncidentUseCase: AssignIncidentUseCase;
  public readonly startIncidentUseCase: StartIncidentUseCase;
  public readonly resolveIncidentUseCase: ResolveIncidentUseCase;
  public readonly closeIncidentUseCase: CloseIncidentUseCase;
  public readonly listExpensesUseCase: ListExpensesUseCase;
  public readonly getExpenseSummaryUseCase: GetExpenseSummaryUseCase;
  public readonly getExpenseOptionsUseCase: GetExpenseOptionsUseCase;
  public readonly getExpenseUseCase: GetExpenseUseCase;
  public readonly createExpenseUseCase: CreateExpenseUseCase;
  public readonly updateExpenseUseCase: UpdateExpenseUseCase;
  public readonly submitExpenseUseCase: SubmitExpenseUseCase;
  public readonly approveExpenseUseCase: ApproveExpenseUseCase;
  public readonly rejectExpenseUseCase: RejectExpenseUseCase;
  public readonly markExpensePaidUseCase: MarkExpensePaidUseCase;
  public readonly cancelExpenseUseCase: CancelExpenseUseCase;
  public readonly deleteExpenseUseCase: DeleteExpenseUseCase;
  public readonly listExpenseCategoriesUseCase: ListExpenseCategoriesUseCase;
  public readonly createExpenseCategoryUseCase: CreateExpenseCategoryUseCase;
  public readonly updateExpenseCategoryUseCase: UpdateExpenseCategoryUseCase;

  public readonly registerDeviceUseCase: RegisterDeviceUseCase;
  public readonly unregisterDeviceUseCase: UnregisterDeviceUseCase;
  public readonly updateDeviceMetricsUseCase: UpdateDeviceMetricsUseCase;
  public readonly reportHardwareChangeUseCase: ReportHardwareChangeUseCase;
  public readonly getAllDeviceMetricsUseCase: GetAllDeviceMetricsUseCase;
  public readonly bindUserDeviceUseCase: BindUserDeviceUseCase;
  public readonly unbindUserDeviceUseCase: UnbindUserDeviceUseCase;

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
    this.incidentRepo = new SqlIncidentReportRepository();
    this.expenseRepo = new SqlExpenseRepository();
    this.deviceAgentRepo = new SqlDeviceAgentRepository();
    this.maintenanceProposalService = new ComputerMaintenanceProposalService(
      this.maintenanceRepo,
      this.idGenerator,
      this.auditLogRepo,
    );

    this.authController = new AuthController();
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
    this.deleteEquipmentCategoryUseCase = new DeleteEquipmentCategoryUseCase(this.equipmentCategoryRepo, this.equipmentRepo);
    this.createEquipmentUseCase = new CreateEquipmentUseCase(this.equipmentRepo, this.equipmentCategoryRepo, this.uow, this.auditLogRepo);
    this.getEquipmentUseCase = new GetEquipmentUseCase(this.equipmentRepo);
    this.listEquipmentUseCase = new ListEquipmentUseCase(this.equipmentRepo);
    this.updateEquipmentUseCase = new UpdateEquipmentUseCase(this.equipmentRepo, this.uow, this.auditLogRepo);
    this.adjustInventoryUseCase = new AdjustInventoryUseCase(this.equipmentRepo, this.equipmentTxRepo, this.uow, this.auditLogRepo);
    this.reportBrokenEquipmentUseCase = new ReportBrokenEquipmentUseCase(this.equipmentRepo, this.equipmentTxRepo, this.uow, this.auditLogRepo);
    this.deleteEquipmentUseCase = new DeleteEquipmentUseCase(this.equipmentRepo, this.uow, this.auditLogRepo);
    this.equipmentController = new EquipmentController(
      this.createEquipmentCategoryUseCase,
      this.listEquipmentCategoriesUseCase,
      this.createEquipmentUseCase,
      this.getEquipmentUseCase,
      this.listEquipmentUseCase,
      this.updateEquipmentUseCase,
      this.adjustInventoryUseCase,
      this.reportBrokenEquipmentUseCase,
      this.deleteEquipmentUseCase,
      this.equipmentTxRepo,
      this.deleteEquipmentCategoryUseCase
    );

    this.checkAvailabilityUseCase = new CheckAvailabilityUseCase(
      this.labProfileRepo,
      this.computerRepo,
      this.equipmentRepo,
      this.availabilityQueryService
    );

    this.availabilityController = new AvailabilityController(this.checkAvailabilityUseCase);

    const bookingPurposeGroupRepo = new SqlBookingPurposeGroupRepository();
    this.createBookingUseCase = new CreateBookingUseCase(
      this.bookingRepo,
      this.bookingEqItemRepo,
      this.checkAvailabilityUseCase,
      this.uow,
      this.auditLogRepo,
      this.userRepo,
      bookingPurposeGroupRepo,
    );
    this.getBookingUseCase = new GetBookingUseCase(this.bookingRepo, this.bookingEqItemRepo);
    this.getMyBookingsUseCase = new GetMyBookingsUseCase(this.bookingRepo, this.bookingEqItemRepo, this.userRepo);
    this.getBookingCalendarUseCase = new GetBookingCalendarUseCase(this.bookingRepo, this.userRepo);
    this.listBookingRequesterOptionsUseCase = new ListBookingRequesterOptionsUseCase(this.userRepo);
    this.listBookingPurposeOptionsUseCase = new ListBookingPurposeOptionsUseCase(bookingPurposeGroupRepo);
    this.createPurposeGroupUseCase = new CreatePurposeGroupUseCase(bookingPurposeGroupRepo);
    this.deletePurposeGroupUseCase = new DeletePurposeGroupUseCase(bookingPurposeGroupRepo);
    this.cancelBookingUseCase = new CancelBookingUseCase(this.bookingRepo, this.bookingEqItemRepo, this.uow, this.auditLogRepo);
    this.listPendingBookingsUseCase = new ListPendingBookingsUseCase(this.bookingRepo, this.bookingEqItemRepo, this.userRepo);
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
      this.getLabUsageStatisticsUseCase,
      this.listBookingRequesterOptionsUseCase,
      this.listBookingPurposeOptionsUseCase,
      this.createPurposeGroupUseCase,
      this.deletePurposeGroupUseCase,
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
    this.updateCurrentUserProfileUseCase = new UpdateCurrentUserProfileUseCase(
      this.userRepo,
      this.rolePermQuery,
      this.uow,
      this.auditLogRepo,
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
    this.deleteUserUseCase = new DeleteUserUseCase(
      this.userRepo,
      this.sessionRepo,
      this.uow,
      this.auditLogRepo,
    );
    this.userController = new UserController(
      this.listUsersUseCase,
      this.getUserSummaryUseCase,
      this.getUserUseCase,
      this.createUserUseCase,
      this.updateUserUseCase,
      this.updateUserStatusUseCase,
      this.assignUserRolesUseCase,
      this.resetUserPasswordUseCase,
      this.deleteUserUseCase,
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
      expenseRepo: this.expenseRepo,
      idGenerator: this.idGenerator,
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

    const incidentDependencies = {
      incidentRepo: this.incidentRepo,
      computerRepo: this.computerRepo,
      equipmentRepo: this.equipmentRepo,
      bookingRepo: this.bookingRepo,
      userRepo: this.userRepo,
      rolePermissionQuery: this.rolePermQuery,
      uow: this.uow,
      auditLogRepo: this.auditLogRepo,
    };
    this.listIncidentsUseCase = new ListIncidentsUseCase(this.incidentRepo);
    this.getIncidentSummaryUseCase = new GetIncidentSummaryUseCase(this.incidentRepo);
    this.getIncidentOptionsUseCase = new GetIncidentOptionsUseCase(this.incidentRepo);
    this.getIncidentUseCase = new GetIncidentUseCase(this.incidentRepo);
    this.createIncidentUseCase = new CreateIncidentUseCase(incidentDependencies, this.idGenerator);
    this.updateIncidentUseCase = new UpdateIncidentUseCase(incidentDependencies);
    this.assignIncidentUseCase = new AssignIncidentUseCase(incidentDependencies);
    this.startIncidentUseCase = new StartIncidentUseCase(incidentDependencies);
    this.resolveIncidentUseCase = new ResolveIncidentUseCase(incidentDependencies);
    this.closeIncidentUseCase = new CloseIncidentUseCase(incidentDependencies);
    this.incidentController = new IncidentController(
      this.listIncidentsUseCase,
      this.getIncidentSummaryUseCase,
      this.getIncidentOptionsUseCase,
      this.getIncidentUseCase,
      this.createIncidentUseCase,
      this.updateIncidentUseCase,
      this.assignIncidentUseCase,
      this.startIncidentUseCase,
      this.resolveIncidentUseCase,
      this.closeIncidentUseCase,
    );

    const expenseDependencies = {
      expenseRepo: this.expenseRepo,
      equipmentRepo: this.equipmentRepo,
      equipmentTxRepo: this.equipmentTxRepo,
      computerRepo: this.computerRepo,
      labRepo: this.labProfileRepo,
      uow: this.uow,
      auditLogRepo: this.auditLogRepo,
      idGenerator: this.idGenerator,
    };
    this.listExpensesUseCase = new ListExpensesUseCase(this.expenseRepo);
    this.getExpenseSummaryUseCase = new GetExpenseSummaryUseCase(this.expenseRepo);
    this.getExpenseOptionsUseCase = new GetExpenseOptionsUseCase(
      this.expenseRepo,
      this.equipmentRepo,
      this.computerRepo,
      this.labProfileRepo,
    );
    this.getExpenseUseCase = new GetExpenseUseCase(this.expenseRepo);
    this.createExpenseUseCase = new CreateExpenseUseCase(expenseDependencies);
    this.updateExpenseUseCase = new UpdateExpenseUseCase(expenseDependencies);
    this.submitExpenseUseCase = new SubmitExpenseUseCase(expenseDependencies);
    this.approveExpenseUseCase = new ApproveExpenseUseCase(expenseDependencies);
    this.rejectExpenseUseCase = new RejectExpenseUseCase(expenseDependencies);
    this.markExpensePaidUseCase = new MarkExpensePaidUseCase(expenseDependencies);
    this.cancelExpenseUseCase = new CancelExpenseUseCase(expenseDependencies);
    this.deleteExpenseUseCase = new DeleteExpenseUseCase(expenseDependencies);
    this.listExpenseCategoriesUseCase = new ListExpenseCategoriesUseCase(this.expenseRepo);
    this.createExpenseCategoryUseCase = new CreateExpenseCategoryUseCase(
      this.expenseRepo, this.uow, this.auditLogRepo, this.idGenerator,
    );
    this.updateExpenseCategoryUseCase = new UpdateExpenseCategoryUseCase(
      this.expenseRepo, this.uow, this.auditLogRepo,
    );
    this.expenseController = new ExpenseController(
      this.listExpensesUseCase,
      this.getExpenseSummaryUseCase,
      this.getExpenseOptionsUseCase,
      this.getExpenseUseCase,
      this.createExpenseUseCase,
      this.updateExpenseUseCase,
      this.submitExpenseUseCase,
      this.approveExpenseUseCase,
      this.rejectExpenseUseCase,
      this.markExpensePaidUseCase,
      this.cancelExpenseUseCase,
      this.deleteExpenseUseCase,
      this.listExpenseCategoriesUseCase,
      this.createExpenseCategoryUseCase,
      this.updateExpenseCategoryUseCase,
    );

    this.registerDeviceUseCase = new RegisterDeviceUseCase(this.computerRepo, this.deviceAgentRepo, this.uow);
    this.unregisterDeviceUseCase = new UnregisterDeviceUseCase(this.computerRepo, this.deviceAgentRepo, this.incidentRepo, this.uow);
    this.updateDeviceMetricsUseCase = new UpdateDeviceMetricsUseCase(this.computerRepo, this.deviceAgentRepo, this.uow);
    this.reportHardwareChangeUseCase = new ReportHardwareChangeUseCase(this.computerRepo, this.deviceAgentRepo, this.incidentRepo, this.uow);
    this.getAllDeviceMetricsUseCase = new GetAllDeviceMetricsUseCase(this.deviceAgentRepo);
    this.bindUserDeviceUseCase = new BindUserDeviceUseCase(this.computerRepo, this.deviceAgentRepo, this.uow);
    this.unbindUserDeviceUseCase = new UnbindUserDeviceUseCase(this.computerRepo, this.deviceAgentRepo, this.uow);
    this.deviceController = new DeviceController(
      this.registerDeviceUseCase,
      this.unregisterDeviceUseCase,
      this.updateDeviceMetricsUseCase,
      this.reportHardwareChangeUseCase,
      this.getAllDeviceMetricsUseCase,
      this.bindUserDeviceUseCase,
      this.unbindUserDeviceUseCase,
    );
  }
}


export const container = new DependencyContainer();
