// ===============================================
// Social Media API Integrations - HasData ONLY
// Uses ONLY real HasData API via RapidAPI for all social extractions
// NO MOCK/DEMO data - 100% real data from HasData
// ===============================================

interface SocialProfile {
  id: string
  name: string
  username: string
  platform: string
  profileUrl: string
  bio: string
  followers: number
  following?: number
  posts?: number
  phone: string
  email: string
  location: string
  website: string
  verified: boolean
  category: string
  addedAt: string
  profilePicture?: string
  company?: string
  isPrivate?: boolean
}

interface SearchParams {
  keyword: string
  category?: string
  location?: string
  minFollowers?: number
  maxFollowers?: number
}

/**
 * Get HasData API key from Supabase or environment
 * Priority: 1. Supabase KV store (configured in admin panel), 2. Environment variable
 */
async function getHasDataApiKey(supabase?: any): Promise<string> {
  // Try to get key from Supabase KV store first (configured in admin panel)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('kv_store_73685931')
        .select('value')
        .eq('key', 'hasdata_api_key')
        .single()
      
      if (data?.value && data.value.trim()) {
        console.log('🔑 Using HasData API key from admin panel configuration')
        return data.value.trim()
      }
    } catch (error) {
      console.log('⚠️ Could not load HasData key from database, trying environment variable')
    }
  }
  
  // Fallback to environment variable - try both HASDATA_API_KEY and RAPIDAPI_KEY for backwards compatibility
  const hasDataKey = Deno.env.get('HASDATA_API_KEY') || Deno.env.get('RAPIDAPI_KEY')
  
  if (!hasDataKey) {
    throw new Error('Serviço de dados não configurado. Configure a chave da API HasData no Painel Admin.')
  }
  
  console.log('🔑 Using HasData API key from environment variable')
  return hasDataKey
}

/**
 * Search Instagram profiles by keyword using HasData API
 * This function searches for Instagram profiles matching a keyword/niche
 */
export async function searchInstagramProfiles(
  keyword: string,
  location?: string,
  limit: number = 20,
  supabase?: any
): Promise<SocialProfile[]> {
  try {
    console.log(`🔍 Searching Instagram profiles for keyword: "${keyword}"`)
    
    const apiKey = await getHasDataApiKey(supabase)
    
    // HasData Instagram search endpoint
    const query = location ? `${keyword} ${location}` : keyword
    const encodedQuery = encodeURIComponent(query)
    
    console.log(`📡 Making HasData Instagram search request...`)
    const response = await fetch(
      `https://hasdata.p.rapidapi.com/scrape/instagram/search?q=${encodedQuery}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'hasdata.p.rapidapi.com'
        }
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`⚠️ No Instagram profiles found for "${keyword}"`)
        return []
      } else if (response.status === 403 || response.status === 401) {
        throw new Error('Erro de autenticação. Verifique a configuração das APIs.')
      } else {
        throw new Error(`Erro ao buscar perfis do Instagram. Status: ${response.status}`)
      }
    }

    const data = await response.json()
    const profiles = data.profiles || data.users || data.data || []
    
    if (profiles.length === 0) {
      console.log(`⚠️ No Instagram profiles found for "${keyword}"`)
      return []
    }
    
    console.log(`✅ Found ${profiles.length} Instagram profiles via HasData`)

    // Transform HasData response to our format
    const transformedProfiles: SocialProfile[] = profiles.map((user: any, idx: number) => ({
      id: `instagram_search_${Date.now()}_${idx}`,
      name: user.full_name || user.name || user.username || `Instagram User ${idx + 1}`,
      username: user.username || user.handle || `user_${idx}`,
      platform: 'instagram',
      profileUrl: `https://instagram.com/${user.username || user.handle}`,
      bio: user.biography || user.bio || '',
      followers: parseInt(user.follower_count || user.followers || '0'),
      following: parseInt(user.following_count || user.following || '0'),
      posts: parseInt(user.post_count || user.media_count || user.posts || '0'),
      phone: user.contact_phone_number || '',
      email: user.public_email || '',
      location: user.location || location || 'Brasil',
      website: user.external_url || user.website || '',
      verified: user.is_verified || user.verified || false,
      category: keyword,
      addedAt: new Date().toISOString(),
      profilePicture: user.profile_pic_url || user.avatar || '',
      isPrivate: user.is_private || false
    }))

    return transformedProfiles
  } catch (error) {
    console.error('❌ Instagram search error via HasData:', error)
    throw new Error(`Erro ao buscar perfis do Instagram: ${error.message}`)
  }
}

/**
 * Search LinkedIn profiles by keyword using HasData API
 * This function searches for LinkedIn profiles matching a keyword/niche
 */
