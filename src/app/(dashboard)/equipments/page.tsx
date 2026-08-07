import EquipmentsPage from '@/features/equipments/EquipmentsPage';
import { PermissionGate } from '@/components/auth/permission-gate';
export default function Page(){return <PermissionGate permission="EQUIPMENT_VIEW"><EquipmentsPage/></PermissionGate>}
