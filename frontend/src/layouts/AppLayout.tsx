import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '../components/navigation/AppSidebar';
import { AppHeader } from '../components/navigation/AppHeader';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <AppSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
