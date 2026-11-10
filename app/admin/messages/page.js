import { Suspense } from 'react';
import MessagesPage from '@/components/pages/MessagesPage.jsx';

export default function Page() {
  return <Suspense fallback={null}><MessagesPage role="admin" /></Suspense>;
}
