'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Tweet {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export default function FeedPage() {
  const router = useRouter();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [newTweet, setNewTweet] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push('/login');
      } else {
        setCurrentUser(data.user);
        await fetchTweets();
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const fetchTweets = async () => {
    const { data, error } = await supabase
      .from('tweets')
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles:user_id (username, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) setTweets(data as any);
  };

  const handlePost = async () => {
    if (!newTweet.trim() || !currentUser) return;
    setPosting(true);

    const { error } = await supabase.from('tweets').insert({
      user_id: currentUser.id,
      content: newTweet.trim(),
    });

    if (!error) {
      setNewTweet('');
      await fetchTweets();
    }
    setPosting(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff' }}>Cargando feed...</p>
    </div>
  );

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', borderLeft: '1px solid #2f3336', borderRight: '1px solid #2f3336', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #2f3336', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Inicio</h2>
        </div>

        {/* Composer */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2f3336', display: 'flex', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
            {currentUser?.email?.[0]?.toUpperCase()}
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
                  opacity: newTweet.trim() ? 1 : 0.5
                }}
              >
                {posting ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>

        {/* Tweets */}
        {tweets.map((tweet) => (
          <div key={tweet.id} style={{ padding: '12px 16px', borderBottom: '1px solid #2f3336', display: 'flex', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, fontSize: 14 }}>
              {tweet.profiles?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{tweet.profiles?.full_name ?? 'Usuario'}</span>
                <span style={{ color: '#71767b', fontSize: 14 }}>@{tweet.profiles?.username ?? 'unknown'}</span>
                <span style={{ color: '#71767b', fontSize: 13 }}>· {formatDate(tweet.created_at)}</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 15, lineHeight: 1.5 }}>{tweet.content}</p>
            </div>
          </div>
        ))}

        {tweets.length === 0 && (
          <p style={{ textAlign: 'center', color: '#71767b', padding: '2rem' }}>
            No hay tweets aún. ¡Sé el primero!
          </p>
        )}
      </div>
    </div>
  );
}