'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Download, ShieldCheck } from 'lucide-react';
import { PermissionGate } from '@/components/auth/permission-gate';
import { apiClient } from '@/services/api-client';

export default function SwaggerDocsPage() {
  return (
    <PermissionGate permission="PERMISSION_MANAGE">
      <SwaggerDocsContent />
    </PermissionGate>
  );
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const authHeader = (apiClient.defaults.headers.common.Authorization as string) || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.substring(7);

  const localToken =
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('accessToken') ||
    sessionStorage.getItem('token');
  if (localToken) return localToken;

  const cookieStr = `; ${document.cookie}`;
  for (const name of ['accessToken', 'token', 'auth_token']) {
    const parts = cookieStr.split(`; ${name}=`);
    if (parts.length === 2) {
      const val = parts.pop()?.split(';').shift()?.trim();
      if (val) return val;
    }
  }
  return null;
}

function SwaggerDocsContent() {
  useEffect(() => {
    // Load Swagger UI CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui.css';
    document.head.appendChild(link);

    // Load Swagger UI Bundle JS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-bundle.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).SwaggerUIBundle) {
        (window as any).SwaggerUIBundle({
          url: '/api/swagger.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            (window as any).SwaggerUIBundle.presets.apis,
            (window as any).SwaggerUIBundle.SwaggerUIStandalonePreset,
          ],
          layout: 'BaseLayout',
          persistAuthorization: true,
          displayRequestDuration: true,
          filter: true,
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 1,
          requestInterceptor: (req: any) => {
            const token = getAuthToken();
            if (token) {
              req.headers.Authorization = `Bearer ${token}`;
            }
            return req;
          },
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 px-6 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight">
                Quản Lý Phòng LAB <span className="text-blue-400">· API Swagger Docs</span>
              </h1>
              <p className="text-[11px] text-slate-400">
                OpenAPI 3.0 Specification &amp; Interactive Testing Suite (Chỉ dành cho Admin)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/api/swagger.json"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 text-xs font-bold text-slate-200 transition hover:bg-slate-700 hover:text-white"
            >
              <Download className="h-3.5 w-3.5 text-blue-400" />
              Tải OpenAPI JSON
            </a>
            <Link
              href="/"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-md transition hover:bg-blue-500"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Về Trang Quản Lý
            </Link>
          </div>
        </div>
      </header>

      {/* Intro Banner */}
      <div className="bg-slate-950/40 border-b border-slate-800/60 py-4 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              Khu vực quản trị API hệ thống. Hỗ trợ kiểm thử trực tiếp bằng nút <strong>Authorize</strong> (Tự động đính kèm token phiên Admin hiện tại).
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>Phiên bản API: <strong>v1.0.0</strong></span>
            <span>Môi trường: <strong>Next.js Local Server (/api)</strong></span>
          </div>
        </div>
      </div>

      {/* Main Swagger UI Container */}
      <main className="flex-1 bg-white p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div id="swagger-ui" className="swagger-ui-custom" />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500">
        Hệ Thống Quản Lý Phòng LAB &copy; 2026 · Swagger UI Interactive Documentation
      </footer>
    </div>
  );
}
