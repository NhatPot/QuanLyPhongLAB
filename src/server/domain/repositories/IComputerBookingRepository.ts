export interface BookableComputer {
  id: string;
  code: string;
  name: string;
  position: string | null;
  status: string;
  available: boolean;
}

export interface BookingComputerItem {
  computerId: string;
  computerCode: string;
  computerName: string;
  requesterId: string;
  requesterName: string;
  requesterUsername: string;
  requesterEmail: string;
  receivedAt: Date | null;
  returnedAt: Date | null;
}

export interface ComputerBookingHistory extends BookingComputerItem {
  bookingId: string;
  requestCode: string;
  status: string;
  startTime: Date;
  endTime: Date;
  purpose: string;
  initialCondition: string | null;
  returnCondition: string | null;
  checkedInByName: string | null;
  checkedOutByName: string | null;
}

export interface IComputerBookingRepository {
  listAvailability(
    start: Date,
    end: Date,
    excludeBookingId?: string,
    transaction?: any,
  ): Promise<BookableComputer[]>;
  findByBooking(
    bookingId: string,
    transaction?: any,
  ): Promise<BookingComputerItem[]>;
  saveSelection(
    bookingId: string,
    computerIds: string[],
    requesterId: string,
    createdBy: string,
    transaction: any,
  ): Promise<void>;
  recordReceipt(bookingId: string, at: Date, transaction: any): Promise<void>;
  recordReturn(bookingId: string, at: Date, transaction: any): Promise<void>;
  history(
    computerId: string,
    page: number,
  ): Promise<{ data: ComputerBookingHistory[]; total: number }>;
}
