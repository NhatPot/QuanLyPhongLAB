import type { Row, Worksheet } from 'exceljs';
import type { LabUsageStatistics } from '@/services/booking-api';
import type { ComputerData, ComputerSummary, ComputerStatus } from '@/services/computer-api';
import type { EquipmentData } from '@/services/equipment-api';
import { COMPUTER_STATUS_THEME } from '@/features/computers/computer-status-theme';

type ReportWorkbookPayload = {
  summary?: ComputerSummary;
  computers: ComputerData[];
  equipment: EquipmentData[];
  usage: LabUsageStatistics;
};

const COLORS = {
  navy: 'FF0F4C81',
  blue: 'FF2563EB',
  lightBlue: 'FFEFF6FF',
  paleBlue: 'FFF7FAFF',
  slate: 'FF475569',
  border: 'FFD9E2F0',
  white: 'FFFFFFFF',
  green: 'FF10B981',
  amber: 'FFF59E0B',
  red: 'FFEF4444',
};

const STATUS_ORDER: ComputerStatus[] = ['ACTIVE', 'IN_USE', 'MAINTENANCE', 'BROKEN', 'LOCKED', 'INACTIVE'];

function solidFill(argb: string) {
  return { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } };
}

function border() {
  return {
    top: { style: 'thin' as const, color: { argb: COLORS.border } },
    left: { style: 'thin' as const, color: { argb: COLORS.border } },
    bottom: { style: 'thin' as const, color: { argb: COLORS.border } },
    right: { style: 'thin' as const, color: { argb: COLORS.border } },
  };
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? null : result;
}

function statusLabel(status: EquipmentData['status']) {
  if (status === 'ACTIVE') return 'Hoạt động';
  if (status === 'LOCKED') return 'Đã khóa';
  return 'Không hoạt động';
}

function statusValue(summary: ComputerSummary | undefined, computers: ComputerData[], status: ComputerStatus) {
  const key = status === 'ACTIVE' ? 'active' : status === 'IN_USE' ? 'inUse' : status === 'MAINTENANCE' ? 'maintenance' : status === 'BROKEN' ? 'broken' : status === 'LOCKED' ? 'locked' : 'inactive';
  return summary?.[key] ?? computers.filter((computer) => computer.status === status).length;
}

function styleTitle(sheet: Worksheet, row: number, title: string, endColumn: number) {
  sheet.mergeCells(row, 1, row, endColumn);
  const cell = sheet.getCell(row, 1);
  cell.value = title;
  cell.font = { name: 'Aptos Display', size: 16, bold: true, color: { argb: COLORS.white } };
  cell.fill = solidFill(COLORS.navy);
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(row).height = 30;
}

function styleSection(sheet: Worksheet, row: number, startColumn: number, endColumn: number, title: string) {
  sheet.mergeCells(row, startColumn, row, endColumn);
  const cell = sheet.getCell(row, startColumn);
  cell.value = title;
  cell.font = { name: 'Aptos', size: 11, bold: true, color: { argb: COLORS.white } };
  cell.fill = solidFill(COLORS.blue);
  cell.alignment = { vertical: 'middle' };
  for (let column = startColumn; column <= endColumn; column += 1) sheet.getCell(row, column).border = border();
  sheet.getRow(row).height = 22;
}

function styleHeader(row: Row) {
  row.height = 24;
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = solidFill(COLORS.navy);
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = border();
  });
}

function styleDataRange(sheet: Worksheet, startRow: number, endRow: number, columnCount: number) {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.height = 21;
    for (let column = 1; column <= columnCount; column += 1) {
      const cell = row.getCell(column);
      const hasCustomFill = cell.fill?.type === 'pattern' && cell.fill.pattern === 'solid';
      if (!hasCustomFill) cell.font = { name: 'Aptos', size: 10, color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = border();
      if (rowNumber % 2 === 0 && !hasCustomFill) cell.fill = solidFill(COLORS.paleBlue);
    }
  }
}

