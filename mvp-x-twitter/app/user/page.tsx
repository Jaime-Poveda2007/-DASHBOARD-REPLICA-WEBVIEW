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

interface Tweet {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  retweets_count: number;
}

export default function UserPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'posts' | 'edit'>('posts');

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { router.push('/login'); return; }
      const uid = authData.user.id;

      const [
        { data: profileData },
        { data: tweetsData },
        { count: followers },
        { count: following },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('tweets').select('id, content, created_at, likes_count, retweets_count')
          .eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', uid),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', uid),
      ]);

      if (profileData) { setProfile(profileData); setFullName(profileData.full_name ?? ''); setBio(profileData.bio ?? ''); }
      setTweets(tweetsData ?? []);
      setFollowersCount(followers ?? 0);
      setFollowingCount(following ?? 0);
      setLoading(false);
    };
    init();
  }, [router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const { error } = await supabase.from('profiles').update({ full_name: fullName, bio }).eq('id', profile.id);
    if (!error) { setProfile({ ...profile, full_name: fullName, bio }); setMessage('✅ Perfil actualizado'); }
    else setMessage('❌ Error: ' + error.message);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff' }}>Cargando...</p>
    </div>
  );

  const initials = profile?.username?.[0]?.toUpperCase();

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', maxWidth: 480, margin: '0 auto' }}>

      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <button onClick={() => router.push('/feed')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 22 }}>←</button>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>{profile?.full_name}</p>
          <p style={{ margin: 0, color: '#71767b', fontSize: 13 }}>{tweets.length} posts</p>
        </div>
      </div>

      {/* BANNER */}
      <div style={{ background: 'linear-gradient(135deg, #1d9bf0 0%, #0d47a1 100%)', height: 130, position: 'relative' }}>
        {/* Avatar */}
        <div style={{
          position: 'absolute', bottom: -36, left: 16,
          width: 72, height: 72, borderRadius: '50%',
          background: '#1d9bf0', border: '4px solid #000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, fontWeight: 700, color: '#fff'
        }}>
          {initials}
        </div>
        {/* Botón editar */}
        <button onClick={() => setActiveTab('edit')}
          style={{ position: 'absolute', bottom: -48, right: 16, padding: '6px 16px', background: 'transparent', border: '1px solid #536471', borderRadius: 99, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          Editar perfil
        </button>
      </div>

      {/* INFO */}
      <div style={{ padding: '52px 16px 16px', borderBottom: '1px solid #2f3336' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 19 }}>{profile?.full_name}</p>
          {/* badge verificación decorativo */}
          <span style={{ background: '#1d9bf0', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✔ Obtener verificación</span>
        </div>
        <p style={{ margin: '0 0 8px', color: '#71767b', fontSize: 15 }}>@{profile?.username}</p>
        {profile?.bio && <p style={{ margin: '0 0 10px', fontSize: 15 }}>{profile.bio}</p>}
        <p style={{ margin: '0 0 10px', color: '#71767b', fontSize: 14 }}>
          📅 Se unió en {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </p>
        <div style={{ display: 'flex', gap: 20, fontSize: 14 }}>
          <span style={{ color: '#71767b' }}><strong style={{ color: '#fff' }}>{followingCount}</strong> Siguiendo</span>
          <span style={{ color: '#71767b' }}><strong style={{ color: '#fff' }}>{followersCount}</strong> Seguidores</span>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2f3336', overflowX: 'auto' }}>
        {['posts', 'Respuestas', 'Destacados', 'Videos', 'Fotos'].map((tab, i) => (
          <button key={tab}
            onClick={() => i === 0 ? setActiveTab('posts') : i === 4 ? setActiveTab('edit') : null}
            style={{
              flexShrink: 0, padding: '14px 20px', background: 'none', border: 'none',
              color: (activeTab === 'posts' && i === 0) || (activeTab === 'edit' && i === 4) ? '#fff' : '#71767b',
              fontWeight: (activeTab === 'posts' && i === 0) || (activeTab === 'edit' && i === 4) ? 700 : 400,
              borderBottom: (activeTab === 'posts' && i === 0) || (activeTab === 'edit' && i === 4) ? '2px solid #1d9bf0' : '2px solid transparent',
              cursor: 'pointer', fontSize: 15, whiteSpace: 'nowrap'
            }}>
            {tab === 'posts' ? 'Posts' : tab}
          </button>
        ))}
      </div>

      {/* TAB: Posts */}
      {activeTab === 'posts' && (
        <div style={{ paddingBottom: 80 }}>
          {tweets.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ color: '#71767b', fontSize: 16 }}>Aún no has publicado posts.</p>
            </div>
          )}
          {tweets.map(t => (
            <div key={t.id} style={{ padding: '12px 16px', borderBottom: '1px solid #2f3336', display: 'flex', gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{profile?.full_name}</span>
                  <span style={{ color: '#71767b', fontSize: 13 }}>@{profile?.username}</span>
                  <span style={{ color: '#71767b', fontSize: 13 }}>· {formatDate(t.created_at)}</span>
                </div>
                <p style={{ margin: '6px 0 10px', fontSize: 15, lineHeight: 1.5 }}>{t.content}</p>
                <div style={{ display: 'flex', gap: 24, color: '#71767b', fontSize: 13 }}>
                  <span>💬 Responder</span>
                  <span>🔁 {t.retweets_count ?? 0}</span>
                  <span>❤️ {t.likes_count ?? 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Editar perfil */}
      {activeTab === 'edit' && (
        <div style={{ padding: '24px 16px', paddingBottom: 80 }}>
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', color: '#71767b', fontSize: 13, marginBottom: 6 }}>Nombre completo</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', background: '#16181c', border: '1px solid #2f3336', borderRadius: 8, color: '#fff', fontSize: 15, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#71767b', fontSize: 13, marginBottom: 6 }}>Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={160}
                style={{ width: '100%', padding: '12px 14px', background: '#16181c', border: '1px solid #2f3336', borderRadius: 8, color: '#fff', fontSize: 15, boxSizing: 'border-box', resize: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#71767b', fontSize: 13, marginBottom: 6 }}>Usuario (solo lectura)</label>
              <input type="text" value={`@${profile?.username ?? ''}`} readOnly
                style={{ width: '100%', padding: '12px 14px', background: '#0a0a0a', border: '1px solid #2f3336', borderRadius: 8, color: '#71767b', fontSize: 15, boxSizing: 'border-box' }} />
            </div>
            {message && <p style={{ color: message.startsWith('❌') ? '#f4212e' : '#00ba7c', fontSize: 13 }}>{message}</p>}
            <button type="submit" style={{ padding: '12px', background: '#1d9bf0', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 99, cursor: 'pointer' }}>
              Guardar cambios
            </button>
          </form>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
            style={{ width: '100%', marginTop: 16, padding: '12px', background: 'transparent', color: '#f4212e', fontWeight: 700, fontSize: 15, border: '1px solid #f4212e', borderRadius: 99, cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: '#000', borderTop: '1px solid #2f3336',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '10px 0', zIndex: 40
      }}>
        <button onClick={() => router.push('/feed')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#71767b">
            <path d="M12 2.1L1 12h3v9h6v-6h4v6h6v-9h3L12 2.1z"/>
          </svg>
        </button>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#71767b" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
        </button>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#71767b" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
        </button>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#71767b" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <button onClick={() => router.push('/user')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff', border: '2px solid #fff' }}>
            {initials}
          </div>
        </button>
      </div>
    </div>
  );
}