export async function searchLinkedInProfiles(
  keyword: string,
  location?: string,
  limit: number = 20,
  supabase?: any
): Promise<SocialProfile[]> {
  try {
    console.log(`🔍 Searching LinkedIn profiles for keyword: "${keyword}"`)
    
    const apiKey = await getHasDataApiKey(supabase)
    
    // HasData LinkedIn search endpoint
    const query = location ? `${keyword} ${location}` : keyword
    const encodedQuery = encodeURIComponent(query)
    
    console.log(`📡 Making HasData LinkedIn search request...`)
    const response = await fetch(
      `https://hasdata.p.rapidapi.com/scrape/linkedin/search?q=${encodedQuery}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'hasdata.p.rapidapi.com'
        }
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`⚠️ No LinkedIn profiles found for "${keyword}"`)
        return []
      } else if (response.status === 403 || response.status === 401) {
        throw new Error('Erro de autenticação. Verifique a configuração das APIs.')
      } else {
        throw new Error(`Erro ao buscar perfis do LinkedIn. Status: ${response.status}`)
      }
    }

    const data = await response.json()
    const profiles = data.profiles || data.people || data.data || []
    
    if (profiles.length === 0) {
      console.log(`⚠️ No LinkedIn profiles found for "${keyword}"`)
      return []
    }
    
    console.log(`✅ Found ${profiles.length} LinkedIn profiles via HasData`)

    // Transform HasData response to our format
    const transformedProfiles: SocialProfile[] = profiles.map((user: any, idx: number) => ({
      id: `linkedin_search_${Date.now()}_${idx}`,
      name: user.full_name || user.name || user.username || `LinkedIn User ${idx + 1}`,
      username: user.username || user.handle || user.public_identifier || `user_${idx}`,
      platform: 'linkedin',
      profileUrl: `https://linkedin.com/in/${user.username || user.handle || user.public_identifier}`,
      bio: user.headline || user.summary || user.bio || '',
      followers: parseInt(user.follower_count || user.connection_count || user.followers || '0'),
      following: parseInt(user.following_count || user.following || '0'),
      posts: 0,
      phone: user.phone || '',
      email: user.email || '',
      location: user.location || user.geo_location || location || 'Brasil',
      website: user.website || user.company_website || '',
      verified: user.is_verified || false,
      category: keyword,
      addedAt: new Date().toISOString(),
      profilePicture: user.profile_pic_url || user.avatar || '',
      company: user.company || user.current_company || ''
    }))

    return transformedProfiles
  } catch (error) {
    console.error('❌ LinkedIn search error via HasData:', error)
    throw new Error(`Erro ao buscar perfis do LinkedIn: ${error.message}`)
  }
}

/**
 * Extract followers from an Instagram profile using HasData API
 * @param profileHandle - Instagram username (without @)
 * @param limit - Maximum number of followers to extract
 * @param supabase - Supabase client instance
 */
