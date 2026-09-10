import { ComputerStatus } from '../entities/Computer';

export interface ComputerActivityRecord {
  id: string;
  computerId: string;
  computerCode: string;
  computerName: string;
  activityType: ComputerStatus;
  startedAt: Date;
  endedAt: Date | null;
  bookingRequestId: string | null;
  bookingRequestCode: string | null;
  bookingPurpose: string | null;
  requesterName: string | null;
  maintenanceScheduleId: string | null;
  maintenanceCode: string | null;
  performedBy: string | null;
  performedByName: string | null;
  note: string | null;
}

export interface ComputerActivityTransitionInput {
  computerId: string;
  activityType: ComputerStatus;
  occurredAt: Date;
  bookingRequestId?: string | null;
  maintenanceScheduleId?: string | null;
  performedBy?: string | null;
  note?: string | null;
}

export interface IComputerActivityRepository {
  closeUsageByBooking(bookingId: string, occurredAt: Date, transaction?: any): Promise<void>;
  transition(input: ComputerActivityTransitionInput, transaction?: any): Promise<void>;
  closeCurrent(computerId: string, occurredAt: Date, transaction?: any): Promise<void>;
  findActiveUsageByBooking(bookingRequestId: string): Promise<ComputerActivityRecord[]>;
  findActivities(start: Date, end: Date): Promise<ComputerActivityRecord[]>;
  findCurrentActivities(): Promise<ComputerActivityRecord[]>;
}
