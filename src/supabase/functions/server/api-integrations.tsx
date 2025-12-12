import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Utility function to clean strings for headers
function cleanHeaderValue(value: string): string {
  if (!value || typeof value !== 'string') return ''
  
  // Only remove control characters and line breaks, keep all printable characters
  // API keys can contain letters, numbers, hyphens, underscores, and some special chars
  return value
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove only control characters
    .replace(/\s+/g, '') // Remove any whitespace/spaces
    .trim()
}

// Get API Keys from Supabase
async function getApiKeys() {
  const timestamp = Date.now()
  
  try {
    console.log(`🔑 [${timestamp}] Fetching API keys from Supabase...`)
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log(`❌ [${timestamp}] Supabase credentials not available`)
      return { HASDATA_API_KEY: '', OPENAI_API_KEY: '' }
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Fetch HasData key from Supabase KV store
    let rawHasData = ''
    try {
      const { data, error } = await supabase
        .from('kv_store_73685931')
        .select('value')
        .eq('key', 'hasdata_api_key')
        .single()
      
      if (!error && data?.value) {
        rawHasData = data.value
        console.log(`✅ [${timestamp}] HasData key found in database`)
      } else {
        console.log(`⚠️ [${timestamp}] HasData key not found in database`)
      }
    } catch (kvError) {
      console.log(`⚠️ [${timestamp}] Could not fetch HasData key:`, kvError.message)
    }
    
    // Fetch OpenAI key from Supabase KV store
    let rawOpenAI = ''
    try {
      const { data, error } = await supabase
        .from('kv_store_73685931')
        .select('value')
        .eq('key', 'openai_api_key')
        .single()
      
      if (!error && data?.value) {
        rawOpenAI = data.value
        console.log(`✅ [${timestamp}] OpenAI key found in database`)
      } else {
        console.log(`⚠️ [${timestamp}] OpenAI key not found in database`)
      }
    } catch (kvError) {
      console.log(`⚠️ [${timestamp}] Could not fetch OpenAI key:`, kvError.message)
    }
    
    console.log(`🔍 [${timestamp}] Key samples:`, {
      hasData: rawHasData ? `${rawHasData.substring(0, 8)}...${rawHasData.substring(rawHasData.length - 8)}` : 'EMPTY',
      openAI: rawOpenAI ? `${rawOpenAI.substring(0, 8)}...${rawOpenAI.substring(rawOpenAI.length - 8)}` : 'EMPTY'
    })
    
    // Clean the keys
    const keys = {
      HASDATA_API_KEY: cleanHeaderValue(rawHasData),
      OPENAI_API_KEY: cleanHeaderValue(rawOpenAI)
    }
    
    // Validate key formats
    const openAIValid = keys.OPENAI_API_KEY.startsWith('sk-') && keys.OPENAI_API_KEY.length > 20
    const hasDataValid = keys.HASDATA_API_KEY.length > 10
    
    console.log(`🔍 [${timestamp}] Cleaned and validated keys:`, {
      hasData: {
        configured: !!keys.HASDATA_API_KEY,
        length: keys.HASDATA_API_KEY.length,
        valid: hasDataValid,
        source: 'supabase_kv_store',
        sample: keys.HASDATA_API_KEY ? `${keys.HASDATA_API_KEY.substring(0, 8)}...` : 'EMPTY'
      },
      openAI: {
        configured: !!keys.OPENAI_API_KEY,
        length: keys.OPENAI_API_KEY.length,
        valid: openAIValid,
        startsWithSk: keys.OPENAI_API_KEY.startsWith('sk-'),
        source: 'supabase_kv_store',
        sample: keys.OPENAI_API_KEY ? `${keys.OPENAI_API_KEY.substring(0, 8)}...` : 'EMPTY'
      }
    })
    
    if (!openAIValid && keys.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key format appears invalid - should start with "sk-"')
    }
    
    if (!hasDataValid && keys.HASDATA_API_KEY) {
      console.log('⚠️ HasData API key format appears invalid - should be longer')
    }
    
    return keys
  } catch (error) {
    console.log(`❌ [${timestamp}] Error getting API keys:`, error)
    return { HASDATA_API_KEY: '', OPENAI_API_KEY: '' }
  }
}

