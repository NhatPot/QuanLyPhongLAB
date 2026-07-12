import { createBrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import ChangePasswordPage from '../pages/ChangePasswordPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import NotFoundPage from '../pages/NotFoundPage';
import DashboardPage from '../pages/DashboardPage';
import LabCalendarPage from '../pages/LabCalendarPage';
import BookingRequestsPage from '../pages/BookingRequestsPage';
import ComputersPage from '../pages/ComputersPage';
import EquipmentsPage from '../pages/EquipmentsPage';
import IncidentReportsPage from '../pages/IncidentReportsPage';
import UsersPage from '../pages/UsersPage';
import LabConfigPage from '../pages/LabConfigPage';
import AuditLogPage from '../pages/AuditLogPage';
import ReportsPage from '../pages/ReportsPage';
import { ProtectedRoute } from './ProtectedRoute';
import { PermissionRoute } from './PermissionRoute';
import { AppLayout } from '../layouts/AppLayout';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />
  },
  {
    path: '/change-password',
    element: (
      <ProtectedRoute>
        <ChangePasswordPage />
      </ProtectedRoute>
    )
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '',
        element: <DashboardPage />
      },
      {
        path: 'calendar',
        element: (
          <PermissionRoute requiredPermission="LAB_CALENDAR_VIEW">
            <LabCalendarPage />
          </PermissionRoute>
        )
      },
      {
        path: 'bookings',
        element: (
          <PermissionRoute requiredPermission="BOOKING_VIEW_OWN">
            <BookingRequestsPage />
          </PermissionRoute>
        )
      },
      {
        path: 'computers',
        element: (
          <PermissionRoute requiredPermission="COMPUTER_VIEW">
            <ComputersPage />
          </PermissionRoute>
        )
      },
      {
        path: 'equipments',
        element: (
          <PermissionRoute requiredPermission="EQUIPMENT_VIEW">
            <EquipmentsPage />
          </PermissionRoute>
        )
      },
      {
        path: 'incidents',
        element: (
          <PermissionRoute requiredPermission="INCIDENT_CREATE">
            <IncidentReportsPage />
          </PermissionRoute>
        )
      },
      {
        path: 'users',
        element: (
          <PermissionRoute requiredPermission="USER_VIEW">
            <UsersPage />
          </PermissionRoute>
        )
      },
      {
        path: 'config',
        element: (
          <PermissionRoute requiredPermission="LAB_PROFILE_VIEW">
            <LabConfigPage />
          </PermissionRoute>
        )
      },
      {
        path: 'audit-log',
        element: (
          <PermissionRoute requiredPermission="AUDIT_LOG_VIEW">
            <AuditLogPage />
          </PermissionRoute>
        )
      },
      {
        path: 'reports',
        element: (
          <PermissionRoute requiredPermission="REPORT_VIEW">
            <ReportsPage />
          </PermissionRoute>
        )
      }
    ]
  },
  {
    path: '*',
    element: <NotFoundPage />
  }
]);
