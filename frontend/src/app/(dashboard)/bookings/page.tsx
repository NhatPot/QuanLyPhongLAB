import BookingsPage from '@/features/bookings/BookingsPage';
import { PermissionGate } from '@/components/auth/permission-gate';
export default function Page(){return <PermissionGate permission="BOOKING_VIEW_OWN"><BookingsPage/></PermissionGate>}
