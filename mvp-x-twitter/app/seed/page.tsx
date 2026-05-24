'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { faker } from '@faker-js/faker';

export default function SeedPage() {
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const runSeed = async () => {
    setRunning(true);
    setLog([]);
    addLog('Obteniendo usuarios reales de Supabase...');

    // 1. Traer todos los perfiles reales que existen
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username');

    if (profilesError || !profiles || profiles.length === 0) {
      addLog('❌ No hay perfiles en la base de datos. Regístrate primero.');
      setRunning(false);
      return;
    }

    addLog(`✅ ${profiles.length} usuario(s) encontrado(s): ${profiles.map(p => '@' + p.username).join(', ')}`);
    addLog('Generando tweets con Faker.js...');

    let total = 0;

    // 2. Por cada perfil real, generar 10 tweets con Faker
    for (const profile of profiles) {
      for (let j = 0; j < 10; j++) {
        const { error } = await supabase.from('tweets').insert({
          user_id: profile.id,
          content: faker.lorem.sentence({ min: 5, max: 25 }),
          likes_count: faker.number.int({ min: 0, max: 300 }),
          retweets_count: faker.number.int({ min: 0, max: 80 }),
        });

        if (error) {
          addLog(`❌ Tweet ${j + 1} de @${profile.username}: ${error.message}`);
        } else {
          total++;
        }
      }
      addLog(`✅ 10 tweets generados para @${profile.username}`);
    }

    addLog(`🎉 Seed completado. ${total} tweets insertados con Faker.js.`);
    setRunning(false);
  };

  const clearTweets = async () => {
    const { error } = await supabase
      .from('tweets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error) {
      setLog(['❌ Error al limpiar: ' + error.message]);
    } else {
      setLog(['🗑️ Todos los tweets eliminados.']);
    }
  };

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', padding: '2rem' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>🌱 Seed de datos — Faker.js</h1>
      <p style={{ color: '#71767b', marginBottom: 8 }}>
        Genera <strong style={{ color: '#fff' }}>10 tweets por usuario real</strong> usando contenido de Faker.js.
      </p>
      <p style={{ color: '#555', fontSize: 13, marginBottom: 24 }}>
        ⚠️ Faker no puede crear usuarios nuevos (limitación de Supabase Auth). En cambio genera el <strong style={{ color: '#71767b' }}>contenido</strong> de los tweets.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button
          onClick={runSeed}
          disabled={running}
          style={{
            background: running ? '#333' : '#1d9bf0',
            color: '#fff', border: 'none', borderRadius: 99,
            padding: '12px 24px', fontWeight: 700, fontSize: 15,
            cursor: running ? 'not-allowed' : 'pointer',
          }}
        >
          {running ? 'Generando...' : '▶ Ejecutar Seed'}
        </button>

        <button
          onClick={clearTweets}
          disabled={running}
          style={{
            background: 'transparent', color: '#f4212e',
            border: '1px solid #f4212e', borderRadius: 99,
            padding: '12px 24px', fontWeight: 700, fontSize: 15,
            cursor: 'pointer',
          }}
        >
          🗑️ Limpiar tweets
        </button>
      </div>

      <div style={{ background: '#111', border: '1px solid #2f3336', borderRadius: 12, padding: 16, fontFamily: 'monospace', fontSize: 13, minHeight: 200 }}>
        {log.length === 0
          ? <span style={{ color: '#555' }}>El log aparecerá aquí...</span>
          : log.map((line, i) => (
            <div key={i} style={{
              color: line.startsWith('❌') ? '#f4212e'
                : line.startsWith('✅') ? '#00ba7c'
                : line.startsWith('🎉') ? '#1d9bf0'
                : '#e7e9ea',
              marginBottom: 4
            }}>
              {line}
            </div>
          ))
        }
      </div>

      {log.some(l => l.includes('Seed completado')) && (
        <div style={{ marginTop: 20, padding: 16, background: '#001a0e', border: '1px solid #00ba7c', borderRadius: 12 }}>
          <p style={{ color: '#00ba7c', margin: 0, fontWeight: 700 }}>
            ✅ Listo. Ve al feed para ver los tweets generados por Faker.js.
          </p>
        </div>
      )}
    </div>
  );
}