// Test API connectivity with detailed error reporting
export async function testApiConnectivity() {
  const timestamp = Date.now()
  console.log(`🔍 [${timestamp}] Testing API connectivity...`)
  
  const { HASDATA_API_KEY, OPENAI_API_KEY } = await getApiKeys()
  
  const results = {
    hasData: false,
    openAI: false,
    details: { hasData: '', openAI: '' }
  }

  // Test HasData Direct API
  if (HASDATA_API_KEY) {
    try {
      console.log(`🗺️ [${timestamp}] Testing HasData Direct API...`)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      
      const headers = new Headers()
      headers.set('x-api-key', HASDATA_API_KEY)
      headers.set('Content-Type', 'application/json')
      
      console.log(`📡 [${timestamp}] Making HasData test request...`)
      
      const response = await fetch('https://api.hasdata.com/scrape/google-maps/search?q=restaurante&limit=1', {
        method: 'GET',
        headers: headers,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      console.log(`📡 [${timestamp}] HasData response:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
      
      if (response.status >= 200 && response.status < 500) {
        results.hasData = true
        results.details.hasData = response.ok ? 'Conectado' : `Status ${response.status}`
        console.log(`✅ [${timestamp}] HasData API está operacional`)
        
        // Try to read response for additional debugging
        try {
          const responseText = await response.text()
          console.log(`📊 [${timestamp}] HasData response sample:`, responseText.substring(0, 200))
        } catch (e) {
          console.log(`⚠️ [${timestamp}] Could not read HasData response body`)
        }
      } else {
        results.hasData = false
        results.details.hasData = `Erro ${response.status}`
        console.log(`⚠️ [${timestamp}] HasData API error:`, response.status)
      }
    } catch (error) {
      console.log(`❌ [${timestamp}] HasData API test error:`, {
        name: error.name,
        message: error.message
      })
      
      if (error.name === 'AbortError') {
        results.hasData = false
        results.details.hasData = 'Timeout'
        console.log(`⚠️ [${timestamp}] HasData API timeout`)
      } else {
        results.hasData = false
        results.details.hasData = `Erro: ${error.message}`
        console.log(`⚠️ [${timestamp}] HasData API error:`, error.message)
      }
    }
  } else {
    results.details.hasData = 'Chave não configurada no painel admin'
    console.log(`❌ [${timestamp}] HasData API key not configured`)
  }

  // Test OpenAI API with detailed logging
  if (OPENAI_API_KEY) {
    try {
      console.log(`🤖 [${timestamp}] Testing OpenAI API...`)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      // Use Headers API to ensure proper formatting
      const headers = new Headers()
      headers.set('Authorization', `Bearer ${OPENAI_API_KEY}`)
      headers.set('Content-Type', 'application/json')
      
      console.log(`📡 [${timestamp}] Making OpenAI test request...`)
      
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: headers,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      console.log(`📡 [${timestamp}] OpenAI response:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
      
      if (response.status >= 200 && response.status < 500) {
        results.openAI = true
        results.details.openAI = response.ok ? 'Conectado' : `Pronto (${response.status})`
        console.log(`✅ [${timestamp}] OpenAI API está operacional`)
        
        // Try to read response for additional debugging
        if (response.ok) {
          try {
            const responseData = await response.json()
            console.log(`📊 [${timestamp}] OpenAI models available:`, responseData.data?.length || 0)
          } catch (e) {
            console.log(`⚠️ [${timestamp}] Could not parse OpenAI response`)
          }
        }
      } else {
        results.openAI = false
        results.details.openAI = `Erro do servidor ${response.status}`
        console.log(`⚠️ [${timestamp}] OpenAI API server error:`, response.status)
        
        // Try to get error details
        try {
          const errorData = await response.json()
          console.log(`📊 [${timestamp}] OpenAI error details:`, errorData)
        } catch (e) {
          console.log(`⚠️ [${timestamp}] Could not parse OpenAI error response`)
        }
      }
    } catch (error) {
      console.log(`❌ [${timestamp}] OpenAI API test error:`, {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 200)
      })
      
      if (error.name === 'AbortError') {
        results.openAI = false
        results.details.openAI = 'Timeout'
        console.log(`⚠️ [${timestamp}] OpenAI API timeout`)
      } else {
        results.openAI = false
        results.details.openAI = `Erro: ${error.message}`
        console.log(`⚠️ [${timestamp}] OpenAI API error:`, error.message)
      }
    }
  } else {
    results.details.openAI = 'API key não configurada no painel admin'
    console.log(`❌ [${timestamp}] OpenAI API key not configured in Supabase`)
  }

  console.log(`🔍 [${timestamp}] API connectivity test results:`, results)
  return results
}

// Real OpenAI integration for location generation with enhanced error handling
export async function generateLocationCombinations(nicho: string, cidades: string[], estado: string, bairros?: string) {
  const timestamp = Date.now()
  console.log(`🤖 [${timestamp}] Generating real location combinations with OpenAI...`)
  
  const { OPENAI_API_KEY } = await getApiKeys()
  
  if (!OPENAI_API_KEY) {
    console.log(`❌ [${timestamp}] OpenAI API key not available`)
    throw new Error('Serviço de IA não está disponível. Configure a chave da OpenAI no painel admin.')
  }

  // Validate inputs
  if (!nicho || !Array.isArray(cidades) || cidades.length === 0 || !estado) {
    console.log(`❌ [${timestamp}] Invalid parameters:`, { nicho, cidades, estado })
    throw new Error('Parâmetros inválidos para geração de localizações')
  }

  try {
    const cidadesStr = cidades.slice(0, 5).join(', ') // Limit to prevent overly long prompts
    let prompt = `Você é um especialista em prospecção de empresas no Brasil. Gere um JSON com até 6 combinações de bairros e nichos "${nicho}" distribuídos entre as cidades: ${cidadesStr}, ${estado}. `
    
    if (bairros && bairros.trim()) {
      prompt += `PRIORIZE os bairros mencionados: ${bairros}. `
    } else {
      prompt += `Sugira os MELHORES bairros comerciais para prospecção de ${nicho} em cada cidade. `
    }
    
    prompt += `Considere bairros centrais, comerciais e industriais onde empresas de ${nicho} se concentram.

Retorne APENAS o JSON puro, sem explicações ou formatação markdown:

{
  "locations": [
    { "bairro": "Centro", "nicho": "${nicho}", "cidade": "${cidades[0]}" },
    { "bairro": "Vila Industrial", "nicho": "${nicho}", "cidade": "${cidades[0]}" },
    { "bairro": "Centro", "nicho": "${nicho}", "cidade": "${cidades[1] || cidades[0]}" }
  ]
}`

    // Use Headers API to ensure proper formatting
    const headers = new Headers()
    headers.set('Authorization', `Bearer ${OPENAI_API_KEY}`)
    headers.set('Content-Type', 'application/json')

    console.log(`📡 [${timestamp}] Making OpenAI request for location generation...`)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em marketing B2B e prospecção de empresas no Brasil. Responda sempre em JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      })
    })

    console.log(`📡 [${timestamp}] OpenAI response status:`, response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.log(`❌ [${timestamp}] OpenAI API error:`, response.status, errorData)
      throw new Error(`Erro na API OpenAI: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`)
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content?.trim()
    
    console.log(`🤖 [${timestamp}] OpenAI raw response:`, aiResponse)

    if (!aiResponse) {
      throw new Error('Resposta vazia da OpenAI')
    }

    // Clean the response and extract JSON
    let cleanedResponse = aiResponse
    if (aiResponse.includes('```json')) {
      cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```/g, '')
    }
    
    // Try to extract JSON from the response
    let locationData
    try {
      locationData = JSON.parse(cleanedResponse)
    } catch (parseError) {
      const match = cleanedResponse.match(/\{[\s\S]*"locations"[\s\S]*\}/)
      if (!match) {
        console.log(`⚠️ [${timestamp}] Could not extract JSON from AI response:`, cleanedResponse)
        throw new Error('Resposta JSON inválida da OpenAI')
      }
      locationData = JSON.parse(match[0])
    }
    
    // Validate the response structure
    if (!locationData.locations || !Array.isArray(locationData.locations) || locationData.locations.length === 0) {
      throw new Error('Estrutura de dados de localização inválida da OpenAI')
    }
    
    // Ensure all locations have required fields and clean data
    const validLocations = locationData.locations
      .filter(loc => loc.bairro && loc.cidade && loc.nicho)
      .map(loc => ({
        bairro: String(loc.bairro).trim(),
        cidade: String(loc.cidade).trim(),
        nicho: String(loc.nicho).trim()
      }))
      .slice(0, 6) // Limit to 6 locations max
    
    if (validLocations.length === 0) {
      throw new Error('Nenhuma localização válida retornada da OpenAI')
    }
    
    console.log(`🤖 [${timestamp}] OpenAI gerou ${validLocations.length} localizações válidas`)
    return { locations: validLocations }
    
  } catch (error) {
    console.log(`❌ [${timestamp}] Error calling OpenAI API:`, error.message)
    throw new Error(`Erro na geração de localizações: ${error.message}`)
  }
}

// Real Google Maps scraping via HasData Direct API
export async function scrapeGoogleMaps(query: string, location?: any, nicho?: string, limit: number = 15) {
  const timestamp = Date.now()
  console.log(`🗺️ [${timestamp}] Scraping Google Maps data via HasData for: "${query}" (limit: ${limit})`)
  
  const { HASDATA_API_KEY } = await getApiKeys()
  
  if (!HASDATA_API_KEY) {
    console.log(`❌ [${timestamp}] HasData API key not configured`)
    throw new Error('Serviço de dados não está disponível. Configure a chave da HasData no painel admin.')
  }

  // Validate and clean query
  if (!query || typeof query !== 'string') {
    console.log(`❌ [${timestamp}] Invalid query:`, query)
    throw new Error('Query inválida para busca')
  }

  try {
    // Clean query and encode properly
    const cleanQuery = query.replace(/[^\w\s\-.,áéíóúâêîôûàèìòùãõçÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]/g, ' ').trim()
    const encodedQuery = encodeURIComponent(cleanQuery)
    const clampedLimit = Math.min(Math.max(1, limit), 50)

    console.log(`🔍 [${timestamp}] Clean query: "${cleanQuery}", encoded: "${encodedQuery}", limit: ${clampedLimit}`)
    console.log(`🔑 [${timestamp}] Using HasData API key: ${HASDATA_API_KEY.substring(0, 10)}...`)

    // HasData Direct API call
    const hasdataUrl = `https://api.hasdata.com/scrape/google-maps/search?q=${encodedQuery}&limit=${clampedLimit}`
    console.log(`📡 [${timestamp}] HasData URL: ${hasdataUrl}`)
    
    const headers = new Headers()
    headers.set('x-api-key', HASDATA_API_KEY)
    headers.set('Content-Type', 'application/json')

    const response = await fetch(hasdataUrl, {
      method: 'GET',
      headers: headers
    })

    console.log(`📡 [${timestamp}] HasData response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error(`❌ [${timestamp}] HasData API error:`, {
        status: response.status,
        statusText: response.statusText,
        response: errorText.substring(0, 500)
      })
      
      // Provide specific error messages
      if (response.status === 401 || response.status === 403) {
        throw new Error('Chave de API inválida. Verifique a configuração no painel admin.')
      } else if (response.status === 429) {
        throw new Error('Limite de requisições atingido. Aguarde alguns minutos e tente novamente.')
      } else if (response.status === 404) {
        throw new Error('Endpoint da API não encontrado. Verifique a configuração da HasData.')
      } else {
        throw new Error(`Erro ao buscar dados: HTTP ${response.status}. Tente novamente ou contate o suporte.`)
      }
    }

    const data = await response.json()
    const results = data.localResults || data.results || data.data || []
    
    console.log(`✅ [${timestamp}] HasData API success: ${results.length} resultados encontrados`)
    
    if (results.length === 0) {
      console.log(`⚠️ [${timestamp}] Nenhum resultado encontrado para: "${cleanQuery}"`)
      return { localResults: [] }
    }
    
    // Map results to standard format
    const mappedResults = results.map((item: any) => ({
      title: item.title?.trim() || item.name?.trim() || '',
      phone: item.phone?.replace(/[^0-9]+/g, '') || '',
      address: item.address?.trim() || '',
      website: item.website?.trim() || '',
      email: item.email?.trim() || '',
      rating: item.rating || '',
      reviews: item.reviews || '',
      type: item.type?.trim() || item.category?.trim() || ''
    }))
    
    console.log(`✅ [${timestamp}] Mapped ${mappedResults.length} results successfully`)
    
    return { localResults: mappedResults }
    
  } catch (error) {
    console.log(`❌ [${timestamp}] Error in scrapeGoogleMaps:`, error.message)
    throw error
  }
}

// Clean and enrich prospect data
export function cleanProspectData(rawData: any) {
  if (!rawData || typeof rawData !== 'object') {
    return null
  }

  // Clean phone number
  let phone = ''
  if (rawData.phone && typeof rawData.phone === 'string') {
    phone = rawData.phone.replace(/[^\d]/g, '')
    // Ensure Brazilian phone format
    if (phone.length === 10) {
      phone = '55' + phone // Add country code if missing
    } else if (phone.length === 11 && !phone.startsWith('55')) {
      phone = '55' + phone // Add country code if missing
    }
  }
  
  // Clean website URL
  let website = ''
  if (rawData.website && typeof rawData.website === 'string') {
    website = rawData.website.trim()
    if (website && !website.startsWith('http')) {
      website = 'https://' + website
    }
  }
  
  // Generate business email from website
  let email = ''
  if (website) {
    try {
      let domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim()
      if (domain && domain.length >= 3) {
        email = `contato@${domain}`
      }
    } catch (error) {
      // Ignore email generation errors
    }
  }
  
  return {
    Empresa: (rawData.title && typeof rawData.title === 'string') ? rawData.title.trim() : '',
    Telefone: phone,
    Endereco: (rawData.address && typeof rawData.address === 'string') ? rawData.address.trim() : '',
    Website: website,
    Email: email,
    Categoria: (rawData.type && typeof rawData.type === 'string') ? rawData.type.trim() : (rawData.category && typeof rawData.category === 'string') ? rawData.category.trim() : '',
    Avaliacao: rawData.rating ? String(rawData.rating) : '',
    'Total Avaliacoes': rawData.reviews ? String(rawData.reviews) : rawData.reviewsCount ? String(rawData.reviewsCount) : ''
  }
}

// Check API status
export async function getApiStatus() {
  const timestamp = Date.now()
  console.log(`🔍 [${timestamp}] Getting API status from Supabase...`)
  
  const { HASDATA_API_KEY, OPENAI_API_KEY } = await getApiKeys()
  const apiTest = await testApiConnectivity()
  
  const status = {
    hasHasDataKey: !!HASDATA_API_KEY,
    hasOpenAIKey: !!OPENAI_API_KEY,
    hasDataConnected: apiTest.hasData,
    openAIConnected: apiTest.openAI,
    details: apiTest.details,
    mode: (apiTest.hasData && apiTest.openAI) ? 'production' : 'requires_configuration',
    ready: apiTest.hasData && apiTest.openAI,
    timestamp: new Date().toISOString(),
    source: 'supabase_database'
  }
  
  console.log(`🔍 [${timestamp}] Final API status:`, status)
  return status
}

// Validate API keys
export async function validateApiKeys() {
  const status = await getApiStatus()
  return {
    hasDataConnected: status.hasDataConnected,
    openAIConnected: status.openAIConnected
  }
}

// Business search function
export async function searchBusinessesWithHasData(params: {
  businessNiche: string
  state: string
  cities: string[]
  neighborhoods?: string
  maxResults?: number
}) {
  const timestamp = Date.now()
  console.log(`🔍 [${timestamp}] Searching businesses with HasData API (from Supabase config)...`)
  
  const { businessNiche, state, cities, neighborhoods, maxResults = 30 } = params
  
  if (!businessNiche || !state || !cities || cities.length === 0) {
    throw new Error('Parâmetros obrigatórios não fornecidos')
  }

  try {
    // Create search queries for each city
    const searchPromises = cities.slice(0, 2).map(async (city, index) => {
      let query = `${businessNiche} ${city} ${state}`
      if (neighborhoods?.trim()) {
        const bairrosList = neighborhoods.split(',').map(b => b.trim()).slice(0, 1)
        query += ` ${bairrosList.join(' ')}`
      }

      console.log(`🔍 [${timestamp}] Search ${index + 1}: "${query}"`)
      
      // Add delay between requests to respect rate limits
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * index))
      }
      
      return scrapeGoogleMaps(query, null, businessNiche, Math.floor(maxResults / cities.length))
    })

    const results = await Promise.all(searchPromises)
    
    // Combine and deduplicate results
    const allResults = results.flatMap(r => r.localResults || [])
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.title, item])).values()
    ).slice(0, maxResults)
    
    console.log(`✅ [${timestamp}] Total results: ${uniqueResults.length}`)
    
    return uniqueResults
    
  } catch (error) {
    console.log(`❌ [${timestamp}] Error searching businesses:`, error.message)
    throw error
  }
}