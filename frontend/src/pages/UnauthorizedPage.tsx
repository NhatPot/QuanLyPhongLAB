import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">403</h1>
        <h2 className="text-xl font-semibold text-slate-800">Truy cập bị từ chối</h2>
        <p className="max-w-md text-slate-500">
          Tài khoản của bạn không có đủ quyền hạn để xem trang này. Vui lòng liên hệ với Quản trị viên để biết thêm chi tiết.
        </p>
        <div className="pt-4">
          <button
            onClick={() => navigate('/')}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            Quay về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
