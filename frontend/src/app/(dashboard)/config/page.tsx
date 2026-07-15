import LabConfigPage from '@/features/lab/LabConfigPage';
import { PermissionGate } from '@/components/auth/permission-gate';
export default function Page(){return <PermissionGate permission="LAB_PROFILE_VIEW"><LabConfigPage/></PermissionGate>}
