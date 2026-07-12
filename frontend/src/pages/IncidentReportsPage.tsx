import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';

const IncidentReportsPage: React.FC = () => {
  return (
    <div>
      <PageHeader title="Báo cáo sự cố" description="Ghi nhận và phân công xử lý các lỗi thiết bị kỹ thuật" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Quản lý sự cố sẽ được triển khai ở Giai đoạn sau.</p>
      </div>
    </div>
  );
};

export default IncidentReportsPage;
