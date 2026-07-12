import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';

const UsersPage: React.FC = () => {
  return (
    <div>
      <PageHeader title="Danh sách người dùng" description="Quản lý tài khoản và phân quyền vai trò người dùng" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Quản lý người dùng sẽ được cập nhật ở Giai đoạn sau.</p>
      </div>
    </div>
  );
};

export default UsersPage;
