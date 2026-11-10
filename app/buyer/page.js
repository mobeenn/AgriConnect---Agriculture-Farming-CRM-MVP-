import { redirect } from 'next/navigation';

export default function Index() {
  redirect('/buyer/dashboard');
}
