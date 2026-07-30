import { PermissionGate } from '@/components/auth/permission-gate';
import ExpensesPage from '@/features/expenses/ExpensesPage';

export default function Page() {
  return <PermissionGate permission="EXPENSE_VIEW"><ExpensesPage /></PermissionGate>;
}
