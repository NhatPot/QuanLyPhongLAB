import ExcelJS from 'exceljs';
import type { ExpenseRecord } from '@/services/expense-api';

export async function exportExpenses(rows: ExpenseRecord[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LHU IT Lab Manager';
  const sheet = workbook.addWorksheet('Chi phí phòng Lab');
  sheet.columns = [
    { header: 'Mã phiếu', key: 'code', width: 20 },
    { header: 'Ngày chi', key: 'date', width: 14 },
    { header: 'Nội dung', key: 'title', width: 35 },
    { header: 'Phân loại', key: 'class', width: 12 },
    { header: 'Danh mục', key: 'category', width: 24 },
    { header: 'Nhà cung cấp', key: 'vendor', width: 24 },
    { header: 'Nguồn kinh phí', key: 'funding', width: 18 },
    { header: 'Trạng thái', key: 'status', width: 18 },
    { header: 'Tổng tiền', key: 'total', width: 18 },
  ];
  rows.forEach((item) => sheet.addRow({
    code: item.code,
    date: new Date(item.expenseDate),
    title: item.title,
    class: item.expenseClass,
    category: item.categoryName,
    vendor: item.vendorName || '',
    funding: item.fundingSource,
    status: item.status,
    total: item.totalAmount,
  }));
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.alignment = { vertical: 'middle' };
  });
  sheet.getColumn('date').numFmt = 'dd/mm/yyyy';
  sheet.getColumn('total').numFmt = '#,##0 [$₫-vi-VN]';
  sheet.autoFilter = { from: 'A1', to: 'I1' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `chi-phi-phong-lab-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(href);
}
