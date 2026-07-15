import ComputersPage from '@/features/computers/ComputersPage';
import { PermissionGate } from '@/components/auth/permission-gate';
export default function Page(){return <PermissionGate permission="COMPUTER_VIEW"><ComputersPage/></PermissionGate>}
