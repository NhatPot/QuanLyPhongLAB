import type { Row, Worksheet } from 'exceljs';
import type { CalendarEvent } from '@/services/booking-api';
import type { ComputerData, ComputerSummary, ComputerStatus } from '@/services/computer-api';
import type { EquipmentData } from '@/services/equipment-api';
import { COMPUTER_STATUS_THEME } from '@/features/computers/computer-status-theme';

type ReportWorkbookPayload = {
  summary?: ComputerSummary;
  computers: ComputerData[];
  equipment: EquipmentData[];
  events: CalendarEvent[];
  rangeStart: Date;
  rangeDays: number;
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
  sheet.headerFooter.oddFooter = 'IT-LAB Manager · Trang &P / &N';
}

function activityRows(events: CalendarEvent[], rangeStart: Date, rangeDays: number) {
  return Array.from({ length: rangeDays }, (_, index) => {
    const date = new Date(rangeStart);
    date.setDate(rangeStart.getDate() + index);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const approved = events.filter((event) => ['APPROVED', 'CHECKED_IN', 'COMPLETED'].includes(event.status));
    const hours = approved.reduce((sum, event) => {
      const overlapStart = Math.max(dayStart.getTime(), new Date(event.start).getTime());
      const overlapEnd = Math.min(dayEnd.getTime(), new Date(event.end).getTime());
      return sum + (overlapEnd > overlapStart ? (overlapEnd - overlapStart) / 3_600_000 : 0);
    }, 0);
    const bookingCount = approved.filter((event) => new Date(event.start).getTime() < dayEnd.getTime() && new Date(event.end).getTime() > dayStart.getTime()).length;
    return { date: dayStart, hours: Number(hours.toFixed(1)), bookingCount };
  });
}

export async function downloadReportWorkbook({ summary, computers, equipment, events, rangeStart, rangeDays }: ReportWorkbookPayload) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IT-LAB Manager';
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
  overview.getCell('A2').value = `Xuất lúc ${new Date().toLocaleString('vi-VN')} · Dữ liệu sử dụng từ ${rangeDays} ngày gần nhất`;
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
    ['Thiết bị đã giữ', reservedEquipment],
    ['Thiết bị đang mượn', borrowedEquipment],
    ['Thiết bị bảo trì', maintenanceEquipment],
    ['Thiết bị hỏng', brokenEquipment],
    ['Thiết bị mất', lostEquipment],
    ['Nhóm tài sản', equipment.length],
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
  overview.getCell('A25').value = 'Ghi chú: Báo cáo được tổng hợp tại thời điểm xuất. Màu trạng thái đồng nhất với màn hình quản lý máy tính.';
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
  computersSheet.columns = [{ width: 7 }, { width: 13 }, { width: 24 }, { width: 18 }, { width: 16 }, { width: 23 }, { width: 11 }, { width: 15 }, { width: 17 }, { width: 22 }, { width: 21 }, { width: 20 }];
  const computerHeaders = ['STT', 'Mã máy', 'Tên máy', 'Trạng thái', 'Vị trí', 'CPU', 'RAM', 'Lưu trữ', 'Địa chỉ IP', 'Hệ điều hành', 'Bảo trì gần nhất', 'Cập nhật'];
  computersSheet.addRow(computerHeaders);
  styleHeader(computersSheet.getRow(1));
  [...computers].sort((left, right) => left.code.localeCompare(right.code, 'vi')).forEach((item, index) => {
    const row = computersSheet.addRow([index + 1, item.code, item.name, COMPUTER_STATUS_THEME[item.status].label, item.position || '', item.cpu || '', item.ram || '', item.storage || '', item.ipAddress || '', item.operatingSystem || '', formatDate(item.lastMaintenanceDate), formatDate(item.updatedAt)]);
    row.getCell(11).numFmt = 'dd/mm/yyyy';
    row.getCell(12).numFmt = 'dd/mm/yyyy hh:mm';
    row.getCell(4).fill = solidFill(`FF${COMPUTER_STATUS_THEME[item.status].chart.slice(1)}`);
    row.getCell(4).font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.white } };
  });
  const computersLastRow = Math.max(2, computersSheet.rowCount);
  if (!computers.length) computersSheet.getCell('A2').value = 'Chưa có dữ liệu máy tính.';
  styleDataRange(computersSheet, 2, computersLastRow, computerHeaders.length);
  computersSheet.autoFilter = { from: 'A1', to: `L${computersLastRow}` };
  computersSheet.views = [{ state: 'frozen', ySplit: 1 }];
  for (let row = 2; row <= computersLastRow; row += 1) [1, 2, 4, 5, 7].forEach((column) => { computersSheet.getCell(row, column).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });

  const activitySheet = workbook.addWorksheet('Sử dụng phòng Lab', { properties: { tabColor: { argb: 'FF8B5CF6' } } });
  applySheetDefaults(activitySheet, 'portrait');
  activitySheet.columns = [{ width: 18 }, { width: 20 }, { width: 22 }];
  styleTitle(activitySheet, 1, 'THỐNG KÊ GIỜ SỬ DỤNG PHÒNG LAB', 3);
  activitySheet.mergeCells('A2:C2');
  activitySheet.getCell('A2').value = `Khoảng dữ liệu: ${rangeDays} ngày, từ ${rangeStart.toLocaleDateString('vi-VN')} đến ${new Date(rangeStart.getTime() + (rangeDays - 1) * 86_400_000).toLocaleDateString('vi-VN')}`;
  activitySheet.getCell('A2').font = { name: 'Aptos', size: 10, italic: true, color: { argb: COLORS.slate } };
  activitySheet.getCell('A2').alignment = { horizontal: 'center' };
  activitySheet.getRow(4).values = ['Ngày', 'Số lịch đã duyệt', 'Tổng giờ sử dụng'];
  styleHeader(activitySheet.getRow(4));
  const rows = activityRows(events, rangeStart, rangeDays);
  rows.forEach((item) => {
    const row = activitySheet.addRow([item.date, item.bookingCount, item.hours]);
    row.getCell(1).numFmt = 'dd/mm/yyyy';
    row.getCell(3).numFmt = '0.0 "giờ"';
  });
  const activityLastRow = activitySheet.rowCount;
  styleDataRange(activitySheet, 5, activityLastRow, 3);
  activitySheet.addRow(['Tổng cộng', rows.reduce((sum, item) => sum + item.bookingCount, 0), rows.reduce((sum, item) => sum + item.hours, 0)]);
  const totalRow = activitySheet.getRow(activitySheet.rowCount);
  totalRow.getCell(3).numFmt = '0.0 "giờ"';
  totalRow.eachCell((cell) => {
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: COLORS.navy } };
    cell.fill = solidFill(COLORS.lightBlue);
    cell.border = border();
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  activitySheet.views = [{ state: 'frozen', ySplit: 4 }];

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
