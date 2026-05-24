'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  username: string;
  full_name: string;
}

interface Tweet {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes_count: number;
  retweets_count: number;
  profiles: Profile | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'tweets' | 'usuarios'>('tweets');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const verificarAdmin = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push('/login');
        return;
      }

      const admins = ['kevingabrielgonzalez1234@gmail.com', 'jaime.povedam@uniagustiniana.edu.co', 'jaimeapomar@gmail.com'];
      if (!admins.includes(data.user.email ?? ''))
        {
          router.push('/feed');
          return;
        }
        fetchTweets();
        fetchProfiles();
      };
      verificarAdmin();
    }, [router]);

  const fetchTweets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tweets')
      .select(`
        id,
        user_id,
        content,
        created_at,
        likes_count,
        retweets_count,
        profiles!user_id(id, username, full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      setMessage('Error al cargar tweets: ' + error.message);
    } else {
      setTweets((data as unknown as Tweet[]) || []);
    }
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .order('full_name', { ascending: true });

    if (error) {
      setMessage('Error al cargar usuarios: ' + error.message);
    } else {
      setProfiles(data || []);
    }
  };

  const eliminarTweet = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('tweets').delete().eq('id', id);
    if (error) {
      setMessage('Error al eliminar: ' + error.message);
    } else {
      setMessage('Tweet eliminado');
      fetchTweets();
    }
    setDeletingId(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const eliminarUsuario = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      setMessage('Error al eliminar usuario: ' + error.message);
    } else {
      setMessage('Usuario eliminado');
      fetchProfiles();
    }
    setDeletingId(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#71767b', fontSize: 16 }}>Cargando panel...</p>
    </div>
  );

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#e7e9ea', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      <div style={{ borderBottom: '1px solid #2f3336', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <svg viewBox="0 0 24 24" width={24} height={24} fill="white">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e7e9ea' }}>Panel Administrativo</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#71767b' }}>Gestión de contenido</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 13, color: '#71767b' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#71767b">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {tweets.length} tweets
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#71767b">
              <path d="M17.863 13.44c1.477 1.58 2.137 3.23 2.137 3.857 0 3.816-3.83 7-8 7-4.113 0-8-3.078-8-7 0-.629.067-1.29.201-1.96l.042-.243.015-.076.016-.087C4.322 10.089 4 9.076 4 8c0-4.418 4.03-8 9-8s9 3.582 9 8c0 1.076-.322 2.09-.745 3.052l.016.087.015.076.042.243c.134.67.201 1.331.201 1.96 0 .384-.05.757-.12 1.044zM12 20c3.364 0 6-2.386 6-5s-2.636-5-6-5-6 2.386-6 5 2.636 5 6 5z" />
            </svg>
            {profiles.length} usuarios
          </span>
        </div>
      </div>

 
      {message && (
        <div style={{ padding: '12px 24px', background: message.startsWith('❌') ? '#2d0a0a' : '#0a2d1a', borderBottom: '1px solid #2f3336', color: message.startsWith('❌') ? '#f4212e' : '#00ba7c', fontSize: 14 }}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2f3336' }}>
        {(['tweets', 'usuarios'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '16px',
              background: 'none',
              border: 'none',
              color: activeTab === tab ? '#e7e9ea' : '#71767b',
              fontSize: 15,
              fontWeight: activeTab === tab ? 700 : 400,
              cursor: 'pointer',
              borderBottom: activeTab === tab ? '2px solid #1d9bf0' : '2px solid transparent',
              textTransform: 'capitalize',
              transition: 'color 0.2s',
            }}
          >
            {tab === 'tweets' ? `Tweets (${tweets.length})` : `Usuarios (${profiles.length})`}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Tab Tweets */}
        {activeTab === 'tweets' && (
          <div>
            {tweets.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#71767b', padding: 40 }}>No hay tweets</p>
            ) : (
              tweets.map((tweet) => {
                const profile = Array.isArray(tweet.profiles) ? tweet.profiles[0] : tweet.profiles;
                return (
                  <div key={tweet.id} style={{ padding: '16px 24px', borderBottom: '1px solid #2f3336', display: 'flex', gap: 12 }}>
                    {/* Avatar */}
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                      {(profile?.full_name?.[0] || '?').toUpperCase()}
                    </div>

                    {/* Contenido */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{profile?.full_name || 'Usuario desconocido'}</span>
                        <span style={{ color: '#71767b', fontSize: 14 }}>@{profile?.username || 'unknown'}</span>
                        <span style={{ color: '#71767b', fontSize: 13, marginLeft: 'auto' }}>{formatDate(tweet.created_at)}</span>
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: 15, lineHeight: 1.5, wordBreak: 'break-word' }}>{tweet.content}</p>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <span style={{ color: '#71767b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71767b" strokeWidth="1.8">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          {tweet.likes_count || 0}
                        </span>
                        <span style={{ color: '#71767b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71767b" strokeWidth="1.8">
                            <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                            <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                          </svg>
                          {tweet.retweets_count || 0}
                        </span>
                        <button
                          onClick={() => eliminarTweet(tweet.id)}
                          disabled={deletingId === tweet.id}
                          style={{ marginLeft: 'auto', padding: '6px 14px', background: 'transparent', border: '1px solid #f4212e', borderRadius: 99, color: '#f4212e', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: deletingId === tweet.id ? 0.5 : 1, transition: 'background 0.2s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#2d0a0a')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {deletingId === tweet.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}


        {activeTab === 'usuarios' && (
          <div>
            {profiles.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#71767b', padding: 40 }}>No hay usuarios</p>
            ) : (
              profiles.map((profile) => (
                <div key={profile.id} style={{ padding: '16px 24px', borderBottom: '1px solid #2f3336', display: 'flex', alignItems: 'center', gap: 12 }}>
             
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                    {(profile.full_name?.[0] || '?').toUpperCase()}
                  </div>

             
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{profile.full_name}</p>
                    <p style={{ margin: 0, color: '#71767b', fontSize: 14 }}>@{profile.username}</p>
                  </div>

             
                  <button
                    onClick={() => eliminarUsuario(profile.id)}
                    disabled={deletingId === profile.id}
                    style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #f4212e', borderRadius: 99, color: '#f4212e', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: deletingId === profile.id ? 0.5 : 1, transition: 'background 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#2d0a0a')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {deletingId === profile.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
