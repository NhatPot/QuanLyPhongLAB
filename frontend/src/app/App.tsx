import { Server } from 'lucide-react'


function App() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white px-4">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center text-blue-400 mb-6">
          <Server className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">IT-LAB MANAGER</h1>
        <p className="text-slate-400 text-sm mb-6">
          Hệ thống quản lý một phòng Lab CNTT duy nhất. Giai đoạn 1 đã khởi chạy thành công.
        </p>
        <div className="inline-flex items-center gap-2 px-3 h-8 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full border border-green-500/20">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Frontend Bootstrap Ok
        </div>
      </div>
    </div>
  )
}

export default App
