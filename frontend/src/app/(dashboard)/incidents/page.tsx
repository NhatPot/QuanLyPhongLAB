import IncidentsPage from '@/features/incidents/IncidentsPage';
import { PermissionGate } from '@/components/auth/permission-gate';
export default function Page(){return <PermissionGate anyOf={['INCIDENT_VIEW','INCIDENT_VIEW_OWN','INCIDENT_VIEW_ASSIGNED']}><IncidentsPage/></PermissionGate>}
