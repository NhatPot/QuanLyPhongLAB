import { Request, Response } from 'express';
import { CreateBookingUseCase } from '../../../application/use-cases/booking/CreateBookingUseCase';
import { GetBookingUseCase } from '../../../application/use-cases/booking/GetBookingUseCase';
import { GetMyBookingsUseCase } from '../../../application/use-cases/booking/GetMyBookingsUseCase';
import { GetBookingCalendarUseCase } from '../../../application/use-cases/booking/GetBookingCalendarUseCase';
import { CancelBookingUseCase } from '../../../application/use-cases/booking/CancelBookingUseCase';
import { ListPendingBookingsUseCase } from '../../../application/use-cases/booking/ListPendingBookingsUseCase';
import { ApproveBookingUseCase } from '../../../application/use-cases/booking/ApproveBookingUseCase';
import { RejectBookingUseCase } from '../../../application/use-cases/booking/RejectBookingUseCase';
import { BookingType } from '../../../domain/entities/BookingRequest';

export class BookingController {
  constructor(
    private createBookingUseCase: CreateBookingUseCase,
    private getBookingUseCase: GetBookingUseCase,
    private getMyBookingsUseCase: GetMyBookingsUseCase,
    private getBookingCalendarUseCase: GetBookingCalendarUseCase,
    private cancelBookingUseCase: CancelBookingUseCase,
    private listPendingBookingsUseCase: ListPendingBookingsUseCase,
    private approveBookingUseCase: ApproveBookingUseCase,
    private rejectBookingUseCase: RejectBookingUseCase
  ) {}

  public create = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const input = {
        requesterId: user.id,
        bookingType: req.body.bookingType as BookingType,
        purpose: req.body.purpose,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        expectedReturnTime: req.body.expectedReturnTime ? new Date(req.body.expectedReturnTime) : null,
        numberOfPeople: req.body.numberOfPeople || 1,
        numberOfComputers: req.body.numberOfComputers || 0,
        equipments: req.body.equipments || [],
        note: req.body.note
      };

      const booking = await this.createBookingUseCase.execute(input);
      res.status(201).json({
        id: booking.id.toString(),
        requestCode: booking.requestCode,
        status: booking.status
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const booking = await this.getBookingUseCase.execute(req.params.id, user.id, user.role);
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
      const bookings = await this.getMyBookingsUseCase.execute(user.id);
      res.status(200).json(bookings.map(b => this.toDTO(b)));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  public getCalendar = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const start = req.query.start ? new Date(req.query.start as string) : new Date();
      const end = req.query.end ? new Date(req.query.end as string) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const calendar = await this.getBookingCalendarUseCase.execute(start, end, user ? user.role : 'GUEST');
      res.status(200).json(calendar);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  public cancel = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const booking = await this.cancelBookingUseCase.execute(req.params.id, user.id, user.role, req.body.reason);
      res.status(200).json({ success: true, status: booking.status });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  public listPending = async (req: Request, res: Response): Promise<void> => {
    try {
      const bookings = await this.listPendingBookingsUseCase.execute();
      res.status(200).json(bookings.map(b => this.toDTO(b)));
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  public approve = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const booking = await this.approveBookingUseCase.execute(req.params.id, user.id);
      res.status(200).json({ success: true, status: booking.status });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  public reject = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const booking = await this.rejectBookingUseCase.execute(req.params.id, user.id, req.body.reason);
      res.status(200).json({ success: true, status: booking.status });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  private toDTO(booking: any): any {
    return {
      id: booking.id.toString(),
      requestCode: booking.requestCode,
      requesterId: booking.requesterId,
      bookingType: booking.bookingType,
      purpose: booking.purpose,
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
