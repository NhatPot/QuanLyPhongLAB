import { ICheckInOutLogRepository, LabUsageSession } from '../../../domain/repositories/ICheckInOutLogRepository';
import { ComputerActivityRecord, IComputerActivityRepository } from '../../../domain/repositories/IComputerActivityRepository';

type DailyUsage = {
  date: string;
  usageHours: number;
  computerHours: number;
  checkInCount: number;
  checkOutCount: number;
};

type ComputerSummary = {
  computerId: string;
  computerCode: string;
  computerName: string;
  usageSessionCount: number;
  usageHours: number;
  readyHours: number;
  maintenanceHours: number;
  brokenHours: number;
  lockedHours: number;
  inactiveHours: number;
  currentActivityType: string | null;
  currentActivityStartedAt: Date | null;
  currentBookingCode: string | null;
  currentPurpose: string | null;
  currentRequesterName: string | null;
};

const LAB_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;

function monthBounds(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Tháng thống kê phải có dạng YYYY-MM.');
  const [year, monthIndex] = month.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, monthIndex - 1, 1) - LAB_TIMEZONE_OFFSET_MS),
    end: new Date(Date.UTC(year, monthIndex, 1) - LAB_TIMEZONE_OFFSET_MS),
  };
}

function dayKey(value: Date) {
  return new Date(value.getTime() + LAB_TIMEZONE_OFFSET_MS).toISOString().slice(0, 10);
}

function nextLabDay(value: Date) {
  const local = new Date(value.getTime() + LAB_TIMEZONE_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - LAB_TIMEZONE_OFFSET_MS);
}

function roundHours(value: number) {
  return Math.round(value * 100) / 100;
}

function overlapHours(startedAt: Date, endedAt: Date, rangeStart: Date, rangeEnd: Date) {
  const milliseconds = Math.max(0, Math.min(endedAt.getTime(), rangeEnd.getTime()) - Math.max(startedAt.getTime(), rangeStart.getTime()));
  return milliseconds / 3_600_000;
}

export class GetLabUsageStatisticsUseCase {
  constructor(
    private checkInOutLogRepo: ICheckInOutLogRepository,
    private computerActivityRepo: IComputerActivityRepository,
  ) {}

  public async execute(month: string) {
    const { start, end } = monthBounds(month);
    const [sessions, activities, currentActivities] = await Promise.all([
      this.checkInOutLogRepo.findUsageSessions(start, end),
      this.computerActivityRepo.findActivities(start, end),
      this.computerActivityRepo.findCurrentActivities(),
    ]);
    const daily = new Map<string, DailyUsage>();
    for (let cursor = new Date(start); cursor < end; cursor = nextLabDay(cursor)) {
      daily.set(dayKey(cursor), { date: dayKey(cursor), usageHours: 0, computerHours: 0, checkInCount: 0, checkOutCount: 0 });
    }

    const now = new Date();
    const usageActivities = activities.filter((activity) => activity.activityType === 'IN_USE');
    const bookingsWithMachineLogs = new Set(usageActivities.map((activity) => activity.bookingRequestId).filter(Boolean));
    sessions.forEach((session) => this.accumulateRoomSession(session, start, end, now, daily, bookingsWithMachineLogs));
    usageActivities.forEach((activity) => this.accumulateComputerActivity(activity, start, end, now, daily));

    const dailyUsage = Array.from(daily.values()).map((item) => ({
      ...item,
      usageHours: roundHours(item.usageHours),
      computerHours: roundHours(item.computerHours),
    }));
    const computerSummaries = this.createComputerSummaries(activities, currentActivities, start, end, now);

    return {
      month,
      rangeStart: start,
      rangeEnd: end,
      totalUsageHours: roundHours(dailyUsage.reduce((sum, item) => sum + item.usageHours, 0)),
      totalComputerHours: roundHours(dailyUsage.reduce((sum, item) => sum + item.computerHours, 0)),
      totalCheckIns: sessions.filter((session) => session.checkInTime && session.checkInTime >= start && session.checkInTime < end).length,
      totalCheckOuts: sessions.filter((session) => session.checkOutTime && session.checkOutTime >= start && session.checkOutTime < end).length,
      activeSessions: sessions.filter((session) => !session.checkOutTime).length,
      daily: dailyUsage,
      sessions: sessions.map((session) => this.toSessionDto(session, usageActivities, start, end, now)),
      computerSummaries,
      computerActivities: activities.map((activity) => this.toActivityDto(activity, start, end, now)),
    };
  }

  private accumulateRoomSession(
    session: LabUsageSession,
    rangeStart: Date,
    rangeEnd: Date,
    now: Date,
    daily: Map<string, DailyUsage>,
    bookingsWithMachineLogs: Set<string | null>,
  ) {
    if (!session.checkInTime) return;
    const sessionEnd = session.checkOutTime || now;
    const useEstimatedComputerHours = !bookingsWithMachineLogs.has(session.bookingRequestId);
    const computerCount = session.actualComputerCount ?? session.requestedComputerCount;
    this.accumulateInterval(session.checkInTime, sessionEnd, rangeStart, rangeEnd, (date, hours) => {
      const item = daily.get(date);
      if (!item) return;
      item.usageHours += hours;
      if (useEstimatedComputerHours) item.computerHours += hours * computerCount;
    });

    if (session.checkInTime >= rangeStart && session.checkInTime < rangeEnd) daily.get(dayKey(session.checkInTime))!.checkInCount += 1;
    if (session.checkOutTime && session.checkOutTime >= rangeStart && session.checkOutTime < rangeEnd) daily.get(dayKey(session.checkOutTime))!.checkOutCount += 1;
  }

