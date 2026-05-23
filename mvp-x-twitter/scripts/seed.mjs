import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'

const supabase = createClient(
  'https://TU_URL.supabase.co',
  'TU_ANON_KEY'
)

async function seed() {
  console.log('Insertando datos de prueba...')

  for (let i = 0; i < 10; i++) {
    const userId = faker.string.uuid()
    const username = faker.internet.username().toLowerCase().replace(/[^a-z0-9_]/g, '_')

    // Insertar perfil
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      username: username,
      full_name: faker.person.fullName(),
      bio: faker.lorem.sentence(),
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    })

    if (profileError) {
      console.error('Error perfil:', profileError.message)
      continue
    }

    // Insertar 3 tweets por usuario
    for (let j = 0; j < 3; j++) {
      const { error: tweetError } = await supabase.from('tweets').insert({
        user_id: userId,
        content: faker.lorem.sentence({ min: 5, max: 30 }),
      })
      if (tweetError) console.error('Error tweet:', tweetError.message)
    }

    console.log(`✅ Usuario ${i + 1}/10 creado: @${username}`)
  }

  console.log('Seed completado.')
}

seed()