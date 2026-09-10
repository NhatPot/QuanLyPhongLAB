import mssql from 'mssql';
import { IAvailabilityQueryService, OverlappingBookingsResult } from '../../../../domain/services/IAvailabilityQueryService';
import { SqlConnectionFactory } from '../connection';

export class SqlAvailabilityQueryService implements IAvailabilityQueryService {
  public async getOverlappingBookings(
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string
  ): Promise<OverlappingBookingsResult> {
    const pool = await SqlConnectionFactory.getPool();
    
    // Fetch all approved/checked-in bookings that overlap with the requested time window
    const request = pool.request()
      .input('startTime', mssql.DateTime2, startTime)
      .input('endTime', mssql.DateTime2, endTime);

    let excludeCondition = '';
    if (excludeBookingId) {
      excludeCondition = 'AND b.Id != @excludeId';
      request.input('excludeId', mssql.UniqueIdentifier, excludeBookingId);
    }

    const query = `
      SELECT 
        b.Id as BookingId,
        b.BookingType,
        b.NumberOfComputers,
        b.StartTime,
        CASE WHEN b.Status IN ('CHECKED_IN', 'OVERDUE') AND b.EndTime < @endTime THEN @endTime ELSE b.EndTime END AS EndTime,
        i.EquipmentId,
        i.RequestedQuantity
      FROM BookingRequests b
      LEFT JOIN BookingEquipmentItems i ON b.Id = i.BookingRequestId
      WHERE b.Status IN ('APPROVED', 'CHECKED_IN', 'OVERDUE')
      AND b.StartTime < @endTime 
      AND (b.EndTime > @startTime OR b.Status IN ('CHECKED_IN', 'OVERDUE'))
      ${excludeCondition}
    `;

    const result = await request.query(query);
    const rows = result.recordset;

    let hasFullLabBooking = false;
    const conflicts: Array<any> = [];
    
    // Group by BookingId
    const bookingsMap = new Map<string, any>();
    for (const row of rows) {
      if (!bookingsMap.has(row.BookingId)) {
        bookingsMap.set(row.BookingId, {
          id: row.BookingId,
          type: row.BookingType,
          startTime: row.StartTime,
          endTime: row.EndTime,
          numberOfComputers: row.NumberOfComputers,
          equipments: []
        });
      }
      
      if (row.EquipmentId) {
        bookingsMap.get(row.BookingId).equipments.push({
          equipmentId: row.EquipmentId,
          quantity: row.RequestedQuantity
        });
      }
    }

    const bookings = Array.from(bookingsMap.values());
    
    for (const b of bookings) {
      conflicts.push({
        type: b.type,
        startTime: b.startTime,
        endTime: b.endTime
      });
      if (b.type === 'FULL_LAB') {
        hasFullLabBooking = true;
      }
    }

    // Sweep-line algorithm to find peak usage of computers and equipments
    type Event = { time: number; type: 'start' | 'end'; computers: number; equipments: Record<string, number> };
    const events: Event[] = [];

    for (const b of bookings) {
      // We only care about the overlap window within [startTime, endTime]
      const actualStart = Math.max(b.startTime.getTime(), startTime.getTime());
      const actualEnd = Math.min(b.endTime.getTime(), endTime.getTime());
      
      if (actualStart < actualEnd) {
        const eqRecord: Record<string, number> = {};
        for (const eq of b.equipments) {
          eqRecord[eq.equipmentId] = eq.quantity;
        }

        events.push({ time: actualStart, type: 'start', computers: b.numberOfComputers, equipments: eqRecord });
        events.push({ time: actualEnd, type: 'end', computers: b.numberOfComputers, equipments: eqRecord });
      }
    }

    // Sort events: by time ascending, then 'end' before 'start' to avoid false peak at boundaries
    events.sort((a, b) => {
      if (a.time !== b.time) return a.time - b.time;
      if (a.type === b.type) return 0;
      return a.type === 'end' ? -1 : 1;
    });

    let currentComputers = 0;
    const currentEquipments: Record<string, number> = {};
    let peakComputers = 0;
    const peakEquipments: Record<string, number> = {};

    for (const e of events) {
      const sign = e.type === 'start' ? 1 : -1;
      
      currentComputers += sign * e.computers;
      if (currentComputers > peakComputers) {
        peakComputers = currentComputers;
      }

      for (const [eqId, qty] of Object.entries(e.equipments)) {
        if (!currentEquipments[eqId]) currentEquipments[eqId] = 0;
        currentEquipments[eqId] += sign * qty;
        
        if (!peakEquipments[eqId]) peakEquipments[eqId] = 0;
        if (currentEquipments[eqId] > peakEquipments[eqId]) {
          peakEquipments[eqId] = currentEquipments[eqId];
        }
      }
    }

    return {
      hasFullLabBooking,
      totalReservedComputers: peakComputers,
      reservedEquipments: peakEquipments,
      conflicts
    };
  }
}