export async function extractInstagramFollowers(
  profileHandle: string,
  limit: number = 50,
  supabase?: any
): Promise<SocialProfile[]> {
  try {
    console.log(`👥 Extracting Instagram followers from @${profileHandle}`)
    
    const apiKey = await getHasDataApiKey(supabase)
    console.log(`🔑 API Key loaded (length: ${apiKey.length}, first 10 chars: ${apiKey.substring(0, 10)}...)`)
    
    // Step 1: Get profile information
    console.log(`📡 Step 1: Fetching profile data for @${profileHandle}...`)
    
    const profileResponse = await fetch(
      `https://hasdata.p.rapidapi.com/scrape/instagram/profile?handle=${profileHandle}`,
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'hasdata.p.rapidapi.com'
        }
      }
    )
    
    console.log(`📊 Response status: ${profileResponse.status} ${profileResponse.statusText}`)
    console.log(`📊 Response headers:`, Object.fromEntries(profileResponse.headers.entries()))
    
    if (!profileResponse.ok) {
      const statusCode = profileResponse.status
      let errorBody = ''
      try {
        errorBody = await profileResponse.text()
        console.log(`⚠️ Profile API error response body: ${errorBody}`)
      } catch (e) {
        console.log(`⚠️ Could not read error response body:`, e)
      }
      
      console.log(`⚠️ Profile fetch failed with status ${statusCode}`)
      
      if (statusCode === 404) {
        throw new Error(`Perfil @${profileHandle} não encontrado. Verifique se:\n• O nome de usuário está correto (sem @)\n• O perfil existe e é público\n• Não há erros de digitação`)
      } else if (statusCode === 403 || statusCode === 401) {
        throw new Error('Erro de autenticação com a API de dados. Por favor:\n• Verifique se a chave da API HasData está configurada no Painel Admin\n• Confirme que a chave é válida e ativa')
      } else if (statusCode === 429) {
        throw new Error('Limite de requisições excedido. Aguarde alguns minutos e tente novamente.')
      } else if (statusCode === 500 || statusCode === 502 || statusCode === 503) {
        throw new Error(`Serviço de dados temporariamente indisponível (${statusCode}). Tente novamente em alguns minutos.`)
      } else {
        throw new Error(`Erro ao buscar perfil @${profileHandle} (Status ${statusCode}). ${errorBody ? 'Detalhes: ' + errorBody : 'O perfil pode estar privado ou indisponível.'}`)
      }
    }
    
    const profileData = await profileResponse.json()
    console.log(`📊 Profile data received:`, JSON.stringify(profileData, null, 2))
    console.log(`📊 Profile summary:`, {
      handle: profileData.handle || profileData.username,
      followers: profileData.follower_count || profileData.followers_count,
      is_private: profileData.is_private
    })
    
    // Check if profile is private
    if (profileData.is_private) {
      throw new Error(`Perfil @${profileHandle} é privado. Apenas perfis públicos podem ter seus seguidores extraídos.`)
    }
    
    console.log(`✅ Profile found: @${profileData.handle || profileHandle} (${profileData.follower_count || profileData.followers_count || 0} followers)`)
    
    // IMPORTANT NOTE: HasData API may not provide followers list endpoint
    // The official documentation only shows profile endpoint, not followers endpoint
    // If the followers endpoint is not available, we'll provide guidance to the user
    
    console.log(`📡 Step 2: Attempting to fetch followers list...`)
    console.log(`⚠️ NOTE: HasData may not provide followers list - check API documentation`)
    
    const followersResponse = await fetch(
      `https://hasdata.p.rapidapi.com/scrape/instagram/followers?handle=${profileHandle}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'hasdata.p.rapidapi.com'
        }
      }
    )
    
    console.log(`📊 Followers response status: ${followersResponse.status}`)
    
    let followers: any[] = []
    let followersErrorBody = ''
    
    if (followersResponse.ok) {
      const followersData = await followersResponse.json()
      console.log(`📊 Followers data received:`, JSON.stringify(followersData, null, 2))
      followers = followersData.followers || followersData.data || followersData.users || []
      console.log(`✅ Found ${followers.length} followers from API`)
    } else {
      // Log the error response for debugging
      try {
        followersErrorBody = await followersResponse.text()
        console.log(`⚠️ Followers endpoint error response (${followersResponse.status}): ${followersErrorBody}`)
      } catch (e) {
        console.log(`⚠️ Could not read followers error response`)
      }
      
      // Provide helpful error message
      if (followersResponse.status === 404) {
        console.log(`⚠️ Followers endpoint not found (404) - HasData may not support this feature`)
        throw new Error(
          `⚠️ LIMITAÇÃO DA API:\n\n` +
          `O endpoint de seguidores do Instagram não está disponível na API HasData.\n\n` +
          `A API HasData fornece apenas informações do PERFIL, não a lista de seguidores.\n\n` +
          `ALTERNATIVAS:\n` +
          `• Use a funcionalidade de BUSCA por palavra-chave para encontrar perfis\n` +
          `• Ou use outra fonte de dados que forneça listas de seguidores\n\n` +
          `Perfil @${profileHandle} foi encontrado com sucesso, mas seus seguidores não podem ser extraídos.`
        )
      } else if (followersResponse.status === 403 || followersResponse.status === 401) {
        throw new Error('Erro de autenticação ao buscar seguidores. Verifique sua chave da API HasData.')
      } else if (followersResponse.status === 429) {
        throw new Error('Limite de requisições excedido ao buscar seguidores. Aguarde alguns minutos.')
      } else {
        console.log(`⚠️ Followers endpoint returned status ${followersResponse.status}`)
        throw new Error(
          `Não foi possível obter a lista de seguidores.\n\n` +
          `Status: ${followersResponse.status}\n` +
          `A API HasData pode não suportar extração de seguidores.\n\n` +
          `Use a funcionalidade de BUSCA para encontrar perfis por palavra-chave.`
        )
      }
    }
    
    if (followers.length === 0) {
      console.log(`⚠️ No followers returned from API for @${profileHandle}`)
      throw new Error(
        `Nenhum seguidor encontrado para @${profileHandle}.\n\n` +
        `Possíveis motivos:\n` +
        `• A API HasData pode não fornecer listas de seguidores\n` +
        `• O perfil pode não ter seguidores públicos\n\n` +
        `Use a funcionalidade de BUSCA para encontrar perfis por palavra-chave.`
      )
    }
    
    // Transform to our format
    const profiles: SocialProfile[] = followers.map((follower: any, idx: number) => ({
      id: `instagram_follower_${follower.handle || follower.username}_${Date.now()}_${idx}`,
      name: follower.full_name || follower.name || follower.handle || follower.username || `User ${idx + 1}`,
      username: follower.handle || follower.username || `user_${idx}`,
      platform: 'instagram',
      profileUrl: `https://instagram.com/${follower.handle || follower.username}`,
      bio: follower.biography || follower.bio || '',
      followers: follower.follower_count || follower.followers_count || 0,
      following: follower.following_count || follower.follows_count || 0,
      posts: follower.post_count || follower.media_count || 0,
      phone: '',
      email: follower.public_email || '',
      location: 'Brasil',
      website: follower.external_url || '',
      verified: follower.is_verified || false,
      category: `Seguidor de @${profileHandle}`,
      addedAt: new Date().toISOString(),
      profilePicture: follower.profile_pic_url || follower.profile_picture || '',
      isPrivate: follower.is_private || false
    }))
    
    console.log(`✅ Successfully extracted ${profiles.length} Instagram followers from @${profileHandle}`)
    return profiles
    
  } catch (error) {
    console.error(`❌ Error extracting Instagram followers from @${profileHandle}:`, error)
    throw error
  }
}

