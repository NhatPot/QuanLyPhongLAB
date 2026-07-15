import IncidentsPage from '@/features/incidents/IncidentsPage';
import { PermissionGate } from '@/components/auth/permission-gate';
export default function Page(){return <PermissionGate permission="INCIDENT_CREATE"><IncidentsPage/></PermissionGate>}
