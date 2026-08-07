import { redirect } from 'next/navigation';

export default function SwaggerRedirect() {
  redirect('/docs');
}
