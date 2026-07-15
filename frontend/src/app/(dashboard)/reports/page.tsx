import ReportsPage from '@/features/reports/ReportsPage';
import { PermissionGate } from '@/components/auth/permission-gate';
export default function Page(){return <PermissionGate permission="REPORT_VIEW"><ReportsPage/></PermissionGate>}
