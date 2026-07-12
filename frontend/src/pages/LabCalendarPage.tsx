import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';

const LabCalendarPage: React.FC = () => {
  return (
    <div>
      <PageHeader title="Lịch sử dụng phòng Lab" description="Xem và tra cứu lịch đăng ký theo ngày/tuần/tháng" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Lịch phòng Lab (FullCalendar) sẽ được tích hợp ở Giai đoạn sau.</p>
      </div>
    </div>
  );
};

export default LabCalendarPage;
