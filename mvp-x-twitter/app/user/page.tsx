'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
}

export default function UserPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push('/login');
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!error && profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name ?? '');
        setBio(profileData.bio ?? '');
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, bio })
      .eq('id', profile.id);

    if (error) {
      setMessage('❌ Error al actualizar: ' + error.message);
    } else {
      setMessage('✅ Perfil actualizado correctamente');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff' }}>Cargando perfil...</p>
    </div>
  );

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', borderLeft: '1px solid #2f3336', borderRight: '1px solid #2f3336', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #2f3336' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Mi perfil</h2>
        </div>

        <div style={{ padding: '24px 16px' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700 }}>
              {profile?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>{profile?.full_name}</p>
              <p style={{ margin: 0, color: '#71767b' }}>@{profile?.username}</p>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', color: '#71767b', fontSize: 13, marginBottom: 6 }}>Nombre completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', background: '#16181c', border: '1px solid #2f3336', borderRadius: 8, color: '#fff', fontSize: 15, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#71767b', fontSize: 13, marginBottom: 6 }}>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={160}
                style={{ width: '100%', padding: '12px 14px', background: '#16181c', border: '1px solid #2f3336', borderRadius: 8, color: '#fff', fontSize: 15, boxSizing: 'border-box', resize: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#71767b', fontSize: 13, marginBottom: 6 }}>Usuario (solo lectura)</label>
              <input
                type="text"
                value={`@${profile?.username ?? ''}`}
                readOnly
                style={{ width: '100%', padding: '12px 14px', background: '#0a0a0a', border: '1px solid #2f3336', borderRadius: 8, color: '#71767b', fontSize: 15, boxSizing: 'border-box' }}
              />
            </div>

            {message && (
              <p style={{ color: message.startsWith('❌') ? '#f4212e' : '#00ba7c', fontSize: 13, margin: 0 }}>
                {message}
              </p>
            )}

            <button
              type="submit"
              style={{ padding: '12px', background: '#1d9bf0', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 99, cursor: 'pointer' }}
            >
              Guardar cambios
            </button>
          </form>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{ width: '100%', marginTop: 16, padding: '12px', background: 'transparent', color: '#f4212e', fontWeight: 700, fontSize: 15, border: '1px solid #f4212e', borderRadius: 99, cursor: 'pointer' }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}