import { NextFunction, Request, Response } from 'express';
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
import { ListBookingRequesterOptionsUseCase } from '../../../application/use-cases/booking/ListBookingRequesterOptionsUseCase';
import { BookingType } from '../../../domain/entities/BookingRequest';
import { ListBookingPurposeOptionsUseCase } from '../../../application/use-cases/booking/ListBookingPurposeOptionsUseCase';
import { CreatePurposeGroupUseCase } from '../../../application/use-cases/booking/CreatePurposeGroupUseCase';
import { DeletePurposeGroupUseCase } from '../../../application/use-cases/booking/DeletePurposeGroupUseCase';

function primaryBookingRole(user: any): string {
  if (Array.isArray(user?.roles) && user.roles.includes('ADMIN')) return 'ADMIN';
  if (Array.isArray(user?.roles) && user.roles.includes('LAB_STAFF')) return 'LAB_STAFF';
  return Array.isArray(user?.roles) ? user.roles[0] || '' : '';
}

export class BookingController {
  constructor(
    private createBookingUseCase: CreateBookingUseCase,
    private getBookingUseCase: GetBookingUseCase,
    private getMyBookingsUseCase: GetMyBookingsUseCase,
    private getBookingCalendarUseCase: GetBookingCalendarUseCase,
    private cancelBookingUseCase: CancelBookingUseCase,
    private listPendingBookingsUseCase: ListPendingBookingsUseCase,
    private approveBookingUseCase: ApproveBookingUseCase,
    private rejectBookingUseCase: RejectBookingUseCase,
    private checkInBookingUseCase: CheckInBookingUseCase,
    private checkOutBookingUseCase: CheckOutBookingUseCase,
    private getLabUsageStatisticsUseCase: GetLabUsageStatisticsUseCase,
    private listBookingRequesterOptionsUseCase: ListBookingRequesterOptionsUseCase,
    private listBookingPurposeOptionsUseCase?: ListBookingPurposeOptionsUseCase,
    private createPurposeGroupUseCase?: CreatePurposeGroupUseCase,
    private deletePurposeGroupUseCase?: DeletePurposeGroupUseCase,
  ) {}

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      const input = {
        actorUserId: user.userId,
        actorRoles: Array.isArray(user.roles) ? user.roles : [],
        actorPermissions: Array.isArray(user.permissions) ? user.permissions : [],
        requesterId: req.body.requesterId,
        bookingType: req.body.bookingType as BookingType,
        purpose: req.body.purpose,
        purposeGroupId: req.body.purposeGroupId,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        expectedReturnTime: req.body.expectedReturnTime ? new Date(req.body.expectedReturnTime) : null,
        numberOfPeople: req.body.numberOfPeople || 1,
        numberOfComputers: req.body.numberOfComputers || 0,
        equipments: req.body.equipments || [],
        note: req.body.note,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        correlationId: req.correlationId,
      };