  private accumulateComputerActivity(activity: ComputerActivityRecord, rangeStart: Date, rangeEnd: Date, now: Date, daily: Map<string, DailyUsage>) {
    this.accumulateInterval(activity.startedAt, activity.endedAt || now, rangeStart, rangeEnd, (date, hours) => {
      const item = daily.get(date);
      if (item) item.computerHours += hours;
    });
  }

  private accumulateInterval(startedAt: Date, endedAt: Date, rangeStart: Date, rangeEnd: Date, onSegment: (date: string, hours: number) => void) {
    let cursor = new Date(Math.max(startedAt.getTime(), rangeStart.getTime()));
    const end = new Date(Math.min(endedAt.getTime(), rangeEnd.getTime()));
    while (cursor < end) {
      const nextDay = nextLabDay(cursor);
      const segmentEnd = new Date(Math.min(nextDay.getTime(), end.getTime()));
      onSegment(dayKey(cursor), (segmentEnd.getTime() - cursor.getTime()) / 3_600_000);
      cursor = segmentEnd;
    }
  }

  private toSessionDto(session: LabUsageSession, usageActivities: ComputerActivityRecord[], rangeStart: Date, rangeEnd: Date, now: Date) {
    const end = session.checkOutTime || now;
    const usageHours = roundHours(overlapHours(session.checkInTime!, end, rangeStart, rangeEnd));
    const computerCount = session.actualComputerCount ?? session.requestedComputerCount;
    const machineLogs = usageActivities.filter((activity) => activity.bookingRequestId === session.bookingRequestId);
    const computerHours = machineLogs.length
      ? roundHours(machineLogs.reduce((sum, activity) => sum + overlapHours(activity.startedAt, activity.endedAt || now, rangeStart, rangeEnd), 0))
      : roundHours(usageHours * computerCount);
    return {
      bookingId: session.bookingRequestId,
      requestCode: session.requestCode,
      purpose: session.purpose,
      bookingType: session.bookingType,
      checkInTime: session.checkInTime,
      checkOutTime: session.checkOutTime,
      actualPeopleCount: session.actualPeopleCount ?? session.requestedPeopleCount,
      actualComputerCount: computerCount,
      usageHours,
      computerHours,
      computerHoursSource: machineLogs.length ? 'MACHINE_LOGS' : 'ESTIMATED_COUNT',
      computerCodes: machineLogs.map((activity) => activity.computerCode),
      isActive: !session.checkOutTime,
    };
  }

  private toActivityDto(activity: ComputerActivityRecord, rangeStart: Date, rangeEnd: Date, now: Date) {
    return {
      ...activity,
      durationHours: roundHours(overlapHours(activity.startedAt, activity.endedAt || now, rangeStart, rangeEnd)),
      isActive: !activity.endedAt,
    };
  }

  private createComputerSummaries(activities: ComputerActivityRecord[], currentActivities: ComputerActivityRecord[], rangeStart: Date, rangeEnd: Date, now: Date) {
    const summaries = new Map<string, ComputerSummary>();
    const ensure = (activity: ComputerActivityRecord) => {
      if (!summaries.has(activity.computerId)) {
        summaries.set(activity.computerId, {
          computerId: activity.computerId,
          computerCode: activity.computerCode,
          computerName: activity.computerName,
          usageSessionCount: 0,
          usageHours: 0,
          readyHours: 0,
          maintenanceHours: 0,
          brokenHours: 0,
          lockedHours: 0,
          inactiveHours: 0,
          currentActivityType: null,
          currentActivityStartedAt: null,
          currentBookingCode: null,
          currentPurpose: null,
          currentRequesterName: null,
        });
      }
      return summaries.get(activity.computerId)!;
    };

    activities.forEach((activity) => {
      const summary = ensure(activity);
      const hours = overlapHours(activity.startedAt, activity.endedAt || now, rangeStart, rangeEnd);
      if (activity.activityType === 'IN_USE') { summary.usageHours += hours; summary.usageSessionCount += 1; }
      if (activity.activityType === 'ACTIVE') summary.readyHours += hours;
      if (activity.activityType === 'MAINTENANCE') summary.maintenanceHours += hours;
      if (activity.activityType === 'BROKEN') summary.brokenHours += hours;
      if (activity.activityType === 'LOCKED') summary.lockedHours += hours;
      if (activity.activityType === 'INACTIVE') summary.inactiveHours += hours;
    });
    currentActivities.forEach((activity) => {
      const summary = ensure(activity);
      summary.currentActivityType = activity.activityType;
      summary.currentActivityStartedAt = activity.startedAt;
      summary.currentBookingCode = activity.bookingRequestCode;
      summary.currentPurpose = activity.bookingPurpose;
      summary.currentRequesterName = activity.requesterName;
    });

    return Array.from(summaries.values())
      .map((item) => ({
        ...item,
        usageHours: roundHours(item.usageHours),
        readyHours: roundHours(item.readyHours),
        maintenanceHours: roundHours(item.maintenanceHours),
        brokenHours: roundHours(item.brokenHours),
        lockedHours: roundHours(item.lockedHours),
        inactiveHours: roundHours(item.inactiveHours),
      }))
      .sort((left, right) => left.computerCode.localeCompare(right.computerCode, 'vi'));
  }
}
