import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <HelpCircle className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">404</h1>
        <h2 className="text-xl font-semibold text-slate-800">Không tìm thấy trang</h2>
        <p className="max-w-md text-slate-500">
          Đường dẫn bạn yêu cầu không tồn tại hoặc đã bị di chuyển. Vui lòng kiểm tra lại.
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

export default NotFoundPage;
