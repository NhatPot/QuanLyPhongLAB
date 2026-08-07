export interface CheckInOutLog {
  bookingRequestId: string;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  checkedInBy: string | null;
  checkedOutBy: string | null;
  actualPeopleCount: number | null;
  actualComputerCount: number | null;
  initialCondition: string | null;
  returnCondition: string | null;
  note: string | null;
}

export interface LabUsageSession extends CheckInOutLog {
  requestCode: string;
  purpose: string;
  purposeGroupId?: string | null;
  purposeGroupName?: string | null;
  bookingType: string;
  requestedPeopleCount: number;
  requestedComputerCount: number;
}

export interface CheckInInput {
  bookingRequestId: string;
  checkedInBy: string;
  actualPeopleCount: number;
  actualComputerCount: number;
  initialCondition?: string | null;
  note?: string | null;
}

export interface CheckOutInput {
  bookingRequestId: string;
  checkedOutBy: string;
  returnCondition?: string | null;
  note?: string | null;
}

export interface ICheckInOutLogRepository {
  checkIn(input: CheckInInput, transaction?: any): Promise<CheckInOutLog>;
  checkOut(input: CheckOutInput, transaction?: any): Promise<CheckInOutLog>;
  findUsageSessions(start: Date, end: Date): Promise<LabUsageSession[]>;
}
