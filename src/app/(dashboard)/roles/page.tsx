import { PermissionGate } from '@/components/auth/permission-gate';
import RolesPage from '@/features/access/RolesPage';

export default function Page() {
  return (
    <PermissionGate permission="PERMISSION_MANAGE">
      <RolesPage />
    </PermissionGate>
  );
}
