import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';

const AuditLogPage: React.FC = () => {
  return (
    <div>
      <PageHeader title="Nhật ký hệ thống (Audit Log)" description="Ghi nhận lịch sử hoạt động và thay đổi trạng thái" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Dữ liệu Audit Log sẽ được cập nhật ở Giai đoạn sau.</p>
      </div>
    </div>
  );
};

export default AuditLogPage;
