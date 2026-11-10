import { redirect } from 'next/navigation';
import { currentActor } from '@/lib/guard.js';
import LoginForm from '@/components/LoginForm.jsx';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const actor = currentActor();
  if (actor) redirect(`/${actor.role}/dashboard`);
  return <LoginForm />;
}
