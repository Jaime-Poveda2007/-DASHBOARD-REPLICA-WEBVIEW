'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setLoading(false);
      } else {
        router.push('/feed');
      }
    };
    checkUser();
  }, [router]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage('❌ Error al iniciar sesión: ' + error.message);
      return;
    }

    if (data.user) {
      router.push('/feed');
    } else {
      setMessage('⚠️ No se encontró el usuario. Intenta de nuevo.');
    }
  };

  if (loading) return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff' }}>Verificando sesión...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '2rem', border: '1px solid #2f3336', borderRadius: 16 }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <svg viewBox="0 0 24 24" width={36} height={36} fill="white" style={{ marginBottom: 12 }}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Inicio de sesión</h1>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '12px 14px', background: '#16181c', border: '1px solid #2f3336', borderRadius: 8, color: '#fff', fontSize: 15, boxSizing: 'border-box' }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '12px 14px', background: '#16181c', border: '1px solid #2f3336', borderRadius: 8, color: '#fff', fontSize: 15, boxSizing: 'border-box' }}
          />

          {message && (
            <p style={{ color: message.startsWith('❌') ? '#f4212e' : '#00ba7c', fontSize: 13, margin: 0 }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            style={{ width: '100%', padding: '12px', background: '#fff', color: '#000', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 99, cursor: 'pointer', marginTop: 4 }}
          >
            Iniciar sesión
          </button>
        </form>

        <p style={{ color: '#71767b', fontSize: 14, textAlign: 'center', marginTop: '1.5rem' }}>
          ¿No tienes cuenta?{' '}
          <button
            onClick={() => router.push('/register')}
            style={{ color: '#1d9bf0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}
          >
            Regístrate aquí
          </button>
        </p>
      </div>
    </div>
  );
}