function applySheetDefaults(sheet: Worksheet, orientation: 'landscape' | 'portrait' = 'landscape') {
  sheet.properties.defaultRowHeight = 19;
  sheet.pageSetup = {
    orientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.25, right: 0.25, top: 0.45, bottom: 0.45, header: 0.15, footer: 0.15 },
  };
  sheet.headerFooter.oddFooter = 'LHU IT LAB · Trang &P / &N';
}

export async function buildReportWorkbook({ summary, computers, equipment, usage }: ReportWorkbookPayload) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LHU IT LAB';
  workbook.created = new Date();
  workbook.modified = new Date();

  const totalComputers = summary?.total ?? computers.length;
  const computerStatuses = STATUS_ORDER.map((status) => ({ status, value: statusValue(summary, computers, status) }));
  const totalEquipment = equipment.reduce((sum, item) => sum + item.totalQuantity, 0);
  const availableEquipment = equipment.reduce((sum, item) => sum + item.availableQuantity, 0);
  const reservedEquipment = equipment.reduce((sum, item) => sum + item.reservedQuantity, 0);
  const borrowedEquipment = equipment.reduce((sum, item) => sum + item.borrowedQuantity, 0);
  const maintenanceEquipment = equipment.reduce((sum, item) => sum + item.maintenanceQuantity, 0);
  const brokenEquipment = equipment.reduce((sum, item) => sum + item.brokenQuantity, 0);
  const lostEquipment = equipment.reduce((sum, item) => sum + item.lostQuantity, 0);

  const overview = workbook.addWorksheet('Tổng quan', { properties: { tabColor: { argb: COLORS.blue } } });
  applySheetDefaults(overview);
  overview.columns = [{ width: 26 }, { width: 15 }, { width: 4 }, { width: 26 }, { width: 15 }, { width: 4 }, { width: 22 }, { width: 18 }];
  styleTitle(overview, 1, 'BÁO CÁO THỐNG KÊ PHÒNG IT-LAB', 8);
  overview.mergeCells('A2:H2');
  overview.getCell('A2').value = `Xuất lúc ${new Date().toLocaleString('vi-VN')} · Dữ liệu sử dụng thực tế tháng ${usage.month}`;
  overview.getCell('A2').font = { name: 'Aptos', size: 10, italic: true, color: { argb: COLORS.slate } };
  overview.getCell('A2').alignment = { horizontal: 'center' };

  styleSection(overview, 4, 1, 2, 'TÌNH TRẠNG MÁY TÍNH');
  styleSection(overview, 4, 4, 5, 'TÀI SẢN & VẬN HÀNH');
  const computerMetrics: Array<[string, number | string]> = [
    ['Tổng số máy tính', totalComputers],
    ['Đang sử dụng', statusValue(summary, computers, 'IN_USE')],
    ['Sẵn sàng', statusValue(summary, computers, 'ACTIVE')],
    ['Đang bảo trì', statusValue(summary, computers, 'MAINTENANCE')],
    ['Bị hỏng', statusValue(summary, computers, 'BROKEN')],
    ['Đã khóa', statusValue(summary, computers, 'LOCKED')],
    ['Không hoạt động', statusValue(summary, computers, 'INACTIVE')],
    ['Tỷ lệ sử dụng', totalComputers ? statusValue(summary, computers, 'IN_USE') / totalComputers : 0],
  ];
  const equipmentMetrics: Array<[string, number]> = [
    ['Tổng số thiết bị', totalEquipment],
    ['Thiết bị khả dụng', availableEquipment],
    ['Thiết bị đang mượn', borrowedEquipment],
    ['Thiết bị bảo trì', maintenanceEquipment],
    ['Thiết bị hỏng', brokenEquipment],
    ['Tổng giờ dùng phòng', usage.totalUsageHours],
    ['Tổng giờ-máy', usage.totalComputerHours],
    ['Lượt check-in', usage.totalCheckIns],
  ];
  computerMetrics.forEach(([label, value], index) => {
    const row = 5 + index;
    overview.getCell(row, 1).value = label;
    overview.getCell(row, 2).value = value;
    overview.getCell(row, 2).numFmt = index === computerMetrics.length - 1 ? '0.0%' : '#,##0';
    overview.getCell(row, 4).value = equipmentMetrics[index][0];
    overview.getCell(row, 5).value = equipmentMetrics[index][1];
    overview.getCell(row, 5).numFmt = '#,##0';
  });
  styleDataRange(overview, 5, 12, 5);
  for (let row = 5; row <= 12; row += 1) {
    overview.getCell(row, 1).font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.slate } };
    overview.getCell(row, 4).font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.slate } };
    overview.getCell(row, 2).alignment = { horizontal: 'right', vertical: 'middle' };
    overview.getCell(row, 5).alignment = { horizontal: 'right', vertical: 'middle' };
  }

  styleSection(overview, 15, 1, 3, 'PHÂN BỐ TRẠNG THÁI MÁY TÍNH');
  styleSection(overview, 15, 5, 7, 'TÌNH TRẠNG TỒN KHO THIẾT BỊ');
  overview.getRow(16).values = ['Trạng thái', 'Số lượng', 'Tỷ lệ', '', 'Tình trạng', 'Số lượng', 'Tỷ lệ'];
  for (const column of [1, 2, 3, 5, 6, 7]) {
    const cell = overview.getCell(16, column);
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = solidFill(COLORS.navy);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = border();
  }
  const inventoryMetrics: Array<[string, number, string]> = [
    ['Khả dụng', availableEquipment, COLORS.green],
    ['Đã giữ', reservedEquipment, 'FF8B5CF6'],
    ['Đang mượn', borrowedEquipment, 'FF14B8A6'],
    ['Bảo trì', maintenanceEquipment, COLORS.amber],
    ['Hỏng', brokenEquipment, COLORS.red],
    ['Mất', lostEquipment, 'FF64748B'],
  ];
  computerStatuses.forEach(({ status, value }, index) => {
    const row = 17 + index;
    const theme = COMPUTER_STATUS_THEME[status];
    overview.getCell(row, 1).value = theme.label;
    overview.getCell(row, 2).value = value;
    overview.getCell(row, 3).value = totalComputers ? value / totalComputers : 0;
    overview.getCell(row, 3).numFmt = '0.0%';
    overview.getCell(row, 1).fill = solidFill(`FF${theme.chart.slice(1)}`);
    overview.getCell(row, 1).font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.white } };
  });
  inventoryMetrics.forEach(([label, value, color], index) => {
    const row = 17 + index;
    overview.getCell(row, 5).value = label;
    overview.getCell(row, 6).value = value;
    overview.getCell(row, 7).value = totalEquipment ? value / totalEquipment : 0;
    overview.getCell(row, 7).numFmt = '0.0%';
    overview.getCell(row, 5).fill = solidFill(color);
    overview.getCell(row, 5).font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.white } };
  });
  styleDataRange(overview, 17, 22, 7);
  for (let row = 17; row <= 22; row += 1) {
    [2, 3, 6, 7].forEach((column) => { overview.getCell(row, column).alignment = { horizontal: 'right', vertical: 'middle' }; });
  }
  overview.mergeCells('A25:H25');
  overview.getCell('A25').value = 'Ghi chú: Nhật ký máy tính được lưu ngay khi trạng thái thay đổi. Phiên đang diễn ra chỉ tính thời lượng đến lúc xuất và không bị đóng giả.';
  overview.getCell('A25').font = { name: 'Aptos', size: 9, italic: true, color: { argb: COLORS.slate } };
  overview.getCell('A25').fill = solidFill(COLORS.lightBlue);
  overview.getCell('A25').alignment = { vertical: 'middle', wrapText: true };
  overview.getRow(25).height = 28;

  const equipmentSheet = workbook.addWorksheet('Thiết bị', { properties: { tabColor: { argb: 'FF14B8A6' } } });
  applySheetDefaults(equipmentSheet);
  equipmentSheet.columns = [{ width: 7 }, { width: 14 }, { width: 31 }, { width: 10 }, { width: 11 }, { width: 10 }, { width: 13 }, { width: 11 }, { width: 9 }, { width: 8 }, { width: 22 }, { width: 16 }, { width: 20 }];
  const equipmentHeaders = ['STT', 'Mã thiết bị', 'Tên thiết bị', 'Tổng số', 'Khả dụng', 'Đã giữ', 'Đang mượn', 'Bảo trì', 'Hỏng', 'Mất', 'Vị trí', 'Trạng thái', 'Cập nhật'];
  equipmentSheet.addRow(equipmentHeaders);
  styleHeader(equipmentSheet.getRow(1));
  [...equipment].sort((left, right) => left.code.localeCompare(right.code, 'vi')).forEach((item, index) => {
    const row = equipmentSheet.addRow([index + 1, item.code, item.name, item.totalQuantity, item.availableQuantity, item.reservedQuantity, item.borrowedQuantity, item.maintenanceQuantity, item.brokenQuantity, item.lostQuantity, item.location || '', statusLabel(item.status), formatDate(item.updatedAt)]);
    row.getCell(13).numFmt = 'dd/mm/yyyy hh:mm';
    row.getCell(12).fill = solidFill(item.status === 'ACTIVE' ? COLORS.green : item.status === 'LOCKED' ? 'FF8B5CF6' : 'FF64748B');
    row.getCell(12).font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.white } };
  });
  const equipmentLastRow = Math.max(2, equipmentSheet.rowCount);
  if (!equipment.length) equipmentSheet.getCell('A2').value = 'Chưa có dữ liệu thiết bị.';
  styleDataRange(equipmentSheet, 2, equipmentLastRow, equipmentHeaders.length);
  equipmentSheet.autoFilter = { from: 'A1', to: `M${equipmentLastRow}` };
  equipmentSheet.views = [{ state: 'frozen', ySplit: 1 }];
  for (let row = 2; row <= equipmentLastRow; row += 1) [1, 4, 5, 6, 7, 8, 9, 10, 12].forEach((column) => { equipmentSheet.getCell(row, column).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });

  const computersSheet = workbook.addWorksheet('Máy tính', { properties: { tabColor: { argb: COLORS.blue } } });
  applySheetDefaults(computersSheet);
  computersSheet.columns = [
    { width: 7 }, { width: 13 }, { width: 24 }, { width: 16 }, { width: 18 }, { width: 20 }, { width: 18 },
    { width: 24 }, { width: 17 }, { width: 12 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 13 },
    { width: 23 }, { width: 11 }, { width: 15 }, { width: 17 }, { width: 22 }, { width: 21 }, { width: 20 },
  ];
  styleTitle(computersSheet, 1, 'DANH MỤC & THỐNG KÊ MÁY TÍNH', 21);
  computersSheet.mergeCells('A2:U2');
  computersSheet.getCell('A2').value = `Tháng ${usage.month} · Trạng thái hiện tại kết hợp với nhật ký hoạt động thực tế của từng máy.`;
  computersSheet.getCell('A2').font = { name: 'Aptos', size: 10, italic: true, color: { argb: COLORS.slate } };
  computersSheet.getCell('A2').alignment = { horizontal: 'center' };
  const computerHeaders = [
    'STT', 'Mã máy', 'Tên máy', 'Vị trí', 'Trạng thái hiện tại', 'Bắt đầu trạng thái', 'Phiên hiện tại',
    'Người/đơn vị sử dụng', 'Thời lượng trạng thái', 'Số phiên trong tháng', 'Giờ sử dụng', 'Giờ sẵn sàng',
    'Giờ bảo trì', 'Giờ bị hỏng', 'CPU', 'RAM', 'Lưu trữ', 'Địa chỉ IP', 'Hệ điều hành', 'Bảo trì gần nhất', 'Cập nhật',
  ];
  computersSheet.getRow(4).values = computerHeaders;
  styleHeader(computersSheet.getRow(4));
  const computerSummaryMap = new Map(usage.computerSummaries.map((item) => [item.computerId, item]));
  const exportedAt = new Date();
  [...computers].sort((left, right) => left.code.localeCompare(right.code, 'vi')).forEach((item, index) => {
    const summaryItem = computerSummaryMap.get(item.id);
    const status = summaryItem?.currentActivityType || item.status;
    const statusStartedAt = formatDate(summaryItem?.currentActivityStartedAt);
    const currentDuration = statusStartedAt ? Math.max(0, (exportedAt.getTime() - statusStartedAt.getTime()) / 3_600_000) : null;
    const row = computersSheet.addRow([
      index + 1, item.code, item.name, item.position || '', COMPUTER_STATUS_THEME[status].label,
      statusStartedAt, summaryItem?.currentBookingCode || '', summaryItem?.currentRequesterName || '', currentDuration,
      summaryItem?.usageSessionCount ?? 0, summaryItem?.usageHours ?? 0, summaryItem?.readyHours ?? 0,
      summaryItem?.maintenanceHours ?? 0, summaryItem?.brokenHours ?? 0, item.cpu || '', item.ram || '',
      item.storage || '', item.ipAddress || '', item.operatingSystem || '', formatDate(item.lastMaintenanceDate), formatDate(item.updatedAt),
    ]);
    row.getCell(6).numFmt = 'dd/mm/yyyy hh:mm';
    row.getCell(9).numFmt = '0.00 "giờ"';
    [11, 12, 13, 14].forEach((column) => { row.getCell(column).numFmt = '0.00 "giờ"'; });
    row.getCell(20).numFmt = 'dd/mm/yyyy';
    row.getCell(21).numFmt = 'dd/mm/yyyy hh:mm';
    row.getCell(5).fill = solidFill(`FF${COMPUTER_STATUS_THEME[status].chart.slice(1)}`);
    row.getCell(5).font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.white } };
  });
  const computersLastRow = Math.max(5, computersSheet.rowCount);
  if (!computers.length) computersSheet.getCell('A5').value = 'Chưa có dữ liệu máy tính.';
  styleDataRange(computersSheet, 5, computersLastRow, computerHeaders.length);
  computersSheet.autoFilter = { from: 'A4', to: `U${computersLastRow}` };
  computersSheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 4 }];
  for (let row = 5; row <= computersLastRow; row += 1) [1, 2, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 16].forEach((column) => { computersSheet.getCell(row, column).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });

  const activitySheet = workbook.addWorksheet('Sử dụng phòng Lab', { properties: { tabColor: { argb: 'FF8B5CF6' } } });
  applySheetDefaults(activitySheet, 'portrait');
  activitySheet.columns = [{ width: 18 }, { width: 15 }, { width: 16 }, { width: 21 }, { width: 18 }];
  styleTitle(activitySheet, 1, 'THỐNG KÊ GIỜ SỬ DỤNG THỰC TẾ', 5);
  activitySheet.mergeCells('A2:E2');
  activitySheet.getCell('A2').value = `Tháng ${usage.month} · Chỉ tính khoảng thời gian thực tế từ check-in đến check-out.`;
  activitySheet.getCell('A2').font = { name: 'Aptos', size: 10, italic: true, color: { argb: COLORS.slate } };
  activitySheet.getCell('A2').alignment = { horizontal: 'center' };
  activitySheet.getRow(4).values = ['Ngày', 'Lượt check-in', 'Lượt check-out', 'Giờ sử dụng phòng', 'Giờ-máy'];
  styleHeader(activitySheet.getRow(4));
  usage.daily.forEach((item) => {
    const row = activitySheet.addRow([new Date(`${item.date}T00:00:00.000Z`), item.checkInCount, item.checkOutCount, item.usageHours, item.computerHours]);
    row.getCell(1).numFmt = 'dd/mm/yyyy';
    row.getCell(4).numFmt = '0.00 "giờ"';
    row.getCell(5).numFmt = '0.00 "giờ-máy"';
  });
  const activityLastRow = activitySheet.rowCount;
  styleDataRange(activitySheet, 5, activityLastRow, 5);
  activitySheet.addRow(['Tổng cộng', usage.totalCheckIns, usage.totalCheckOuts, usage.totalUsageHours, usage.totalComputerHours]);
  const totalRow = activitySheet.getRow(activitySheet.rowCount);
  totalRow.getCell(4).numFmt = '0.00 "giờ"';
  totalRow.getCell(5).numFmt = '0.00 "giờ-máy"';
  totalRow.eachCell((cell) => {
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.navy } };
    cell.fill = solidFill(COLORS.lightBlue);
    cell.border = border();
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  activitySheet.views = [{ state: 'frozen', ySplit: 4 }];

  const usageLogSheet = workbook.addWorksheet('Lịch sử check-in-out', { properties: { tabColor: { argb: COLORS.green } } });
  applySheetDefaults(usageLogSheet);
  usageLogSheet.columns = [{ width: 8 }, { width: 17 }, { width: 34 }, { width: 20 }, { width: 20 }, { width: 13 }, { width: 13 }, { width: 14 }, { width: 15 }, { width: 32 }, { width: 20 }, { width: 14 }];
  const usageLogHeaders = ['STT', 'Mã yêu cầu', 'Mục đích', 'Check-in', 'Check-out', 'Số người', 'Số máy', 'Giờ phòng', 'Giờ-máy', 'Danh sách máy', 'Nguồn giờ-máy', 'Trạng thái'];
  usageLogSheet.addRow(usageLogHeaders);
  styleHeader(usageLogSheet.getRow(1));
  usage.sessions.forEach((session, index) => {
    const row = usageLogSheet.addRow([
      index + 1,
      session.requestCode,
      session.purpose,
      new Date(session.checkInTime),
      session.checkOutTime ? new Date(session.checkOutTime) : 'Đang sử dụng',
      session.actualPeopleCount,
      session.actualComputerCount,
      session.usageHours,
      session.computerHours,
      session.computerCodes.join(', '),
      session.computerHoursSource === 'MACHINE_LOGS' ? 'Nhật ký từng máy' : 'Ước tính theo số lượng',
      session.isActive ? 'Đang sử dụng' : 'Đã check-out',
    ]);
    row.getCell(4).numFmt = 'dd/mm/yyyy hh:mm';
    if (session.checkOutTime) row.getCell(5).numFmt = 'dd/mm/yyyy hh:mm';
    row.getCell(8).numFmt = '0.00 "giờ"';
    row.getCell(9).numFmt = '0.00 "giờ-máy"';
    row.getCell(12).fill = solidFill(session.isActive ? COLORS.amber : COLORS.green);
    row.getCell(12).font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.white } };
  });
  const usageLogLastRow = Math.max(2, usageLogSheet.rowCount);
  if (!usage.sessions.length) usageLogSheet.getCell('A2').value = 'Tháng này chưa có phiên sử dụng đã check-in.';
  styleDataRange(usageLogSheet, 2, usageLogLastRow, usageLogHeaders.length);
  usageLogSheet.autoFilter = { from: 'A1', to: `L${usageLogLastRow}` };
  usageLogSheet.views = [{ state: 'frozen', ySplit: 1 }];

  const computerActivitySheet = workbook.addWorksheet('Nhật ký máy tính', { properties: { tabColor: { argb: COLORS.amber } } });
  applySheetDefaults(computerActivitySheet);
  computerActivitySheet.columns = [
    { width: 7 }, { width: 13 }, { width: 24 }, { width: 18 }, { width: 20 }, { width: 20 }, { width: 18 },
    { width: 19 }, { width: 20 }, { width: 32 }, { width: 25 }, { width: 23 }, { width: 16 }, { width: 34 },
  ];
  styleTitle(computerActivitySheet, 1, 'NHẬT KÝ HOẠT ĐỘNG MÁY TÍNH', 14);
  computerActivitySheet.mergeCells('A2:N2');
  computerActivitySheet.getCell('A2').value = `Tháng ${usage.month} · Mỗi dòng là một khoảng trạng thái liên tục; phiên đang mở không bị đóng giả tại thời điểm xuất.`;
  computerActivitySheet.getCell('A2').font = { name: 'Aptos', size: 10, italic: true, color: { argb: COLORS.slate } };
  computerActivitySheet.getCell('A2').alignment = { horizontal: 'center' };
  const computerActivityHeaders = [
    'STT', 'Mã máy', 'Tên máy', 'Hoạt động', 'Bắt đầu', 'Kết thúc', 'Thời lượng trong tháng',
    'Mã tham chiếu', 'Loại tham chiếu', 'Mục đích/Công việc', 'Người/đơn vị sử dụng',
    'Người ghi nhận', 'Tình trạng phiên', 'Ghi chú',
  ];
  computerActivitySheet.getRow(4).values = computerActivityHeaders;
  styleHeader(computerActivitySheet.getRow(4));
  usage.computerActivities.forEach((activity, index) => {
    const referenceCode = activity.bookingRequestCode || activity.maintenanceCode || '';
    const referenceType = activity.bookingRequestCode ? 'Đăng ký sử dụng' : activity.maintenanceCode ? 'Bảo trì' : 'Thay đổi trạng thái';
    const row = computerActivitySheet.addRow([
      index + 1,
      activity.computerCode,
      activity.computerName,
      COMPUTER_STATUS_THEME[activity.activityType].label,
      new Date(activity.startedAt),
      activity.endedAt ? new Date(activity.endedAt) : 'Đang diễn ra',
      activity.durationHours,
      referenceCode,
      referenceType,
      activity.bookingPurpose || activity.note || '',
      activity.requesterName || '',
      activity.performedByName || '',
      activity.isActive ? 'Đang diễn ra' : 'Đã kết thúc',
      activity.note || '',
    ]);
    row.getCell(5).numFmt = 'dd/mm/yyyy hh:mm';
    if (activity.endedAt) row.getCell(6).numFmt = 'dd/mm/yyyy hh:mm';
    row.getCell(7).numFmt = '0.00 "giờ"';
    row.getCell(4).fill = solidFill(`FF${COMPUTER_STATUS_THEME[activity.activityType].chart.slice(1)}`);
    row.getCell(4).font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.white } };
    row.getCell(13).fill = solidFill(activity.isActive ? COLORS.amber : COLORS.green);
    row.getCell(13).font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.white } };
  });
  const computerActivityLastRow = Math.max(5, computerActivitySheet.rowCount);
  if (!usage.computerActivities.length) computerActivitySheet.getCell('A5').value = 'Tháng này chưa có nhật ký hoạt động máy tính.';
  styleDataRange(computerActivitySheet, 5, computerActivityLastRow, computerActivityHeaders.length);
  computerActivitySheet.autoFilter = { from: 'A4', to: `N${computerActivityLastRow}` };
  computerActivitySheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 4 }];
  for (let row = 5; row <= computerActivityLastRow; row += 1) [1, 2, 4, 5, 6, 7, 8, 9, 13].forEach((column) => { computerActivitySheet.getCell(row, column).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });

  return workbook;
}

export async function downloadReportWorkbook(payload: ReportWorkbookPayload) {
  const workbook = await buildReportWorkbook(payload);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `bao-cao-thong-ke-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
