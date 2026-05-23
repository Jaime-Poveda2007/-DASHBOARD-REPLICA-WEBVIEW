'use client';

import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export default function RootLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
    };
    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  const navLinks = [
    { href: '/feed', label: 'Inicio', icon: '🏠' },
    { href: '/user', label: 'Perfil', icon: '👤' },
    ...(user?.email === 'kevingabrielgonzalez1234@gmail.com' ? [{ href: '/admin', label: 'Admin', icon: '🛡️' }] : []),
  ];

  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} style={{ margin: 0, background: '#000' }}>
        {user && (
          <nav style={{ background: '#000', borderBottom: '1px solid #2f3336', padding: '12px 16px', display: 'flex', gap: 24, justifyContent: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: pathname === link.href ? '#1d9bf0' : '#71767b',
                  textDecoration: 'none',
                  fontWeight: pathname === link.href ? 700 : 400,
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {link.icon} {link.label}
              </Link>
            ))}
          </nav>
        )}
        <main>{children}</main>
      </body>
    </html>
  );
}