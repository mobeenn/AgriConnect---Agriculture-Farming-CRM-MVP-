import './globals.css';
import { Fraunces, Public_Sans } from 'next/font/google';
import { ToastProvider } from '@/components/Toast.jsx';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Public_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = {
  title: 'AgriConnect - Agriculture B2B marketplace & CRM',
  description: 'Anonymous B2B trading between agricultural buyers and suppliers.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
