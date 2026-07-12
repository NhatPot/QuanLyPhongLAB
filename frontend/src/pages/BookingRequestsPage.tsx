import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';

const BookingRequestsPage: React.FC = () => {
  return (
    <div>
      <PageHeader title="Yêu cầu đăng ký" description="Quản lý và phê duyệt danh sách yêu cầu đặt chỗ" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Quản lý booking sẽ được xây dựng ở Giai đoạn sau.</p>
      </div>
    </div>
  );
};

export default BookingRequestsPage;