      const booking = await this.createBookingUseCase.execute(input);
      res.status(201).json({
        id: booking.id.toString(),
        requestCode: booking.requestCode,
        status: booking.status,
        purposeGroupId: booking.purposeGroupId,
      });
    } catch (error: any) {
      next(error);
    }
  };

  public createPurposeGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!this.createPurposeGroupUseCase) {
        res.status(501).json({ error: 'Chức năng chưa được kích hoạt.' });
        return;
      }
      const group = await this.createPurposeGroupUseCase.execute(req.body.name);
      res.status(201).json({
        data: {
          id: group.id.toString(),
          code: group.code,
          name: group.name,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public deletePurposeGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!this.deletePurposeGroupUseCase) {
        res.status(501).json({ error: 'Chức năng chưa được kích hoạt.' });
        return;
      }
      await this.deletePurposeGroupUseCase.execute(req.params.id as string);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  public listRequesterOptions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const keyword = typeof req.query.keyword === 'string' ? req.query.keyword : undefined;
      const requesters = await this.listBookingRequesterOptionsUseCase.execute(keyword);
      res.status(200).json({ data: requesters });
    } catch (error) {
      next(error);
    }
  };

  public listPurposeOptions = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const options = this.listBookingPurposeOptionsUseCase
        ? await this.listBookingPurposeOptionsUseCase.execute()
        : [];
      res.status(200).json({ data: options });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const booking = await this.getBookingUseCase.execute(req.params.id as string, user.userId, primaryBookingRole(user));
      res.status(200).json(this.toDTO(booking));
    } catch (error: any) {
      if (error.message.includes('không có quyền')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(404).json({ error: error.message });
      }
    }
  };

  public getMyBookings = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const bookings = await this.getMyBookingsUseCase.execute(user.userId);
      res.status(200).json(bookings.map(detail => this.toDTO(detail)));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  public getCalendar = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const start = req.query.start ? new Date(req.query.start as string) : new Date();
      const end = req.query.end ? new Date(req.query.end as string) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const calendar = await this.getBookingCalendarUseCase.execute(start, end, user ? primaryBookingRole(user) : 'GUEST');
      res.status(200).json(calendar);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  public cancel = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const booking = await this.cancelBookingUseCase.execute(req.params.id as string, user.userId, primaryBookingRole(user), req.body.reason);
      res.status(200).json({ success: true, status: booking.status });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  public listPending = async (req: Request, res: Response): Promise<void> => {
    try {
      const bookings = await this.listPendingBookingsUseCase.execute();
      res.status(200).json(bookings.map(detail => this.toDTO(detail)));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  public approve = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const booking = await this.approveBookingUseCase.execute(req.params.id as string, user.userId);
      res.status(200).json({ success: true, status: booking.status });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  public reject = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const booking = await this.rejectBookingUseCase.execute(req.params.id as string, user.userId, req.body.reason);
      res.status(200).json({ success: true, status: booking.status });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  public checkIn = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const result = await this.checkInBookingUseCase.execute({
        bookingId: req.params.id as string,
        userId: user.userId,
        actualPeopleCount: req.body.actualPeopleCount === undefined ? undefined : Number(req.body.actualPeopleCount),
        actualComputerCount: req.body.actualComputerCount === undefined ? undefined : Number(req.body.actualComputerCount),
        computerIds: Array.isArray(req.body.computerIds) ? req.body.computerIds : undefined,
        initialCondition: req.body.initialCondition,
        note: req.body.note,
      });
      res.status(200).json({
        success: true,
        status: result.booking.status,
        checkInTime: result.log.checkInTime,
        actualPeopleCount: result.log.actualPeopleCount,
        actualComputerCount: result.log.actualComputerCount,
        computerIds: result.computerIds,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  public checkOut = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const result = await this.checkOutBookingUseCase.execute({
        bookingId: req.params.id as string,
        userId: user.userId,
        returnCondition: req.body.returnCondition,
        note: req.body.note,
      });
      res.status(200).json({ success: true, status: result.booking.status, checkOutTime: result.log.checkOutTime, computerIds: result.computerIds });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  public getUsageStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const month = typeof req.query.month === 'string' ? req.query.month : new Date().toISOString().slice(0, 7);
      const statistics = await this.getLabUsageStatisticsUseCase.execute(month);
      res.status(200).json({ data: statistics });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  private toDTO(detail: any): any {
    const booking = detail.booking || detail;
    const requester = detail.requester || null;
    return {
      id: booking.id.toString(),
      requestCode: booking.requestCode,
      requesterId: booking.requesterId,
      requester,
      bookingType: booking.bookingType,
      purpose: booking.purpose,
      purposeGroupId: booking.purposeGroupId,
      startTime: booking.startTime,
      endTime: booking.endTime,
      expectedReturnTime: booking.expectedReturnTime,
      numberOfPeople: booking.numberOfPeople,
      numberOfComputers: booking.numberOfComputers,
      status: booking.status,
      isOverdue: booking.isOverdue,
      hasIncident: booking.hasIncident,
      note: booking.note,
      createdAt: booking.createdAt,
      equipmentItems: booking.equipmentItems?.map((eq: any) => ({
        id: eq.id.toString(),
        equipmentId: eq.equipmentId,
        requestedQuantity: eq.requestedQuantity,
        reservedQuantity: eq.reservedQuantity,
        borrowedQuantity: eq.borrowedQuantity
      }))
    };
  }
}
