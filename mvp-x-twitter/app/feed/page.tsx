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


      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>

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
                {
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.863 13.44c1.477 1.58 2.137 3.23 2.137 3.857 0 3.816-3.83 7-8 7-4.113 0-8-3.078-8-7 0-.629.067-1.29.201-1.96l.042-.243.039-.022.015-.076.016-.087C4.322 10.089 4 9.076 4 8c0-4.418 4.03-8 9-8s9 3.582 9 8c0 1.076-.322 2.09-.745 3.052l.016.087.015.076.039.022.042.243c.134.67.201 1.331.201 1.96 0 .384-.05.757-.12 1.044zM12 20c3.364 0 6-2.386 6-5s-2.636-5-6-5-6 2.386-6 5 2.636 5 6 5zm0-3a2 2 0 1 1-.001-3.999A2 2 0 0 1 12 17z" /></svg>,
                  label: 'Perfil',
                  action: () => { router.push('/user'); setSidebarOpen(false); }
                },
                {
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
                  label: 'Premium',
                  action: () => { }
                },
                {
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z" /></svg>,
                  label: 'Historial',
                  action: () => { }
                },
                {
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M7.501 19.917L7.471 21H.5l.029-1.027c.137-4.835 2.534-6.972 5.004-7.924C4.916 10.891 4 9.246 4 7.5 4 4.462 6.462 2 9.5 2s5.5 2.462 5.5 5.5c0 1.746-.916 3.391-2.033 4.549.452.172.893.378 1.315.621A6.966 6.966 0 0 0 12 17c0 1.294.358 2.505.985 3.535l-.985.382zm1.499-9.917c1.93 0 3.5-1.57 3.5-3.5S10.93 3 9 3 5.5 4.57 5.5 6.5 7.07 10 9 10zm8.5 1c-3.038 0-5.5 2.46-5.5 5.5S15.962 22 19 22s5.5-2.46 5.5-5.5S22.038 11 19 11zm0 9c-1.93 0-3.5-1.57-3.5-3.5S17.07 13 19 13s3.5 1.57 3.5 3.5S20.93 20 19 20z" /></svg>,
                  label: 'Comunidades',
                  action: () => { }
                },
                {
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M19.5 3h-15A1.5 1.5 0 0 0 3 4.5v15A1.5 1.5 0 0 0 4.5 21h15a1.5 1.5 0 0 0 1.5-1.5v-15A1.5 1.5 0 0 0 19.5 3zm-15 2h15v2h-15V5zm0 4h15v10h-15V9zm2 2v2h11v-2H6.5zm0 4v2h8v-2H6.5z" /></svg>,
                  label: 'Listas',
                  action: () => { }
                },
                {
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M8.539 17.58l-4.608-2.461.971-1.817 3.455 1.845 6.91-9.8 1.736 1.223-7.464 10.01zm2.058-15.768C5.854 1.812 2 5.914 2 11c0 5.086 3.854 9.188 8.597 9.188 4.743 0 8.597-4.102 8.597-9.188 0-5.086-3.854-9.188-8.597-9.188zM22 11c0 6.627-5.149 12-11.5 12S-1 17.627-1 11 4.149-1 10.5-1 22 4.373 22 11z" /></svg>,
                  label: 'Espacios',
                  action: () => { }
                },
                {
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></svg>,
                  label: 'Estudio para creadores',
                  action: () => { }
                },
                ...(currentUser?.id ? [{
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 10c-5.33 0-8 2.67-8 4v1h2v-1c0-.48 1.34-2 6-2s6 1.52 6 2v1h2v-1c0-1.33-2.67-4-8-4z" />
                      <path d="M19 13h-1v3h-3v1h3v3h1v-3h3v-1h-3z" />
                    </svg>
                  ),
                  label: 'Panel Admin',
                  action: () => { router.push('/admin'); setSidebarOpen(false); }
                }] : []),
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 18, fontWeight: 600, padding: '14px 0', cursor: 'pointer', textAlign: 'left' }}>
                  {item.icon} {item.label}
                </button>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #2f3336', paddingTop: 16, marginTop: 8 }}>
              {[
                {
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M10.54 1.75h2.92l1.57 2.36c.19.28.63.26.79-.04l1.08-1.96 2.82.85-1.96 5.38c-.15.41.26.79.65.6l1.97-.96 1.65 2.37-1.64 3c-.16.29-.02.65.28.77l2.02.8-.46 2.95-3.37-.14c-.32-.01-.57.26-.52.58l.44 2.45-2.56 1.51-2.1-2.72c-.2-.26-.58-.26-.78 0l-2.1 2.72-2.56-1.51.44-2.45c.05-.32-.2-.59-.52-.58l-3.37.14-.46-2.95 2.02-.8c.3-.12.44-.48.28-.77l-1.64-3 1.65-2.37 1.97.96c.39.19.8-.19.65-.6L4.36 2.96l2.82-.85 1.08 1.96c.16.3.6.32.79.04l1.49-2.36z" /></svg>,
                  label: 'Configuración y privacidad',
                  action: () => { }
                },
                {
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M11.57 11.96c-.24.2-.4.48-.4.8 0 .55.45 1 1 1s1-.45 1-1c0-.32-.16-.6-.4-.8.24-.2.4-.48.4-.8V8c0-.55-.45-1-1-1s-1 .45-1 1v3.16c0 .32.16.6.4.8zm.43-9.96C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2v-2z" /></svg>,
                  label: 'Centro de Ayuda',
                  action: () => { }
                },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 16, fontWeight: 500, padding: '12px 0', cursor: 'pointer' }}>
                  {item.icon} {item.label}
                </button>
              ))}

              <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', background: 'none', border: 'none', color: '#f4212e', fontSize: 16, fontWeight: 600, padding: '12px 0', cursor: 'pointer' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#f4212e">
                  <path d="M15.854 11.646l-3.5-3.5-.708.708L14.293 11H3v1h11.293l-2.647 2.646.708.708 3.5-3.5c.195-.195.195-.512 0-.708z" /><path d="M9 3.5A5.5 5.5 0 1 1 9 14.5v2a7.5 7.5 0 1 0 0-15v2z" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}


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


      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>

          <button onClick={() => setSidebarOpen(true)}
            style={{ width: 36, height: 36, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 16 }}>
            {initials}
          </button>


          <svg viewBox="0 0 24 24" width={26} height={26} fill="white">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>


          <div style={{ width: 36 }} />
        </div>


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


      <div style={{ paddingBottom: 80 }}>
        {displayedTweets.map(tweet => (
          <div key={tweet.id} style={{ padding: '12px 16px', borderBottom: '1px solid #2f3336', display: 'flex', gap: 10 }}>
            {/* Avatar */}
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, fontSize: 18 }}>
              {tweet.profiles?.username?.[0]?.toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>

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


              <p style={{ margin: '4px 0 10px', fontSize: 15, lineHeight: 1.5, wordBreak: 'break-word' }}>{tweet.content}</p>


              <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 280 }}>

                <button style={{ background: 'none', border: 'none', color: '#71767b', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71767b" strokeWidth="1.8">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Responder</span>
                </button>

                <button style={{ background: 'none', border: 'none', color: '#71767b', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71767b" strokeWidth="1.8">
                    <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                  <span>{tweet.retweets_count ?? 0}</span>
                </button>


                <button onClick={() => handleLike(tweet)}
                  style={{ background: 'none', border: 'none', color: likedSet.has(tweet.id) ? '#f91880' : '#71767b', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24"
                    fill={likedSet.has(tweet.id) ? '#f91880' : 'none'}
                    stroke={likedSet.has(tweet.id) ? '#f91880' : '#71767b'} strokeWidth="1.8">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>{tweet.likes_count ?? 0}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

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

      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: '#000', borderTop: '1px solid #2f3336',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '10px 0 14px', zIndex: 40
      }}>

        <button onClick={() => router.push('/feed')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M12 1.696L.622 9.833l1.04 1.52L3 10.48V19.5C3 20.881 4.119 22 5.5 22h4a1 1 0 0 0 1-1v-4.5h3V21a1 1 0 0 0 1 1h4c1.381 0 2.5-1.119 2.5-2.5V10.48l1.338.873 1.04-1.52L12 1.696zM17 20h-2v-4.5a1 1 0 0 0-1-1H10a1 1 0 0 0-1 1V20H7v-11.3l5-3.261 5 3.261V20z" />
          </svg>
        </button>

        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#71767b">
            <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.814 5.262l4.276 4.276-1.414 1.414-4.276-4.276C13.815 17.818 12 18.5 10.25 18.5c-4.694 0-8.5-3.806-8.5-8.5z" />
          </svg>
        </button>

        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#71767b">
            <path d="M16.5 5H13V3h3.5A4.5 4.5 0 0 1 21 7.5v3h-2v-3A2.5 2.5 0 0 0 16.5 5zM13 21h3.5a4.5 4.5 0 0 0 4.5-4.5v-3h-2v3a2.5 2.5 0 0 1-2.5 2.5H13v2zM3 16.5V19h2.5A4.5 4.5 0 0 0 10 14.5V11H8v3.5A2.5 2.5 0 0 1 5.5 17H3v-.5zM10 3H6.5A4.5 4.5 0 0 0 2 7.5V11h2V7.5A2.5 2.5 0 0 1 6.5 5H10V3z" />
          </svg>
        </button>

        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#71767b">
            <path d="M11.996 2c-4.062 0-7.49 3.021-7.999 7.051L2.866 13H1v2h3.08l.194-1.534.027-.215.006-.07.846-5.83C5.56 5.079 8.145 4 11.996 4c3.838 0 6.42 1.072 6.877 3.351l.846 5.83.006.07.025.215L19.92 15H23v-2h-1.865l-1.132-7.876C19.486 4.92 16.151 2 11.996 2zM9 17a3 3 0 0 0 6 0H9z" />
          </svg>
        </button>

        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#71767b">
            <path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v11c0 1.381-1.119 2.5-2.5 2.5h-8.5l-5.5 5v-5h-1c-1.381 0-2.5-1.119-2.5-2.5v-11zm4.5 9.5h11v-2H6.498v2zm0-4h11v-2H6.498v2zm0-4h11V5h-11v2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}