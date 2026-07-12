import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';

const ReportsPage: React.FC = () => {
  return (
    <div>
      <PageHeader title="Báo cáo thống kê" description="Xem và xuất báo cáo dữ liệu định kỳ" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Phần báo cáo & thống kê sẽ được hoàn thiện ở Giai đoạn sau.</p>
      </div>
    </div>
  );
};

export default ReportsPage;
