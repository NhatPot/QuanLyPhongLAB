import { Wrench } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ModuleEmptyState } from '@/components/ui/module-empty-state';
import { PermissionGate } from '@/components/auth/permission-gate';
export default function Page(){return <PermissionGate permission="EQUIPMENT_UPDATE"><PageHeader eyebrow="Vận hành" title="Bảo trì tài sản" description="Lập kế hoạch và theo dõi tiến độ bảo trì máy tính, thiết bị."/><ModuleEmptyState icon={Wrench} title="Module bảo trì chưa có nghiệp vụ backend" description="Các trạng thái BROKEN và MAINTENANCE đã được hiển thị ở trang Máy tính và Thiết bị. Lịch bảo trì riêng sẽ kết nối sau khi backend hoàn thiện." features={['Lịch bảo trì định kỳ','Phân công người xử lý','Chi phí và linh kiện thay thế','Lịch sử bảo trì tài sản']}/></PermissionGate>}
