import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';

const DashboardPage: React.FC = () => {
  return (
    <div>
      <PageHeader title="Tổng quan hệ thống" description="Báo cáo số liệu hoạt động phòng Lab" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Nội dung Dashboard sẽ được cập nhật ở Giai đoạn sau.</p>
      </div>
    </div>
  );
};

export default DashboardPage;
