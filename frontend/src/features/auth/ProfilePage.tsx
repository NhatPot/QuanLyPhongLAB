'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AtSign, Building2, Camera, Mail, Phone, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/PageHeader';

const MAX_SOURCE_FILE_SIZE = 5 * 1024 * 1024;
const MAX_AVATAR_DATA_URL_LENGTH = 700_000;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự.').max(255),
  email: z.string().trim().email('Email không đúng định dạng.').max(255),
  phone: z.string().trim().max(50, 'Số điện thoại quá dài.').refine(
    (value) => !value || /^[0-9+().\s-]+$/.test(value),
    'Số điện thoại chứa ký tự không hợp lệ.',
  ),
  department: z.string().trim().max(255, 'Tên đơn vị quá dài.'),
});

type ProfileFields = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null);
  const [avatarProcessing, setAvatarProcessing] = useState(false);
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFields>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      department: user?.department || '',
    },
  });

  useEffect(() => {
    if (!user) return;
    reset({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      department: user.department || '',
    });
    setAvatarUrl(user.avatarUrl || null);
  }, [reset, user]);

  const initials = useMemo(() => (user?.fullName || 'ND')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase(), [user?.fullName]);

  const avatarChanged = avatarUrl !== (user?.avatarUrl || null);

  const handleAvatarFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setServerError('');
    setAvatarProcessing(true);
    try {
      const nextAvatar = await prepareAvatar(file);
      setAvatarUrl(nextAvatar);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể xử lý ảnh đại diện.';
      toast.error(message);
    } finally {
      setAvatarProcessing(false);
    }
  };

  const submit = async (values: ProfileFields) => {
    setServerError('');
    try {
      const profile = await updateProfile({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone || undefined,
        department: values.department || undefined,
        avatarUrl,
      });
      reset({
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone || '',
        department: profile.department || '',
      });
      setAvatarUrl(profile.avatarUrl || null);
      toast.success('Đã cập nhật hồ sơ cá nhân.');
    } catch (error: any) {
      setServerError(error.response?.data?.error?.message || 'Không thể cập nhật hồ sơ. Vui lòng thử lại.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Tài khoản"
        title="Hồ sơ cá nhân"
        description="Cập nhật ảnh đại diện và thông tin liên hệ hiển thị trong hệ thống."
      />

      <form onSubmit={handleSubmit(submit)} className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Ảnh đại diện</CardTitle>
            <p className="text-xs text-slate-500">JPEG, PNG hoặc WebP; dung lượng gốc tối đa 5 MB.</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-6 text-center">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-white shadow-xl ring-1 ring-slate-200">
                <AvatarImage src={avatarUrl || undefined} alt={user?.fullName || 'Ảnh đại diện'} />
                <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Chọn ảnh đại diện"
                className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-lg transition hover:bg-blue-700"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 font-bold text-slate-900">{user?.fullName}</p>
            <p className="mt-1 text-xs text-slate-500">@{user?.username}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {user?.roles.map((role) => (
                <span key={role} className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">{role}</span>
              ))}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFile}
              className="hidden"
            />
            <div className="mt-6 grid w-full grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={avatarProcessing}>
                <Camera />{avatarProcessing ? 'Đang xử lý...' : 'Chọn ảnh'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setAvatarUrl(null)} disabled={!avatarUrl || avatarProcessing}>
                <Trash2 />Xóa ảnh
              </Button>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-slate-400">Ảnh được cắt vuông và thu nhỏ trước khi gửi để tải nhanh hơn.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <CardTitle>Thông tin tài khoản</CardTitle>
                <p className="mt-1 text-xs text-slate-500">Tên đăng nhập và vai trò do quản trị viên quản lý.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {serverError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Họ và tên" error={errors.fullName?.message} icon={<AtSign />}>
                <Input {...register('fullName')} className="h-11 pl-10" placeholder="Nhập họ và tên" />
              </Field>
              <Field label="Tên đăng nhập" hint="Không thể tự thay đổi" icon={<AtSign />}>
                <Input value={user?.username || ''} readOnly className="h-11 bg-slate-50 pl-10 text-slate-500" />
              </Field>
              <Field label="Email" error={errors.email?.message} icon={<Mail />}>
                <Input {...register('email')} type="email" className="h-11 pl-10" placeholder="name@lhu.edu.vn" />
              </Field>
              <Field label="Số điện thoại" error={errors.phone?.message} icon={<Phone />}>
                <Input {...register('phone')} className="h-11 pl-10" placeholder="Nhập số điện thoại" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Khoa / đơn vị" error={errors.department?.message} icon={<Building2 />}>
                  <Input {...register('department')} className="h-11 pl-10" placeholder="Ví dụ: Khoa Công nghệ Thông tin" />
                </Field>
              </div>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">Thay đổi được lưu vào hồ sơ tài khoản hiện tại.</p>
              <Button type="submit" disabled={isSubmitting || avatarProcessing || (!isDirty && !avatarChanged)}>
                <Save />{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
        {label}{hint && <small className="font-normal text-slate-400">{hint}</small>}
      </span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {children}
      </span>
      {error && <span className="mt-1.5 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

async function prepareAvatar(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.');
  }
  if (file.size > MAX_SOURCE_FILE_SIZE) {
    throw new Error('Ảnh gốc không được vượt quá 5 MB.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = (image.naturalWidth - sourceSize) / 2;
    const sourceY = (image.naturalHeight - sourceSize) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không thể xử lý ảnh này.');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/jpeg', 0.86);
    if (result.length > MAX_AVATAR_DATA_URL_LENGTH) {
      throw new Error('Ảnh sau khi xử lý vẫn quá lớn. Vui lòng chọn ảnh khác.');
    }
    return result;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không thể đọc tệp ảnh đã chọn.'));
    image.src = src;
  });
}
