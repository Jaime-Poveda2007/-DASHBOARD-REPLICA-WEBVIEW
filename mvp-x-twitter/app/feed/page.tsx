'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Profile {
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface Tweet {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  likes_count: number;
  retweets_count: number;
  profiles: Profile | null;
}

export default function FeedPage() {
  const router = useRouter();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [newTweet, setNewTweet] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [likedTweets, setLikedTweets] = useState<Set<string>>(new Set());

  // Cargar likes del usuario actual
  const fetchUserLikes = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('likes')
      .select('tweet_id')
      .eq('user_id', userId);
    if (data) {
      setLikedTweets(new Set(data.map((l: any) => l.tweet_id)));
    }
  }, []);

  const fetchTweets = useCallback(async () => {
    const { data, error } = await supabase
      .from('tweets')
      .select(`
        id,
        content,
        created_at,
        user_id,
        likes_count,
        retweets_count,
        profiles:user_id (username, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) setTweets(data as any);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push('/login');
      } else {
        setCurrentUser(data.user);
        await Promise.all([fetchTweets(), fetchUserLikes(data.user.id)]);
        setLoading(false);
      }
    };
    checkUser();
  }, [router, fetchTweets, fetchUserLikes]);

const handlePost = async () => {
  if (!newTweet.trim() || !currentUser) return;
  setPosting(true);

  const { error } = await supabase.from('tweets').insert({
    user_id: currentUser.id,
    content: newTweet.trim(),
    // ← elimina likes_count y retweets_count de aquí
  });

  if (error) {
    console.error('Error publicando:', error.message); // ← agrega esto
  } else {
    setNewTweet('');
    await fetchTweets();
  }
  setPosting(false);
};

  const handleLike = async (tweet: Tweet) => {
    if (!currentUser) return;
    const alreadyLiked = likedTweets.has(tweet.id);

    // Optimistic UI update
    setLikedTweets(prev => {
      const next = new Set(prev);
      alreadyLiked ? next.delete(tweet.id) : next.add(tweet.id);
      return next;
    });
    setTweets(prev =>
      prev.map(t =>
        t.id === tweet.id
          ? { ...t, likes_count: t.likes_count + (alreadyLiked ? -1 : 1) }
          : t
      )
    );

    if (alreadyLiked) {
      // Quitar like
      await supabase
        .from('likes')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('tweet_id', tweet.id);

      await supabase
        .from('tweets')
        .update({ likes_count: Math.max(0, tweet.likes_count - 1) })
        .eq('id', tweet.id);
    } else {
      // Dar like
      await supabase
        .from('likes')
        .insert({ user_id: currentUser.id, tweet_id: tweet.id });

      await supabase
        .from('tweets')
        .update({ likes_count: tweet.likes_count + 1 })
        .eq('id', tweet.id);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const getInitial = (str?: string | null) =>
    str?.[0]?.toUpperCase() ?? '?';

  if (loading) return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff', fontSize: 15 }}>Cargando feed...</p>
    </div>
  );

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', borderLeft: '1px solid #2f3336', borderRight: '1px solid #2f3336', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #2f3336', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Inicio</h2>
          <button
            onClick={handleLogout}
            style={{ background: 'transparent', border: '1px solid #2f3336', color: '#71767b', borderRadius: 99, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}
          >
            Cerrar sesión
          </button>
        </div>

        {/* Composer */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2f3336', display: 'flex', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
            {getInitial(currentUser?.email)}
          </div>
          <div style={{ flex: 1 }}>
            <textarea
              value={newTweet}
              onChange={(e) => setNewTweet(e.target.value)}
              placeholder="¿Qué está pasando?"
              maxLength={280}
              rows={3}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 18, resize: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ color: newTweet.length > 260 ? '#f4212e' : '#71767b', fontSize: 13 }}>
                {newTweet.length}/280
              </span>
              <button
                onClick={handlePost}
                disabled={!newTweet.trim() || posting}
                style={{
                  background: '#1d9bf0', color: '#fff', border: 'none',
                  borderRadius: 99, padding: '8px 18px', fontWeight: 700,
                  fontSize: 14, cursor: newTweet.trim() ? 'pointer' : 'not-allowed',
                  opacity: newTweet.trim() ? 1 : 0.5,
                }}
              >
                {posting ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>

        {/* Tweets */}
        {tweets.map((tweet) => {
          const liked = likedTweets.has(tweet.id);
          return (
            <div key={tweet.id} style={{ padding: '12px 16px', borderBottom: '1px solid #2f3336', display: 'flex', gap: 12 }}>
              {/* Avatar */}
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, fontSize: 14 }}>
                {getInitial(tweet.profiles?.username)}
              </div>

              <div style={{ flex: 1 }}>
                {/* Nombre y fecha */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{tweet.profiles?.full_name ?? 'Usuario'}</span>
                  <span style={{ color: '#71767b', fontSize: 14 }}>@{tweet.profiles?.username ?? 'unknown'}</span>
                  <span style={{ color: '#71767b', fontSize: 13 }}>· {formatDate(tweet.created_at)}</span>
                </div>

                {/* Contenido */}
                <p style={{ margin: '4px 0 12px', fontSize: 15, lineHeight: 1.5 }}>{tweet.content}</p>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>

                  {/* Reply (decorativo) */}
                  <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#71767b', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01z"/>
                    </svg>
                    <span>Responder</span>
                  </button>

                  {/* Retweet (decorativo) */}
                  <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#71767b', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
                    </svg>
                    <span>{tweet.retweets_count > 0 ? tweet.retweets_count : ''}</span>
                  </button>

                  {/* ❤️ Like — FUNCIONAL */}
                  <button
                    onClick={() => handleLike(tweet)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'none', border: 'none',
                      color: liked ? '#f91880' : '#71767b',
                      cursor: 'pointer', fontSize: 13, padding: 0,
                      transition: 'color 0.15s',
                    }}
                  >
                    <svg viewBox="0 0 24 24" width={18} height={18} fill={liked ? '#f91880' : 'none'} stroke={liked ? '#f91880' : 'currentColor'} strokeWidth={1.8}>
                      <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/>
                    </svg>
                    <span>{tweet.likes_count > 0 ? tweet.likes_count : ''}</span>
                  </button>

                  {/* Borrar tweet propio */}
                  {tweet.user_id === currentUser?.id && (
                    <button
                      onClick={async () => {
                        await supabase.from('tweets').delete().eq('id', tweet.id);
                        await fetchTweets();
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#71767b', cursor: 'pointer', fontSize: 13, padding: 0, marginLeft: 'auto' }}
                    >
                      <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path d="M16 6V4.5C16 3.12 14.88 2 13.5 2h-3C9.12 2 8 3.12 8 4.5V6H3v2h1.06l.81 11.21C4.98 20.78 6.28 22 7.86 22h8.28c1.58 0 2.88-1.22 3-2.79L19.94 8H21V6h-5zm-6-1.5c0-.28.22-.5.5-.5h3c.28 0 .5.22.5.5V6h-4V4.5zm7.13 15.17c-.04.52-.47.83-.99.83H7.86c-.52 0-.95-.31-.99-.83L6.07 8h11.86l-.8 11.67z"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {tweets.length === 0 && (
          <p style={{ textAlign: 'center', color: '#71767b', padding: '2rem' }}>
            No hay tweets aún. ¡Sé el primero!
          </p>
        )}
      </div>
    </div>
  );
}
