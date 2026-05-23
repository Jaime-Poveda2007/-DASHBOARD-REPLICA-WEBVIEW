'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface Tweet {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes_count: number;
  retweets_count: number;
  profiles: Profile;
}

export default function FeedPage() {
  const router = useRouter();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [content, setContent] = useState('');
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { router.push('/login'); return; }
      const uid = authData.user.id;

      const [
        { data: profileData },
        { data: tweetsData },
        { data: likesData },
        { data: followsData },
        { count: followers },
        { count: following },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('tweets')
          .select('*, profiles(id, username, full_name, avatar_url, bio)')
          .order('created_at', { ascending: false }),
        supabase.from('likes').select('tweet_id').eq('user_id', uid),
        supabase.from('follows').select('following_id').eq('follower_id', uid),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', uid),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', uid),
      ]);

      setCurrentUser(profileData);
      setTweets((tweetsData as Tweet[]) ?? []);
      setLikedSet(new Set(likesData?.map(l => l.tweet_id) ?? []));
      setFollowingSet(new Set(followsData?.map(f => f.following_id) ?? []));
      setFollowersCount(followers ?? 0);
      setFollowingCount(following ?? 0);
      setLoading(false);
    };
    init();
  }, [router]);

  const handlePost = async () => {
    if (!content.trim() || !currentUser) return;
    const { data, error } = await supabase
      .from('tweets')
      .insert({ user_id: currentUser.id, content: content.trim(), likes_count: 0, retweets_count: 0 })
      .select('*, profiles(id, username, full_name, avatar_url, bio)')
      .single();
    if (!error && data) {
      setTweets(prev => [data as Tweet, ...prev]);
      setContent('');
      setShowComposer(false);
    }
  };

  const handleLike = async (tweet: Tweet) => {
    if (!currentUser) return;
    const alreadyLiked = likedSet.has(tweet.id);
    if (alreadyLiked) {
      await supabase.from('likes').delete().eq('user_id', currentUser.id).eq('tweet_id', tweet.id);
      await supabase.from('tweets').update({ likes_count: Math.max(0, tweet.likes_count - 1) }).eq('id', tweet.id);
      setLikedSet(prev => { const s = new Set(prev); s.delete(tweet.id); return s; });
      setTweets(prev => prev.map(t => t.id === tweet.id ? { ...t, likes_count: t.likes_count - 1 } : t));
    } else {
      await supabase.from('likes').insert({ user_id: currentUser.id, tweet_id: tweet.id });
      await supabase.from('tweets').update({ likes_count: tweet.likes_count + 1 }).eq('id', tweet.id);
      setLikedSet(prev => new Set(prev).add(tweet.id));
      setTweets(prev => prev.map(t => t.id === tweet.id ? { ...t, likes_count: t.likes_count + 1 } : t));
    }
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!currentUser || targetUserId === currentUser.id) return;
    const isFollowing = followingSet.has(targetUserId);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetUserId);
      setFollowingSet(prev => { const s = new Set(prev); s.delete(targetUserId); return s; });
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: targetUserId });
      setFollowingSet(prev => new Set(prev).add(targetUserId));
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const displayedTweets = activeTab === 'following'
    ? tweets.filter(t => t.user_id === currentUser?.id || followingSet.has(t.user_id))
    : tweets;

  if (loading) return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff' }}>Cargando...</p>
    </div>
  );

  const initials = currentUser?.username?.[0]?.toUpperCase();

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', maxWidth: 480, margin: '0 auto', position: 'relative' }}>

      {/* SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          {/* backdrop */}
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.15)' }} />
          {/* drawer */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: 280, height: '100%', background: '#000', padding: '24px 20px', overflowY: 'auto', zIndex: 51 }}>
            {/* Avatar + nombre */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, marginBottom: 10 }}>
                {initials}
              </div>
              <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 16 }}>{currentUser?.full_name}</p>
              <p style={{ margin: '0 0 12px', color: '#71767b', fontSize: 14 }}>@{currentUser?.username}</p>
              <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
                <span style={{ color: '#71767b' }}><strong style={{ color: '#fff' }}>{followingCount}</strong> Siguiendo</span>
                <span style={{ color: '#71767b' }}><strong style={{ color: '#fff' }}>{followersCount}</strong> Seguidores</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #2f3336', paddingTop: 16 }}>
              {[
                { icon: '👤', label: 'Perfil', action: () => { router.push('/user'); setSidebarOpen(false); } },
                { icon: '✅', label: 'Premium', action: () => {} },
                { icon: '🔖', label: 'Historial', action: () => {} },
                { icon: '👥', label: 'Comunidades', action: () => {} },
                { icon: '📋', label: 'Listas', action: () => {} },
                { icon: '🎙️', label: 'Espacios', action: () => {} },
                { icon: '🚀', label: 'Estudio para creadores', action: () => {} },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 18, fontWeight: 600, padding: '14px 0', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span> {item.label}
                </button>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #2f3336', paddingTop: 16, marginTop: 8 }}>
              {[
                { icon: '⚙️', label: 'Configuración y privacidad', action: () => {} },
                { icon: '❓', label: 'Centro de Ayuda', action: () => {} },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 16, fontWeight: 500, padding: '12px 0', cursor: 'pointer' }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span> {item.label}
                </button>
              ))}
              <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', background: 'none', border: 'none', color: '#f4212e', fontSize: 16, fontWeight: 600, padding: '12px 0', cursor: 'pointer' }}>
                <span>🚪</span> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPOSER */}
      {showComposer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60 }}>
          <div style={{ background: '#000', border: '1px solid #2f3336', borderRadius: 16, width: '90%', maxWidth: 440, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <button onClick={() => setShowComposer(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
              <button onClick={handlePost} disabled={!content.trim()}
                style={{ padding: '8px 20px', background: content.trim() ? '#1d9bf0' : '#0e4a6e', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 99, cursor: content.trim() ? 'pointer' : 'not-allowed' }}>
                Publicar
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                {initials}
              </div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="¿Qué está pasando?"
                maxLength={280}
                rows={4}
                autoFocus
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 18, resize: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <p style={{ color: '#71767b', fontSize: 13, textAlign: 'right', marginTop: 8 }}>{content.length}/280</p>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
          {/* Avatar (abre sidebar) */}
          <button onClick={() => setSidebarOpen(true)}
            style={{ width: 36, height: 36, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 16 }}>
            {initials}
          </button>

          {/* Logo X */}
          <svg viewBox="0 0 24 24" width={26} height={26} fill="white">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>

          {/* Placeholder derecha */}
          <div style={{ width: 36 }} />
        </div>

        {/* Tabs Para ti / Siguiendo */}
        <div style={{ display: 'flex', borderBottom: '1px solid #2f3336' }}>
          {(['foryou', 'following'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '14px', background: 'none', border: 'none',
              color: activeTab === tab ? '#fff' : '#71767b',
              fontWeight: activeTab === tab ? 700 : 400,
              borderBottom: activeTab === tab ? '2px solid #1d9bf0' : '2px solid transparent',
              cursor: 'pointer', fontSize: 15
            }}>
              {tab === 'foryou' ? 'Para ti' : 'Siguiendo'}
            </button>
          ))}
        </div>
      </div>

      {/* TWEET LIST */}
      <div style={{ paddingBottom: 80 }}>
        {displayedTweets.map(tweet => (
          <div key={tweet.id} style={{ padding: '12px 16px', borderBottom: '1px solid #2f3336', display: 'flex', gap: 10 }}>
            {/* Avatar */}
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, fontSize: 18 }}>
              {tweet.profiles?.username?.[0]?.toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Header tweet */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{tweet.profiles?.full_name}</span>
                <span style={{ color: '#71767b', fontSize: 14 }}>@{tweet.profiles?.username}</span>
                <span style={{ color: '#71767b', fontSize: 14 }}>· {formatDate(tweet.created_at)}</span>

                {tweet.user_id !== currentUser?.id && (
                  <button onClick={() => toggleFollow(tweet.user_id)}
                    style={{
                      marginLeft: 'auto', padding: '3px 14px', borderRadius: 99,
                      border: '1px solid #536471',
                      background: followingSet.has(tweet.user_id) ? 'transparent' : 'transparent',
                      color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer'
                    }}>
                    {followingSet.has(tweet.user_id) ? 'Siguiendo' : 'Seguir'}
                  </button>
                )}
              </div>

              {/* Contenido */}
              <p style={{ margin: '4px 0 10px', fontSize: 15, lineHeight: 1.5, wordBreak: 'break-word' }}>{tweet.content}</p>

              {/* Acciones */}
              <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 280 }}>
                {/* Responder */}
                <button style={{ background: 'none', border: 'none', color: '#71767b', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71767b" strokeWidth="1.8">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>Responder</span>
                </button>

                {/* Retweet */}
                <button style={{ background: 'none', border: 'none', color: '#71767b', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71767b" strokeWidth="1.8">
                    <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                    <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                  </svg>
                  <span>{tweet.retweets_count ?? 0}</span>
                </button>

                {/* Like */}
                <button onClick={() => handleLike(tweet)}
                  style={{ background: 'none', border: 'none', color: likedSet.has(tweet.id) ? '#f91880' : '#71767b', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24"
                    fill={likedSet.has(tweet.id) ? '#f91880' : 'none'}
                    stroke={likedSet.has(tweet.id) ? '#f91880' : '#71767b'} strokeWidth="1.8">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span>{tweet.likes_count ?? 0}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* BOTÓN + FLOTANTE */}
      <button onClick={() => setShowComposer(true)}
        style={{
          position: 'fixed', bottom: 80, right: 20,
          width: 56, height: 56, borderRadius: '50%',
          background: '#1d9bf0', border: 'none',
          color: '#fff', fontSize: 28, fontWeight: 700,
          cursor: 'pointer', zIndex: 30,
          boxShadow: '0 4px 12px rgba(29,155,240,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
        +
      </button>

      {/* BOTTOM NAV */}
<div style={{
  position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
  width: '100%', maxWidth: 480,
  background: '#000', borderTop: '1px solid #2f3336',
  display: 'flex', justifyContent: 'space-around', alignItems: 'center',
  padding: '10px 0 14px', zIndex: 40
}}>

  {/* Inicio — casa X */}
  <button onClick={() => router.push('/feed')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
      <path d="M12 1.696L.622 9.833l1.04 1.52L3 10.48V19.5C3 20.881 4.119 22 5.5 22h4a1 1 0 0 0 1-1v-4.5h3V21a1 1 0 0 0 1 1h4c1.381 0 2.5-1.119 2.5-2.5V10.48l1.338.873 1.04-1.52L12 1.696zM17 20h-2v-4.5a1 1 0 0 0-1-1H10a1 1 0 0 0-1 1V20H7v-11.3l5-3.261 5 3.261V20z"/>
    </svg>
  </button>

  {/* Buscar */}
  <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="#71767b">
      <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.814 5.262l4.276 4.276-1.414 1.414-4.276-4.276C13.815 17.818 12 18.5 10.25 18.5c-4.694 0-8.5-3.806-8.5-8.5z"/>
    </svg>
  </button>

  {/* Grok */}
  <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="#71767b">
      <path d="M16.5 5H13V3h3.5A4.5 4.5 0 0 1 21 7.5v3h-2v-3A2.5 2.5 0 0 0 16.5 5zM13 21h3.5a4.5 4.5 0 0 0 4.5-4.5v-3h-2v3a2.5 2.5 0 0 1-2.5 2.5H13v2zM3 16.5V19h2.5A4.5 4.5 0 0 0 10 14.5V11H8v3.5A2.5 2.5 0 0 1 5.5 17H3v-.5zM10 3H6.5A4.5 4.5 0 0 0 2 7.5V11h2V7.5A2.5 2.5 0 0 1 6.5 5H10V3z"/>
    </svg>
  </button>

  {/* Notificaciones */}
  <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="#71767b">
      <path d="M11.996 2c-4.062 0-7.49 3.021-7.999 7.051L2.866 13H1v2h3.08l.194-1.534.027-.215.006-.07.846-5.83C5.56 5.079 8.145 4 11.996 4c3.838 0 6.42 1.072 6.877 3.351l.846 5.83.006.07.025.215L19.92 15H23v-2h-1.865l-1.132-7.876C19.486 4.92 16.151 2 11.996 2zM9 17a3 3 0 0 0 6 0H9z"/>
    </svg>
  </button>

  {/* Mensajes */}
  <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="#71767b">
      <path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v11c0 1.381-1.119 2.5-2.5 2.5h-8.5l-5.5 5v-5h-1c-1.381 0-2.5-1.119-2.5-2.5v-11zm4.5 9.5h11v-2H6.498v2zm0-4h11v-2H6.498v2zm0-4h11V5h-11v2z"/>
    </svg>
  </button>
</div>
    </div>
  );
}