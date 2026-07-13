export interface OverlappingBookingsResult {
  hasFullLabBooking: boolean;
  totalReservedComputers: number;
  reservedEquipments: Record<string, number>;
  conflicts: Array<{
    type: string;
    startTime: Date;
    endTime: Date;
  }>;
}

export interface IAvailabilityQueryService {
  getOverlappingBookings(
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string
  ): Promise<OverlappingBookingsResult>;
}
