import { Request, Response } from 'express';
import { CheckAvailabilityUseCase } from '../../../application/use-cases/booking/CheckAvailabilityUseCase';
import { BookingType } from '../../../domain/entities/BookingRequest';
import { z } from 'zod';

export class AvailabilityController {
  constructor(private checkAvailabilityUseCase: CheckAvailabilityUseCase) {}

  public check = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        bookingType,
        startTime,
        endTime,
        numberOfPeople,
        numberOfComputers,
        computerIds,
        equipments,
        excludeBookingId
      } = req.body;

      if (!bookingType || !startTime || !endTime) {
        res.status(400).json({ error: 'bookingType, startTime, endTime là bắt buộc' });
        return;
      }

      const input = {
        bookingType: bookingType as BookingType,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        numberOfPeople: numberOfPeople || 1,
        numberOfComputers: numberOfComputers || 0,
        computerIds: z.array(z.string().uuid()).max(200).optional().parse(computerIds),
        equipments: equipments || [],
        excludeBookingId
      };

      const result = await this.checkAvailabilityUseCase.execute(input);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
