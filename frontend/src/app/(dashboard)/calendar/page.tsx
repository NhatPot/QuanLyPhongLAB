import LabCalendar from '@/features/bookings/LabCalendar';
import { PermissionGate } from '@/components/auth/permission-gate';
export default function Page(){return <PermissionGate permission="LAB_CALENDAR_VIEW"><LabCalendar/></PermissionGate>}
