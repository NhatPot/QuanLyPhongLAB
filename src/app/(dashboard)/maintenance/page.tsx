import { PermissionGate } from '@/components/auth/permission-gate';
import MaintenancePage from '@/features/maintenance/MaintenancePage';
export default function Page(){return <PermissionGate permission="MAINTENANCE_VIEW"><MaintenancePage/></PermissionGate>}
