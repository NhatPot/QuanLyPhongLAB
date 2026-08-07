import { PermissionGate } from '@/components/auth/permission-gate';
import UsersPage from '@/features/access/UsersPage';

export default function Page() {
  return (
    <PermissionGate permission="USER_VIEW">
      <UsersPage />
    </PermissionGate>
  );
}