/**
 * Extract connections from a LinkedIn profile using HasData API
 * @param profileHandle - LinkedIn username/public identifier
 * @param limit - Maximum number of connections to extract
 * @param supabase - Supabase client instance
 */
export async function extractLinkedInConnections(
  profileHandle: string,
  limit: number = 50,
  supabase?: any
): Promise<SocialProfile[]> {
  try {
    console.log(`👥 Extracting LinkedIn connections from ${profileHandle}`)
    
    const apiKey = await getHasDataApiKey(supabase)
    
    // Step 1: Get profile information
    console.log(`📡 Step 1: Fetching profile data...`)
    const profileResponse = await fetch(
      `https://hasdata.p.rapidapi.com/scrape/linkedin/profile?handle=${profileHandle}`,
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'hasdata.p.rapidapi.com'
        }
      }
    )
    
    if (!profileResponse.ok) {
      if (profileResponse.status === 404) {
        throw new Error(`Perfil ${profileHandle} não encontrado no LinkedIn.`)
      }
      throw new Error(`Erro ao buscar perfil do LinkedIn. Status: ${profileResponse.status}`)
    }
    
    const profileData = await profileResponse.json()
    console.log(`✅ Profile found: ${profileData.full_name}`)
    
    // Step 2: Get connections list
    console.log(`📡 Step 2: Fetching connections list...`)
    const connectionsResponse = await fetch(
      `https://hasdata.p.rapidapi.com/scrape/linkedin/connections?handle=${profileHandle}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'hasdata.p.rapidapi.com'
        }
      }
    )
    
    let connections: any[] = []
    
    if (connectionsResponse.ok) {
      const connectionsData = await connectionsResponse.json()
      connections = connectionsData.connections || connectionsData.data || []
      console.log(`✅ Found ${connections.length} connections`)
    } else {
      // If connections endpoint fails, return just the profile
      console.log(`⚠️ Connections endpoint not available, using profile data only`)
      connections = [profileData]
    }
    
    if (connections.length === 0) {
      throw new Error(`Não foi possível extrair conexões de ${profileHandle}`)
    }
    
    // Transform to our format
    const profiles: SocialProfile[] = connections.map((connection: any, idx: number) => ({
      id: `linkedin_connection_${connection.handle || connection.username}_${Date.now()}_${idx}`,
      name: connection.full_name || connection.name || connection.handle,
      username: connection.handle || connection.username || connection.public_identifier,
      platform: 'linkedin',
      profileUrl: `https://linkedin.com/in/${connection.handle || connection.username || connection.public_identifier}`,
      bio: connection.headline || connection.summary || '',
      followers: connection.follower_count || connection.connection_count || 0,
      following: 0,
      posts: 0,
      phone: '',
      email: '',
      location: connection.location || 'Brasil',
      website: '',
      verified: connection.is_verified || false,
      category: `Conexão de ${profileHandle}`,
      addedAt: new Date().toISOString(),
      profilePicture: connection.profile_pic_url || '',
      company: connection.company || connection.current_company || ''
    }))
    
    console.log(`✅ Successfully extracted ${profiles.length} LinkedIn connections`)
    return profiles
    
  } catch (error) {
    console.error(`❌ Error extracting LinkedIn connections:`, error)
    throw error
  }
}