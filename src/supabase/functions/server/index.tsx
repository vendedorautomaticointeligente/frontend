import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { extractB2CProfiles } from './b2c_extraction.tsx'
import { scrapeGoogleMaps, cleanProspectData } from './api-integrations.tsx'

console.log("🚀 VAI Server v6.0 - Sistema de Dados Reais - Configuração via Painel Admin")

// OPTIMIZED: Generate business email without CPU-intensive website fetching
function generateBusinessEmail(website: string, companyName: string): string {
  if (!website) {
    return ''
  }

  try {
    // Extract domain from website
    let domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim()
    
    if (!domain || domain.length < 3) {
      return ''
    }

    // Return standard business email format
    return `contato@${domain}`
  } catch (error) {
    return ''
  }
}

serve(async (req: Request) => {
  // CRITICAL: Add timeout protection to prevent WORKER_LIMIT errors
  const startTime = Date.now()
  
  const url = new URL(req.url)
  const { pathname } = url
  const method = req.method

  // OPTIMIZED: Minimal logging
  console.log(`🌐 ${method} ${pathname} [${Date.now() - startTime}ms]`)

  // Enhanced CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info, x-requested-with, x-supabase-api-version',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true'
  }

  // Handle preflight requests
  if (method === 'OPTIONS') {
    console.log("✅ CORS preflight handled")
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    })
  }

  // Helper to create JSON response
  const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      }
    })
  }

  // Helper to get authenticated user ID
  const getAuthenticatedUserId = async (authHeader: string | null, supabase: any) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("❌ No valid auth header found")
      console.log("   Auth header value:", authHeader)
      throw new Error('Authorization required')
    }
    
    const token = authHeader.replace('Bearer ', '')
    if (!token || token.length < 20) {
      console.log("❌ Token too short or missing")
      console.log("   Token length:", token?.length)
      throw new Error('Invalid token format')
    }

    // Check if it's the anon key - if so, use a default user
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    // Hardcoded anon key as fallback (from info.tsx)
    const hardcodedAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5d3lmYW1ocHp0dXN0ZXV4c2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MjIzMjQsImV4cCI6MjA3NjI5ODMyNH0.es5W0y3UIpmcCua9xugt0_tUVuty7Hek7NFKbxJuN80"
    const effectiveAnonKey = anonKey || hardcodedAnonKey
    
    // OPTIMIZED: Reduced logging for performance
    console.log("🔑 Auth check:", token === effectiveAnonKey ? "anon key" : "user token")
    
    if (token === effectiveAnonKey) {
      console.log("✅ Using anon key - allowing access with default user")
      // Return a default user ID (will be the admin)
      return 'default_user'
    }

    // Verify token with Supabase Auth if available
    if (supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (error || !user) {
          console.error("❌ Token verification failed:", error?.message)
          // If token verification fails but we have supabase, still allow with anon key fallback
          if (token === effectiveAnonKey) {
            console.log("✅ Token verification failed but using anon key - allowing access")
            return 'default_user'
          }
          throw new Error('Invalid or expired token')
        }
        console.log("✅ Token verified for user:", user.id)
        return user.id
      } catch (error) {
        console.error("❌ Token verification exception:", error)
        // Last resort - if it looks like anon key, allow it
        if (token === effectiveAnonKey) {
          console.log("✅ Exception but using anon key - allowing access")
          return 'default_user'
        }
        throw new Error('Invalid or expired token')
      }
    } else {
      console.log("⚠️ No supabase client - using fallback authentication")
      // Fallback for development
      return 'user_authenticated'
    }
  }

  // Remove the /make-server-73685931 prefix from path FIRST
  const cleanPath = pathname.replace('/make-server-73685931', '') || '/'
  
  // === PUBLIC ENDPOINTS - Handle these FIRST before any auth ===
  
  // Health check - ALWAYS respond, no auth required
  if (cleanPath === '/ping' || cleanPath === '/') {
    console.log("📍 Ping endpoint accessed - responding without auth check")
    return jsonResponse({
      status: 'online',
      timestamp: new Date().toISOString(),
      server: 'VAI Server',
      version: '6.0.0',
      message: 'Sistema VAI com dados reais e atualizados',
      environment: {
        path: cleanPath,
        originalPath: pathname
      }
    })
  }

  // Test RapidAPI - DEBUG endpoint
  if (cleanPath === '/test-hasdata') {
    console.log("🧪 Testing RapidAPI connection with fallback...")
    try {
      // Get API key from Supabase (configured in Admin Panel)
      let rapidApiKey = ''
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        try {
          const { data, error } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', 'hasdata_api_key')
            .single()
          
          if (!error && data?.value) {
            rapidApiKey = data.value.trim()
            console.log("✅ RapidAPI key loaded from database")
          }
        } catch (kvError) {
          console.log("⚠️ Error loading RapidAPI key:", kvError.message)
        }
      }
      
      if (!rapidApiKey) {
        return jsonResponse({
          error: 'Chave de acesso não configurada',
          hasKey: false,
          hint: 'Configure as credenciais de acesso no painel administrativo'
        }, 500)
      }

      const testQuery = 'restaurante'
      let testResult = null
      
      // Try Google Maps Search first
      try {
        const gmapsUrl = `https://google-maps-search.p.rapidapi.com/mapsearch?query=${testQuery}&limit=1`
        console.log(`🧪 [TRY 1] Testing Google Maps Search: ${gmapsUrl}`)
        
        const response = await fetch(gmapsUrl, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': 'google-maps-search.p.rapidapi.com'
          }
        })

        console.log(`🧪 [TRY 1] Response status: ${response.status}`)

        if (response.ok) {
          const data = await response.json()
          testResult = {
            test: 'RapidAPI Connection Test - Google Maps Search',
            apiType: 'Google Maps Search via RapidAPI',
            query: testQuery,
            url: gmapsUrl,
            hasApiKey: true,
            apiKeyPreview: rapidApiKey.substring(0, 15) + '...',
            response: {
              status: response.status,
              statusText: response.statusText,
              dataCount: (data.results || data.data || []).length,
              success: true
            }
          }
        }
      } catch (err) {
        console.log(`🧪 [TRY 1] Failed: ${err.message}`)
      }
      
      // If first failed, try Google Business Search
      if (!testResult) {
        try {
          const gbsUrl = `https://google-business-search.p.rapidapi.com/search?query=${testQuery}&limit=1&language=pt&region=br`
          console.log(`🧪 [TRY 2] Testing Google Business Search: ${gbsUrl}`)
          
          const response = await fetch(gbsUrl, {
            method: 'GET',
            headers: {
              'X-RapidAPI-Key': rapidApiKey,
              'X-RapidAPI-Host': 'google-business-search.p.rapidapi.com'
            }
          })

          console.log(`🧪 [TRY 2] Response status: ${response.status}`)

          if (response.ok) {
            const data = await response.json()
            testResult = {
              test: 'RapidAPI Connection Test - Google Business Search',
              apiType: 'Google Business Search via RapidAPI',
              query: testQuery,
              url: gbsUrl,
              hasApiKey: true,
              apiKeyPreview: rapidApiKey.substring(0, 15) + '...',
              response: {
                status: response.status,
                statusText: response.statusText,
                dataCount: (data.results || data.data || []).length,
                success: true
              }
            }
          }
        } catch (err) {
          console.log(`🧪 [TRY 2] Failed: ${err.message}`)
        }
      }
      
      // If second failed, try Maps Data Scraper
      if (!testResult) {
        try {
          const mapsUrl = `https://maps-data-scraper.p.rapidapi.com/search?query=${testQuery}&limit=1`
          console.log(`🧪 [TRY 3] Testing Maps Data Scraper: ${mapsUrl}`)
          
          const response = await fetch(mapsUrl, {
            method: 'GET',
            headers: {
              'X-RapidAPI-Key': rapidApiKey,
              'X-RapidAPI-Host': 'maps-data-scraper.p.rapidapi.com'
            }
          })

          console.log(`🧪 [TRY 3] Response status: ${response.status}`)

          if (response.ok) {
            const data = await response.json()
            testResult = {
              test: 'RapidAPI Connection Test - Maps Data Scraper',
              apiType: 'Maps Data Scraper via RapidAPI',
              query: testQuery,
              url: mapsUrl,
              hasApiKey: true,
              apiKeyPreview: rapidApiKey.substring(0, 15) + '...',
              response: {
                status: response.status,
                statusText: response.statusText,
                dataCount: (data.results || data.data || []).length,
                success: true
              }
            }
          }
        } catch (err) {
          console.log(`🧪 [TRY 3] Failed: ${err.message}`)
        }
      }
      
      if (testResult) {
        return jsonResponse(testResult)
      } else {
        return jsonResponse({
          error: 'Não foi possível conectar aos serviços de dados',
          hint: 'Verifique se as credenciais estão configuradas corretamente no painel administrativo',
          suggestion: 'Entre em contato com o suporte se o problema persistir'
        }, 500)
      }
    } catch (error) {
      console.error('🧪 Test error:', error)
      return jsonResponse({
        error: 'Teste falhou',
        message: error.message,
        stack: error.stack
      }, 500)
    }
  }

  // Test HasData DIRECT API ONLY (not via RapidAPI)
  if (cleanPath === '/test-hasdata-direct') {
    console.log("🧪 Testing HasData DIRECT API (not RapidAPI)...")
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      let hasdataKey = ''
      
      // Get HasData key from database
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        try {
          const { data } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', 'hasdata_api_key')
            .single()
          
          if (data?.value) {
            hasdataKey = data.value.trim()
          }
        } catch (e) {
          console.log("⚠️ Could not load key from database")
        }
      }
      
      if (!hasdataKey) {
        return jsonResponse({
          error: 'Chave HasData não configurada',
          solution: 'Configure no Painel Admin',
          hasKey: false
        }, 500)
      }
      
      console.log(`🔑 Testing with HasData key: ${hasdataKey.substring(0, 10)}...`)
      
      // Test different possible URLs and headers
      const testCases = [
        {
          name: 'HasData Direct API (atual no código)',
          url: 'https://api.hasdata.com/scrape/google-maps/search?q=restaurante&limit=1',
          headers: {
            'x-api-key': hasdataKey,
            'Content-Type': 'application/json'
          }
        },
        {
          name: 'HasData Direct API v1',
          url: 'https://api.hasdata.com/v1/scrape/google-maps/search?q=restaurante&limit=1',
          headers: {
            'x-api-key': hasdataKey,
            'Content-Type': 'application/json'
          }
        },
        {
          name: 'HasData via RapidAPI',
          url: 'https://hasdata.p.rapidapi.com/scrape/google-maps/search?q=restaurante&limit=1',
          headers: {
            'X-RapidAPI-Key': hasdataKey,
            'X-RapidAPI-Host': 'hasdata.p.rapidapi.com'
          }
        },
        {
          name: 'HasData Direct com Authorization Bearer',
          url: 'https://api.hasdata.com/scrape/google-maps/search?q=restaurante&limit=1',
          headers: {
            'Authorization': `Bearer ${hasdataKey}`,
            'Content-Type': 'application/json'
          }
        }
      ]
      
      const results = []
      
      for (const testCase of testCases) {
        console.log(`\n📡 Testing: ${testCase.name}`)
        console.log(`   URL: ${testCase.url}`)
        
        try {
          const response = await fetch(testCase.url, {
            method: 'GET',
            headers: testCase.headers,
            signal: AbortSignal.timeout(10000)
          })
          
          const responseText = await response.text().catch(() => '')
          let responseData = null
          try {
            responseData = JSON.parse(responseText)
          } catch {
            responseData = responseText.substring(0, 500)
          }
          
          let diagnosis = ''
          if (response.status === 200) {
            diagnosis = '✅ SUCESSO - Esta é a configuração correta!'
          } else if (response.status === 401 || response.status === 403) {
            diagnosis = '❌ Chave inválida ou formato de autenticação incorreto'
          } else if (response.status === 404) {
            diagnosis = '❌ URL não encontrada - esta não é a URL correta'
          } else if (response.status === 429) {
            diagnosis = '⚠️ Limite excedido (mas URL/auth estão corretos!)'
          } else {
            diagnosis = `⚠️ Erro ${response.status}`
          }
          
          results.push({
            testCase: testCase.name,
            url: testCase.url,
            status: response.status,
            statusText: response.statusText,
            working: response.status === 200,
            almostWorking: response.status === 429, // Rate limited means auth works!
            diagnosis,
            responsePreview: typeof responseData === 'string' 
              ? responseData 
              : JSON.stringify(responseData, null, 2).substring(0, 500),
            headers: Object.keys(testCase.headers).map(k => 
              k === 'x-api-key' || k === 'X-RapidAPI-Key' || k === 'Authorization'
                ? `${k}: ${testCase.headers[k].substring(0, 15)}...`
                : `${k}: ${testCase.headers[k]}`
            )
          })
          
          console.log(`   Status: ${response.status}`)
          console.log(`   ${diagnosis}`)
          
        } catch (error) {
          const errorMsg = error.message || 'Unknown error'
          results.push({
            testCase: testCase.name,
            url: testCase.url,
            status: 'ERROR',
            working: false,
            almostWorking: false,
            diagnosis: `❌ Erro de conexão: ${errorMsg}`,
            error: errorMsg,
            headers: Object.keys(testCase.headers)
          })
          console.log(`   ❌ Error: ${errorMsg}`)
        }
      }
      
      const workingCases = results.filter(r => r.working)
      const almostWorkingCases = results.filter(r => r.almostWorking)
      
      let recommendation = ''
      let nextSteps = []
      
      if (workingCases.length > 0) {
        recommendation = '✅ ENCONTRAMOS A CONFIGURAÇÃO CORRETA!'
        nextSteps = [
          `Use esta URL: ${workingCases[0].url}`,
          `Com estes headers: ${workingCases[0].headers.join(', ')}`,
          'O sistema já está usando esta configuração no TRY 0',
          'Os erros que você vê são dos fallbacks (TRY 1-3) que podemos desabilitar'
        ]
      } else if (almostWorkingCases.length > 0) {
        recommendation = '⚠️ Autenticação OK mas limite excedido'
        nextSteps = [
          `Esta é a URL correta: ${almostWorkingCases[0].url}`,
          'Sua chave está autenticando corretamente',
          'Problema: Você atingiu o limite de quota do plano',
          'Solução: Aguarde renovação ou faça upgrade do plano'
        ]
      } else {
        recommendation = '❌ Nenhuma configuração funcionou'
        nextSteps = [
          'Verifique se a chave está correta no Painel Admin',
          'Acesse o dashboard da HasData e confirme:',
          '  - Qual é a URL base da API?',
          '  - Qual é o formato do header de autenticação?',
          '  - Sua chave tem quota disponível?',
          'Se tiver documentação da HasData, me envie para ajustar'
        ]
      }
      
      return jsonResponse({
        summary: recommendation,
        nextSteps,
        apiKey: `${hasdataKey.substring(0, 15)}...`,
        workingConfigurations: workingCases.length,
        almostWorkingConfigurations: almostWorkingCases.length,
        totalTests: results.length,
        detailedResults: results,
        documentation: {
          currentCodeLocation: '/supabase/functions/server/api-integrations.tsx',
          tryZeroLine: '444-485 (HasData Direct)',
          configuredIn: 'Painel Admin → HasData API Key'
        }
      })
      
    } catch (error) {
      console.error('🔬 Test error:', error)
      return jsonResponse({
        error: 'Erro ao executar teste',
        message: error.message
      }, 500)
    }
  }

  // Diagnostic endpoint - Detailed API status check
  if (cleanPath === '/api-diagnostic') {
    console.log("🔬 Running comprehensive API diagnostic...")
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      let rapidApiKey = Deno.env.get('RAPIDAPI_KEY') || ''
      
      // Try to get from database if not in env
      if (!rapidApiKey && supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        try {
          const { data } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', 'hasdata_api_key')
            .single()
          
          if (data?.value) {
            rapidApiKey = data.value.trim()
          }
        } catch (e) {
          console.log("⚠️ Could not load key from database")
        }
      }
      
      if (!rapidApiKey) {
        return jsonResponse({
          status: 'ERROR',
          message: 'Chave de API não configurada',
          solution: 'Configure a chave RapidAPI no Painel Admin',
          hasKey: false
        }, 500)
      }
      
      console.log(`🔑 Testing with API key: ${rapidApiKey.substring(0, 15)}...`)
      
      // Test all 3 APIs
      const apis = [
        {
          name: 'Google Maps Search',
          host: 'google-maps-search.p.rapidapi.com',
          url: 'https://google-maps-search.p.rapidapi.com/mapsearch?query=restaurante&limit=1'
        },
        {
          name: 'Google Business Search',
          host: 'google-business-search.p.rapidapi.com',
          url: 'https://google-business-search.p.rapidapi.com/search?query=restaurante&limit=1'
        },
        {
          name: 'Maps Data Scraper',
          host: 'maps-data-scraper.p.rapidapi.com',
          url: 'https://maps-data-scraper.p.rapidapi.com/search?query=restaurante&limit=1'
        }
      ]
      
      const results = []
      
      for (const api of apis) {
        console.log(`\n📡 Testing ${api.name}...`)
        try {
          const response = await fetch(api.url, {
            method: 'GET',
            headers: {
              'X-RapidAPI-Key': rapidApiKey,
              'X-RapidAPI-Host': api.host
            },
            signal: AbortSignal.timeout(10000)
          })
          
          const responseText = await response.text().catch(() => '')
          let responseData = null
          try {
            responseData = JSON.parse(responseText)
          } catch {
            responseData = responseText.substring(0, 200)
          }
          
          let diagnosis = ''
          let recommendation = ''
          
          if (response.status === 200) {
            diagnosis = '✅ API FUNCIONANDO - Conectada e retornando dados'
            recommendation = 'Nenhuma ação necessária'
          } else if (response.status === 401 || response.status === 403) {
            diagnosis = '❌ CHAVE INVÁLIDA - A chave de API não é válida ou está incorreta'
            recommendation = 'Verifique se a chave está correta no painel admin. Acesse rapidapi.com para confirmar sua chave.'
          } else if (response.status === 404) {
            diagnosis = '❌ API NÃO INSCRITA - Esta API não está no seu plano RapidAPI'
            recommendation = `Acesse rapidapi.com/hub/${api.host.split('.')[0]} e clique em "Subscribe to Test" para adicionar ao seu plano (tem plano gratuito).`
          } else if (response.status === 429) {
            diagnosis = '⚠️ LIMITE EXCEDIDO - Você atingiu o limite de requisições do seu plano'
            recommendation = 'Aguarde a renovação do plano (geralmente mensal) ou faça upgrade para um plano superior.'
          } else if (response.status === 500 || response.status === 502 || response.status === 503) {
            diagnosis = '⚠️ ERRO NO SERVIDOR - O serviço está temporariamente indisponível'
            recommendation = 'Tente novamente em alguns minutos. Problema temporário no provedor.'
          } else {
            diagnosis = `⚠️ ERRO DESCONHECIDO - Status HTTP ${response.status}`
            recommendation = 'Entre em contato com o suporte da RapidAPI.'
          }
          
          results.push({
            api: api.name,
            status: response.status,
            statusText: response.statusText,
            working: response.status === 200,
            diagnosis,
            recommendation,
            responsePreview: typeof responseData === 'string' ? responseData : JSON.stringify(responseData).substring(0, 200)
          })
          
          console.log(`   Status: ${response.status}`)
          console.log(`   ${diagnosis}`)
          
        } catch (error) {
          const errorMsg = error.message || 'Unknown error'
          results.push({
            api: api.name,
            status: 'ERROR',
            working: false,
            diagnosis: `❌ ERRO DE CONEXÃO - ${errorMsg}`,
            recommendation: 'Verifique sua conexão com a internet ou se há firewall bloqueando.',
            error: errorMsg
          })
          console.log(`   ❌ Error: ${errorMsg}`)
        }
      }
      
      const workingApis = results.filter(r => r.working).length
      const totalApis = results.length
      
      let overallStatus = 'ERROR'
      let overallMessage = ''
      let nextSteps = []
      
      if (workingApis === 0) {
        overallStatus = 'CRITICAL'
        overallMessage = '❌ NENHUMA API FUNCIONANDO - Sistema não consegue gerar listas'
        nextSteps = [
          '1. Verifique se a chave RapidAPI está correta no Painel Admin',
          '2. Acesse rapidapi.com e confirme que você está inscrito em pelo menos uma das APIs',
          '3. Verifique se seu plano tem quota disponível',
          '4. Entre em contato com o suporte se o problema persistir'
        ]
      } else if (workingApis < totalApis) {
        overallStatus = 'PARTIAL'
        overallMessage = `⚠️ ${workingApis}/${totalApis} APIs FUNCIONANDO - Sistema pode ter funcionalidade limitada`
        nextSteps = [
          `${workingApis} API(s) funcionando - o sistema vai usar a(s) que funciona(m)`,
          'Para melhor desempenho, inscreva-se nas outras APIs também',
          'Verifique as recomendações específicas de cada API abaixo'
        ]
      } else {
        overallStatus = 'OK'
        overallMessage = '✅ TODAS AS APIS FUNCIONANDO - Sistema operando normalmente'
        nextSteps = [
          'Sistema configurado corretamente!',
          'Você pode gerar listas B2B normalmente',
          'Monitore seu uso para não exceder o limite do plano'
        ]
      }
      
      return jsonResponse({
        overallStatus,
        overallMessage,
        nextSteps,
        workingApis: `${workingApis}/${totalApis}`,
        apiKey: rapidApiKey.substring(0, 15) + '...',
        timestamp: new Date().toISOString(),
        detailedResults: results,
        documentation: {
          rapidApiHub: 'https://rapidapi.com/hub',
          yourApis: 'https://rapidapi.com/developer/apps',
          getKey: 'https://rapidapi.com/developer/security'
        }
      })
      
    } catch (error) {
      console.error('🔬 Diagnostic error:', error)
      return jsonResponse({
        status: 'ERROR',
        message: 'Erro ao executar diagnóstico',
        error: error.message
      }, 500)
    }
  }

  try {
    // Initialize Supabase client
    let supabase = null
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    // OPTIMIZED: Minimal env check logging
    const envOk = !!(supabaseUrl && supabaseServiceKey && supabaseAnonKey)
    console.log("🔐 Environment:", envOk ? "OK" : "Missing vars")
    
    if (supabaseUrl && supabaseServiceKey) {
      try {
        supabase = createClient(supabaseUrl, supabaseServiceKey)
        console.log("✅ Supabase client initialized")
        
        // Create admin user on server startup
        await createAdminUser(supabase)
      } catch (error) {
        console.warn("⚠️ Supabase client init failed:", error.message)
        // Continue without Supabase for development
      }
    } else {
      console.warn("⚠️ Missing Supabase credentials")
    }

    // Function to create admin user on startup
    async function createAdminUser(supabase: any) {
      try {
        console.log("👑 Checking/creating admin user on server startup...")
        
        // First check if admin exists
        try {
          const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
          
          if (!listError && existingUsers?.users) {
            const adminExists = existingUsers.users.find((u: any) => u.email === 'admin@vai.com.br')
            if (adminExists) {
              console.log("✅ Admin user already exists:", adminExists.id)
              console.log("   Email confirmed:", adminExists.email_confirmed_at ? 'Yes' : 'No')
              return
            }
          }
        } catch (checkError) {
          console.warn("⚠️ Could not check existing users:", checkError.message)
        }
        
        // Create admin user
        console.log("🔨 Creating new admin user...")
        const { data, error } = await supabase.auth.admin.createUser({
          email: 'admin@vai.com.br',
          password: 'Admin@VAI2025',
          user_metadata: { 
            name: 'Administrador VAI',
            company: 'VAI System'
          },
          email_confirm: true  // Auto-confirm email since we don't have email server
        })
        
        if (error) {
          // Check if error is because user already exists (various possible messages)
          const errorMsg = error.message.toLowerCase()
          if (errorMsg.includes('already registered') || 
              errorMsg.includes('already been registered') ||
              errorMsg.includes('has already been registered') ||
              errorMsg.includes('duplicate') ||
              errorMsg.includes('already exists')) {
            console.log("✅ Admin user already exists (from error):", error.message)
          } else {
            console.error("❌ Failed to create admin user:", error.message)
            console.error("   Full error:", error)
          }
        } else if (data?.user) {
          console.log("✅ Admin user created successfully!")
          console.log("   User ID:", data.user.id)
          console.log("   Email:", data.user.email)
          console.log("   Email confirmed:", data.user.email_confirmed_at ? 'Yes' : 'No')
        } else {
          console.warn("⚠️ Admin user creation returned no data")
        }
      } catch (error) {
        console.error("❌ Error in createAdminUser function:", error)
      }
    }

    // Create admin user endpoint - PUBLIC (no auth required)
    if (cleanPath === '/create-admin' && method === 'POST') {
      console.log("👑 Admin user creation requested via endpoint")
      
      if (!supabase) {
        console.error("❌ Supabase client not initialized")
        return jsonResponse({
          error: 'Serviço de autenticação não disponível',
          details: 'Supabase não inicializado'
        }, 500)
      }

      try {
        console.log("📝 Attempting to create admin user with email: admin@vai.com.br")
        
        // First, try to check if user already exists
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
        
        if (!listError && existingUsers?.users) {
          const adminExists = existingUsers.users.find(u => u.email === 'admin@vai.com.br')
          if (adminExists) {
            console.log("✅ Admin user already exists:", adminExists.id)
            return jsonResponse({
              success: true,
              message: 'Usuário admin já existe e está pronto para uso',
              email: 'admin@vai.com.br',
              userId: adminExists.id
            })
          }
        }
        
        // Create new admin user
        console.log("🔨 Creating new admin user...")
        const { data, error } = await supabase.auth.admin.createUser({
          email: 'admin@vai.com.br',
          password: 'Admin@VAI2025',
          user_metadata: { 
            name: 'Administrador VAI',
            company: 'VAI System'
          },
          email_confirm: true  // Auto-confirm email since we don't have email server
        })
        
        if (error) {
          console.error("❌ Supabase createUser error:", error)
          console.error("   Error message:", error.message)
          console.error("   Error status:", error.status)
          
          // Check if error is because user already exists (various possible messages)
          const errorMsg = error.message.toLowerCase()
          console.log("🔍 Checking error message (lowercase):", errorMsg)
          
          if (errorMsg.includes('already') && errorMsg.includes('registered')) {
            console.log("✅ Admin user already exists (from error message):", error.message)
            return jsonResponse({
              success: true,
              message: 'Usuário admin já existe e está pronto para login',
              email: 'admin@vai.com.br',
              note: 'Este usuário já estava registrado no sistema'
            })
          }
          
          if (errorMsg.includes('duplicate') || errorMsg.includes('already exists')) {
            console.log("✅ Admin user already exists (duplicate detected):", error.message)
            return jsonResponse({
              success: true,
              message: 'Usuário admin já existe e está pronto para login',
              email: 'admin@vai.com.br',
              note: 'Este usuário já estava registrado no sistema'
            })
          }
          
          console.error("❌ Unhandled error, will throw")
          throw error
        }
        
        if (!data?.user) {
          console.error("❌ No user data returned from createUser")
          throw new Error('Nenhum dado de usuário retornado')
        }
        
        console.log("✅ Admin user created successfully:", data.user.id)
        return jsonResponse({
          success: true,
          message: 'Usuário admin criado com sucesso',
          email: 'admin@vai.com.br',
          user: {
            id: data.user.id,
            email: data.user.email,
            confirmed: data.user.email_confirmed_at ? true : false
          }
        })
      } catch (error) {
        console.error("❌ Failed to create admin user:", error)
        return jsonResponse({
          error: 'Erro ao criar usuário admin',
          details: error.message || 'Erro desconhecido',
          hint: 'Verifique as configurações do Supabase Auth'
        }, 500)
      }
    }

    // === PROTECTED ENDPOINTS ===
    
    const publicPaths = ['/ping', '/', '/create-admin']
    const isPublicEndpoint = publicPaths.includes(cleanPath)

    let userId = null
    if (!isPublicEndpoint) {
      try {
        userId = await getAuthenticatedUserId(req.headers.get('Authorization'), supabase)
        console.log("✅ Valid auth token provided for user:", userId)
        console.log("   📝 This userId will be used as the key: user_lists_" + userId)
      } catch (error) {
        console.log("❌ Auth failed:", error.message)
        return jsonResponse({
          error: 'Authorization required',
          message: 'Token de acesso necessário',
          details: error.message
        }, 401)
      }
    }

    // === LISTS MANAGEMENT ENDPOINTS ===
    
    // GET /lists - List all lists for user
    if (cleanPath === '/lists' && method === 'GET') {
      console.log("📋 Getting lists for user:", userId)
      
      let userLists = []
      
      if (supabase) {
        try {
          console.log(`🔍 Searching for lists with key: user_lists_${userId}`)
          const { data, error } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', `user_lists_${userId}`)
            .single()
          
          if (error) {
            console.log("⚠️ Supabase query error:", error.message)
            if (error.code !== 'PGRST116') { // PGRST116 = no rows returned
              throw error
            }
          }
          
          if (data?.value) {
            try {
              userLists = JSON.parse(data.value)
              console.log(`✅ Found ${userLists.length} lists in database`)
            } catch (parseError) {
              console.error("❌ JSON parse error:", parseError)
              userLists = []
            }
          } else {
            console.log("⚠️ No lists data found, starting with empty array")
          }
        } catch (error) {
          console.error("❌ Database error loading lists:", error)
          // Continue with empty array instead of failing
        }
      } else {
        console.log("⚠️ No Supabase client available, using empty lists")
      }

      console.log(`📊 Returning ${userLists.length} lists to client`)
      return jsonResponse({
        lists: userLists,
        total: userLists.length,
        message: `${userLists.length} listas encontradas`,
        userId,
        debug: {
          supabaseAvailable: !!supabase,
          keyUsed: `user_lists_${userId}`
        }
      })
    }

    // POST /lists - Create new list
    if (cleanPath === '/lists' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      console.log("✨ Creating new list:", body)

      if (!body.name || !body.name.trim()) {
        return jsonResponse({
          error: 'Nome da lista é obrigatório'
        }, 400)
      }

      // Get existing lists first
      let userLists = []
      const listsKey = `user_lists_${userId}`
      
      if (supabase) {
        try {
          console.log(`🔍 Loading existing lists for key: ${listsKey}`)
          const { data, error } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', listsKey)
            .single()
          
          if (error && error.code !== 'PGRST116') {
            console.warn("⚠️ Error loading existing lists:", error)
          }
          
          if (data?.value) {
            try {
              userLists = JSON.parse(data.value)
              console.log(`✅ Found ${userLists.length} existing lists`)
            } catch (parseError) {
              console.error("❌ JSON parse error on existing lists:", parseError)
              userLists = []
            }
          } else {
            console.log("⚠️ No existing lists found, creating first list")
          }
        } catch (error) {
          console.error("❌ Database error loading existing lists:", error)
        }
      }

      // Create new list
      const newList = {
        id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: body.name.trim(),
        description: body.description?.trim() || '',
        totalContacts: 0,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        userId: userId,
        contacts: []
      }

      console.log("📝 Created new list object:", {
        id: newList.id,
        name: newList.name,
        totalLists: userLists.length + 1
      })

      userLists.push(newList)

      // Save updated lists
      if (supabase) {
        try {
          console.log(`💾 Saving ${userLists.length} lists to database with key: ${listsKey}`)
          const { data, error } = await supabase
            .from('kv_store_73685931')
            .upsert({
              key: listsKey,
              value: JSON.stringify(userLists)
            })
          
          if (error) {
            console.error("❌ Failed to save lists to database:", error)
            return jsonResponse({
              error: 'Erro ao salvar lista no banco de dados',
              details: error.message
            }, 500)
          }
          
          console.log("✅ Lists saved successfully to database")
          
        } catch (error) {
          console.error("❌ Database save operation failed:", error)
          return jsonResponse({
            error: 'Erro ao salvar lista',
            details: error.message
          }, 500)
        }
      } else {
        console.warn("⚠️ No Supabase client available, list will not persist")
      }

      return jsonResponse({
        success: true,
        list: newList,
        message: `Lista "${newList.name}" criada com sucesso!`,
        totalLists: userLists.length,
        debug: {
          listsKey,
          supabaseAvailable: !!supabase,
          userId
        }
      })
    }

    // PUT /lists/:id - Update list
    if (cleanPath.match(/^\/lists\/[^\/]+$/) && method === 'PUT') {
      const listId = cleanPath.split('/')[2]
      const body = await req.json().catch(() => ({}))
      console.log("📝 Updating list:", listId, body)

      let userLists = []
      const listsKey = `user_lists_${userId}`
      
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', listsKey)
            .single()
          
          if (error || !data?.value) {
            console.error("❌ Lists not found for update:", error)
            return jsonResponse({
              error: 'Lista não encontrada'
            }, 404)
          }
          
          userLists = JSON.parse(data.value)
        } catch (error) {
          console.error("❌ Error loading lists for update:", error)
          return jsonResponse({
            error: 'Erro ao carregar listas'
          }, 500)
        }
      }

      const listIndex = userLists.findIndex(list => list.id === listId)
      if (listIndex === -1) {
        return jsonResponse({
          error: 'Lista não encontrada'
        }, 404)
      }

      // Update list
      if (body.name) userLists[listIndex].name = body.name.trim()
      if (body.description !== undefined) userLists[listIndex].description = body.description.trim()
      if (body.contacts) {
        userLists[listIndex].contacts = body.contacts
        userLists[listIndex].totalContacts = body.contacts.length
      }
      userLists[listIndex].lastUpdated = new Date().toISOString()

      // Save updated lists
      if (supabase) {
        try {
          await supabase
            .from('kv_store_73685931')
            .upsert({
              key: listsKey,
              value: JSON.stringify(userLists)
            })
          console.log("✅ List updated successfully")
        } catch (error) {
          console.error("❌ Failed to update list:", error)
          return jsonResponse({
            error: 'Erro ao atualizar lista'
          }, 500)
        }
      }

      return jsonResponse({
        success: true,
        list: userLists[listIndex],
        message: 'Lista atualizada com sucesso!'
      })
    }

    // DELETE /lists/:id - Delete list
    if (cleanPath.match(/^\/lists\/[^\/]+$/) && method === 'DELETE') {
      const listId = cleanPath.split('/')[2]
      console.log("🗑️ Deleting list:", listId)

      let userLists = []
      const listsKey = `user_lists_${userId}`
      
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', listsKey)
            .single()
          
          if (error || !data?.value) {
            return jsonResponse({
              error: 'Lista não encontrada'
            }, 404)
          }
          
          userLists = JSON.parse(data.value)
        } catch (error) {
          return jsonResponse({
            error: 'Erro ao carregar listas'
          }, 500)
        }
      }

      const initialLength = userLists.length
      userLists = userLists.filter(list => list.id !== listId)

      if (userLists.length === initialLength) {
        return jsonResponse({
          error: 'Lista não encontrada'
        }, 404)
      }

      // Save updated lists
      if (supabase) {
        try {
          await supabase
            .from('kv_store_73685931')
            .upsert({
              key: listsKey,
              value: JSON.stringify(userLists)
            })
          console.log("✅ List deleted successfully")
        } catch (error) {
          return jsonResponse({
            error: 'Erro ao excluir lista'
          }, 500)
        }
      }

      return jsonResponse({
        success: true,
        message: 'Lista excluída com sucesso!',
        totalLists: userLists.length
      })
    }

    // GET /lists/:id/contacts - Get contacts from specific list
    if (cleanPath.match(/^\/lists\/[^\/]+\/contacts$/) && method === 'GET') {
      const listId = cleanPath.split('/')[2]
      console.log("📊 Getting contacts for list:", listId)

      let userLists = []
      const listsKey = `user_lists_${userId}`
      
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', listsKey)
            .single()
          
          if (error || !data?.value) {
            return jsonResponse({
              error: 'Lista não encontrada'
            }, 404)
          }
          
          userLists = JSON.parse(data.value)
        } catch (error) {
          return jsonResponse({
            error: 'Erro ao carregar listas'
          }, 500)
        }
      }

      const list = userLists.find(list => list.id === listId)
      if (!list) {
        return jsonResponse({
          error: 'Lista não encontrada'
        }, 404)
      }

      return jsonResponse({
        success: true,
        list: {
          id: list.id,
          name: list.name,
          description: list.description,
          totalContacts: list.totalContacts,
          createdAt: list.createdAt,
          lastUpdated: list.lastUpdated
        },
        contacts: list.contacts || [],
        totalContacts: list.contacts?.length || 0,
        message: `Lista "${list.name}" carregada com ${list.contacts?.length || 0} contatos`
      })
    }

    // === ADMIN ENDPOINTS ===
    
    // Admin dashboard
    if (cleanPath.includes('/admin/dashboard')) {
      console.log("👑 Admin dashboard accessed")
      return jsonResponse({
        stats: {
          totalUsers: 1,
          activeUsers: 1,
          systemStatus: 'operational'
        },
        users: [
          {
            id: 'admin-1',
            email: 'admin@vai.com.br',
            name: 'Administrador VAI',
            company: 'VAI System',
            plan: 'pro',
            createdAt: new Date().toISOString(),
            role: 'admin'
          }
        ],
        message: 'Dashboard data loaded successfully',
        timestamp: new Date().toISOString()
      })
    }

    // Admin API keys
    if (cleanPath.includes('/admin/api-keys')) {
      console.log("🔑 API keys endpoint accessed")
      
      if (method === 'GET') {
        let storedKeys = { openaiApiKey: '', hasdataApiKey: '', instagramApiKey: '', linkedinApiKey: '', evolutionApiUrl: '', evolutionApiKey: '' }
        
        if (supabase) {
          try {
            console.log("🔍 Loading API keys from database...")
            
            // Primeiro tenta buscar do formato unificado (novo)
            try {
              const { data: unifiedData, error: unifiedError } = await supabase
                .from('kv_store_73685931')
                .select('value')
                .eq('key', 'vai_api_keys')
                .single()
              
              if (!unifiedError && unifiedData?.value) {
                console.log("✅ Found unified API keys")
                const unifiedKeys = JSON.parse(unifiedData.value)
                storedKeys.openaiApiKey = unifiedKeys.openaiApiKey || storedKeys.openaiApiKey
                storedKeys.hasdataApiKey = unifiedKeys.hasdataApiKey || storedKeys.hasdataApiKey
                storedKeys.instagramApiKey = unifiedKeys.instagramApiKey || storedKeys.instagramApiKey
                storedKeys.linkedinApiKey = unifiedKeys.linkedinApiKey || storedKeys.linkedinApiKey
                storedKeys.evolutionApiUrl = unifiedKeys.evolutionApiUrl || storedKeys.evolutionApiUrl
                storedKeys.evolutionApiKey = unifiedKeys.evolutionApiKey || storedKeys.evolutionApiKey
              }
            } catch (e) {
              console.log("⚠️ No unified keys found, will load individual keys")
            }
            
            // Também busca chaves individuais (para compatibilidade)
            const { data: openaiData, error: openaiError } = await supabase
              .from('kv_store_73685931')
              .select('value')
              .eq('key', 'openai_api_key')
              .single()

            const { data: hasdataData, error: hasdataError } = await supabase
              .from('kv_store_73685931')
              .select('value')
              .eq('key', 'hasdata_api_key')
              .single()

            const { data: instagramData, error: instagramError } = await supabase
              .from('kv_store_73685931')
              .select('value')
              .eq('key', 'instagram_api_key')
              .single()

            const { data: linkedinData, error: linkedinError } = await supabase
              .from('kv_store_73685931')
              .select('value')
              .eq('key', 'linkedin_api_key')
              .single()

            const { data: evolutionUrlData, error: evolutionUrlError } = await supabase
              .from('kv_store_73685931')
              .select('value')
              .eq('key', 'evolution_api_url')
              .single()

            const { data: evolutionKeyData, error: evolutionKeyError } = await supabase
              .from('kv_store_73685931')
              .select('value')
              .eq('key', 'evolution_api_key')
              .single()

            if (openaiError && openaiError.code !== 'PGRST116') {
              console.warn("⚠️ Error loading OpenAI key:", openaiError)
            } else if (openaiData?.value) {
              storedKeys.openaiApiKey = openaiData.value
              console.log("✅ OpenAI key found")
            }

            if (hasdataError && hasdataError.code !== 'PGRST116') {
              console.warn("⚠️ Error loading HasData key:", hasdataError)
            } else if (hasdataData?.value) {
              storedKeys.hasdataApiKey = hasdataData.value
              console.log("✅ HasData key found")
            }

            if (instagramError && instagramError.code !== 'PGRST116') {
              console.warn("⚠️ Error loading Instagram key:", instagramError)
            } else if (instagramData?.value) {
              storedKeys.instagramApiKey = instagramData.value
              console.log("✅ Instagram key found")
            }

            if (linkedinError && linkedinError.code !== 'PGRST116') {
              console.warn("⚠️ Error loading LinkedIn key:", linkedinError)
            } else if (linkedinData?.value) {
              storedKeys.linkedinApiKey = linkedinData.value
              console.log("✅ LinkedIn key found")
            }

            if (evolutionUrlError && evolutionUrlError.code !== 'PGRST116') {
              console.warn("⚠️ Error loading Evolution URL:", evolutionUrlError)
            } else if (evolutionUrlData?.value) {
              storedKeys.evolutionApiUrl = evolutionUrlData.value
              console.log("✅ Evolution URL found")
            }

            if (evolutionKeyError && evolutionKeyError.code !== 'PGRST116') {
              console.warn("⚠️ Error loading Evolution key:", evolutionKeyError)
            } else if (evolutionKeyData?.value) {
              storedKeys.evolutionApiKey = evolutionKeyData.value
              console.log("✅ Evolution key found")
            }

          } catch (error) {
            console.error("❌ Error loading API keys:", error)
          }
        }
        
        return jsonResponse({
          apiKeys: {
            openaiApiKey: storedKeys.openaiApiKey ? '***' + storedKeys.openaiApiKey.slice(-4) : '',
            hasdataApiKey: storedKeys.hasdataApiKey ? '***' + storedKeys.hasdataApiKey.slice(-4) : '',
            instagramApiKey: storedKeys.instagramApiKey ? '***' + storedKeys.instagramApiKey.slice(-4) : '',
            linkedinApiKey: storedKeys.linkedinApiKey ? '***' + storedKeys.linkedinApiKey.slice(-4) : '',
            evolutionApiUrl: storedKeys.evolutionApiUrl ? '***' + storedKeys.evolutionApiUrl.slice(-10) : '',
            evolutionApiKey: storedKeys.evolutionApiKey ? '***' + storedKeys.evolutionApiKey.slice(-4) : ''
          },
          message: 'API keys retrieved successfully',
          hasKeys: {
            openai: !!storedKeys.openaiApiKey,
            hasdata: !!storedKeys.hasdataApiKey,
            instagram: !!storedKeys.instagramApiKey,
            linkedin: !!storedKeys.linkedinApiKey,
            evolutionUrl: !!storedKeys.evolutionApiUrl,
            evolutionKey: !!storedKeys.evolutionApiKey
          }
        })
      }
      
      if (method === 'POST') {
        const body = await req.json().catch(() => ({}))
        console.log("💾 Saving API keys:", { hasOpenAI: !!body.openaiApiKey, hasHasData: !!body.hasdataApiKey, hasInstagram: !!body.instagramApiKey, hasLinkedIn: !!body.linkedinApiKey, hasEvolutionUrl: !!body.evolutionApiUrl, hasEvolutionKey: !!body.evolutionApiKey })
        
        if (supabase) {
          try {
            // Busca chaves existentes primeiro
            let existingKeys = {}
            try {
              const { data: unifiedData, error: unifiedError } = await supabase
                .from('kv_store_73685931')
                .select('value')
                .eq('key', 'vai_api_keys')
                .single()
              
              if (!unifiedError && unifiedData?.value) {
                existingKeys = JSON.parse(unifiedData.value)
                console.log("📦 Found existing keys, merging...")
              }
            } catch (e) {
              console.log("📦 No existing keys found, creating new...")
            }
            
            if (body.openaiApiKey && body.openaiApiKey.trim()) {
              console.log("💾 Saving OpenAI API key...")
              const { error } = await supabase
                .from('kv_store_73685931')
                .upsert({ 
                  key: 'openai_api_key', 
                  value: body.openaiApiKey.trim()
                })
              
              if (error) {
                console.error("❌ Failed to save OpenAI key:", error)
                throw error
              }
              console.log("✅ OpenAI key saved")
            }
            
            if (body.hasdataApiKey && body.hasdataApiKey.trim()) {
              console.log("💾 Saving HasData API key...")
              const { error } = await supabase
                .from('kv_store_73685931')
                .upsert({ 
                  key: 'hasdata_api_key', 
                  value: body.hasdataApiKey.trim()
                })
              
              if (error) {
                console.error("❌ Failed to save HasData key:", error)
                throw error
              }
              console.log("✅ HasData key saved")
            }
            
            if (body.instagramApiKey && body.instagramApiKey.trim()) {
              console.log("💾 Saving Instagram API key...")
              const { error } = await supabase
                .from('kv_store_73685931')
                .upsert({ 
                  key: 'instagram_api_key', 
                  value: body.instagramApiKey.trim()
                })
              
              if (error) {
                console.error("❌ Failed to save Instagram key:", error)
                throw error
              }
              console.log("✅ Instagram key saved")
            }
            
            if (body.linkedinApiKey && body.linkedinApiKey.trim()) {
              console.log("💾 Saving LinkedIn API key...")
              const { error } = await supabase
                .from('kv_store_73685931')
                .upsert({ 
                  key: 'linkedin_api_key', 
                  value: body.linkedinApiKey.trim()
                })
              
              if (error) {
                console.error("❌ Failed to save LinkedIn key:", error)
                throw error
              }
              console.log("✅ LinkedIn key saved")
            }
            
            if (body.evolutionApiUrl && body.evolutionApiUrl.trim()) {
              console.log("💾 Saving Evolution API URL...")
              const { error } = await supabase
                .from('kv_store_73685931')
                .upsert({ 
                  key: 'evolution_api_url', 
                  value: body.evolutionApiUrl.trim()
                })
              
              if (error) {
                console.error("❌ Failed to save Evolution URL:", error)
                throw error
              }
              console.log("✅ Evolution URL saved")
            }
            
            if (body.evolutionApiKey && body.evolutionApiKey.trim()) {
              console.log("💾 Saving Evolution API key...")
              const { error } = await supabase
                .from('kv_store_73685931')
                .upsert({ 
                  key: 'evolution_api_key', 
                  value: body.evolutionApiKey.trim()
                })
              
              if (error) {
                console.error("❌ Failed to save Evolution key:", error)
                throw error
              }
              console.log("✅ Evolution key saved")
            }
            
            // IMPORTANTE: Salva também no formato JSON unificado para o endpoint de WhatsApp
            console.log("💾 Saving unified API keys object...")
            const unifiedKeys = {
              openaiApiKey: body.openaiApiKey?.trim() || existingKeys.openaiApiKey || '',
              hasdataApiKey: body.hasdataApiKey?.trim() || existingKeys.hasdataApiKey || '',
              instagramApiKey: body.instagramApiKey?.trim() || existingKeys.instagramApiKey || '',
              linkedinApiKey: body.linkedinApiKey?.trim() || existingKeys.linkedinApiKey || '',
              evolutionApiUrl: body.evolutionApiUrl?.trim() || existingKeys.evolutionApiUrl || '',
              evolutionApiKey: body.evolutionApiKey?.trim() || existingKeys.evolutionApiKey || ''
            }
            console.log("🔑 Unified keys to save:", { 
              hasOpenAI: !!unifiedKeys.openaiApiKey, 
              hasHasData: !!unifiedKeys.hasdataApiKey,
              hasInstagram: !!unifiedKeys.instagramApiKey,
              hasLinkedIn: !!unifiedKeys.linkedinApiKey,
              hasEvolutionUrl: !!unifiedKeys.evolutionApiUrl,
              hasEvolutionKey: !!unifiedKeys.evolutionApiKey
            })
            
            const { error: unifiedError } = await supabase
              .from('kv_store_73685931')
              .upsert({ 
                key: 'vai_api_keys', 
                value: JSON.stringify(unifiedKeys)
              })
            
            if (unifiedError) {
              console.error("❌ Failed to save unified keys:", unifiedError)
              throw unifiedError
            }
            
            console.log("✅ All API keys saved to database (individual + unified)")
          } catch (error) {
            console.error("❌ Database save failed:", error)
            return jsonResponse({
              error: 'Erro ao salvar chaves de API',
              details: error.message
            }, 500)
          }
        } else {
          console.warn("⚠️ No Supabase client, API keys will not persist")
        }
        
        return jsonResponse({
          success: true,
          message: 'Chaves de API salvas com sucesso',
          timestamp: new Date().toISOString()
        })
      }
    }

    // Cities endpoint
    if (cleanPath.includes('/cities/')) {
      const stateMatch = cleanPath.match(/\/cities\/([A-Z]{2})$/)
      const state = stateMatch ? stateMatch[1] : null
      
      if (!state) {
        return jsonResponse({ 
          error: 'Parâmetro de estado obrigatório'
        }, 400)
      }

      console.log("🏙️ Cities requested for state:", state)

      // Basic city database for main states
      const citiesDatabase = {
        'SP': [
          'Americana',
          'Araras',
          'Atibaia',
          'Barueri',
          'Bragança Paulista',
          'Campinas',
          'Carapicuíba',
          'Caraguatatuba',
          'Cotia',
          'Cubatão',
          'Diadema',
          'Embu das Artes',
          'Ferraz de Vasconcelos',
          'Francisco Morato',
          'Franco da Rocha',
          'Guaratinguetá',
          'Guarujá',
          'Guarulhos',
          'Hortolândia',
          'Indaiatuba',
          'Itanhaém',
          'Itapecerica da Serra',
          'Itapetininga',
          'Itapevi',
          'Itaquaquecetuba',
          'Itatiba',
          'Itu',
          'Jacareí',
          'Jandira',
          'Jundiaí',
          'Limeira',
          'Mauá',
          'Mogi das Cruzes',
          'Mogi Guaçu',
          'Osasco',
          'Paulínia',
          'Pindamonhangaba',
          'Piracicaba',
          'Poá',
          'Praia Grande',
          'Presidente Prudente',
          'Ribeirão Pires',
          'Ribeirão Preto',
          'Rio Claro',
          'Salto',
          'Santa Bárbara d\'Oeste',
          'Santana de Parnaíba',
          'Santo André',
          'Santos',
          'São Bernardo do Campo',
          'São Caetano do Sul',
          'São José dos Campos',
          'São Paulo',
          'São Vicente',
          'Sorocaba',
          'Sumaré',
          'Suzano',
          'Taboão da Serra',
          'Tatuí',
          'Taubaté',
          'Valinhos',
          'Várzea Paulista',
          'Votorantim'
        ],
        'RJ': ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói', 'Belford Roxo'],
        'MG': ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros'],
        'RS': ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria', 'Gravataí'],
        'PR': ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais'],
        'SC': ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Criciúma', 'Chapecó'],
        'BA': ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Juazeiro', 'Ilhéus'],
        'GO': ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia', 'Águas Lindas de Goiás'],
        'PE': ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista'],
        'CE': ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral', 'Crato'],
        'PA': ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Parauapebas', 'Castanhal'],
        'DF': ['Brasília', 'Taguatinga', 'Ceilândia', 'Samambaia', 'Planaltina', 'Águas Claras'],
        'MA': ['São Luís', 'Imperatriz', 'São José de Ribamar', 'Timon', 'Caxias', 'Codó'],
        'PB': ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux', 'Sousa'],
        'ES': ['Vitória', 'Vila Velha', 'Cariacica', 'Serra', 'Linhares', 'Colatina'],
        'PI': ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano', 'Campo Maior'],
        'AL': ['Maceió', 'Arapiraca', 'Palmeira dos Índios', 'Rio Largo', 'Penedo', 'União dos Palmares'],
        'RN': ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba', 'Ceará-Mirim'],
        'MT': ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra', 'Cáceres'],
        'MS': ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã', 'Naviraí'],
        'SE': ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'Estância', 'Tobias Barreto'],
        'RO': ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal', 'Rolim de Moura'],
        'AC': ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó', 'Brasileia'],
        'AM': ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Tefé', 'Coari'],
        'RR': ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Alto Alegre', 'Mucajaí', 'Cantá'],
        'AP': ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Mazagão', 'Porto Grande'],
        'TO': ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins', 'Colinas do Tocantins']
      }

      const stateCities = citiesDatabase[state] || []
      const cities = stateCities
        .sort()
        .map(city => ({
          value: city,
          label: city
        }))

      console.log(`✅ Returning ${cities.length} cities for ${state}`)
      return jsonResponse({ 
        cities,
        state,
        total: cities.length,
        message: `${cities.length} cidades encontradas para ${state}`
      })
    }

    // === LEAD GENERATION ENDPOINT (REAL DATA ONLY) ===
    
    // POST /generate-leads - Generate leads using ONLY HasData API DIRECTLY
    if (cleanPath === '/generate-leads' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      console.log("🔍 Generate leads request (HasData Direct API):", body)

      const { listId, businessNiche, state, cities, neighborhoods, attempt = 0 } = body

      // Validation
      if (!listId || !businessNiche || !state || !cities || !Array.isArray(cities) || cities.length === 0) {
        return jsonResponse({
          error: 'Parâmetros obrigatórios: listId, businessNiche, state, cities'
        }, 400)
      }

      try {
        console.log("🗺️ Using HasData Direct API to search Google Maps...")
        
        // IMPORTANT: Rotate through cities based on attempt number to avoid duplicate results
        // This ensures each API call searches different locations
        const cityIndex = attempt % cities.length
        const city = cities[cityIndex]
        console.log(`🎯 Using city ${cityIndex + 1}/${cities.length}: ${city} (attempt ${attempt + 1})`)
        
        // Build query with variation based on neighborhoods
        let query = `${businessNiche} ${city} ${state}`
        
        // Rotate through neighborhoods if provided
        if (neighborhoods?.trim()) {
          const bairrosList = neighborhoods.split(',').map(b => b.trim()).filter(b => b)
          if (bairrosList.length > 0) {
            const neighborhoodIndex = Math.floor(attempt / cities.length) % bairrosList.length
            query += ` ${bairrosList[neighborhoodIndex]}`
            console.log(`📍 Using neighborhood: ${bairrosList[neighborhoodIndex]}`)
          }
        }
        
        // Add search variation to get different results from Google Maps in each attempt
        // This helps the API return different businesses instead of the same top results
        const searchVariations = [
          '', // Default, no variation
          'perto de mim',
          'na região',
          'melhores',
          'recomendados'
        ]
        const variationIndex = Math.floor(attempt / (cities.length * (neighborhoods?.trim() ? neighborhoods.split(',').length : 1))) % searchVariations.length
        if (searchVariations[variationIndex]) {
          query += ` ${searchVariations[variationIndex]}`
          console.log(`🎲 Adding search variation: "${searchVariations[variationIndex]}"`)
        }
        
        console.log(`🔍 Searching: "${query}"`)
        
        // Call HasData API using the function from api-integrations.tsx - limit 20 per search
        const hasdataResponse = await scrapeGoogleMaps(query, null, businessNiche, 20)
        const rawResults = hasdataResponse.localResults || []
        
        console.log(`✅ HasData returned ${rawResults.length} results`)

        if (rawResults.length === 0) {
          console.log("❌ No contacts found from HasData")
          return jsonResponse({
            success: false,
            message: 'Nenhuma empresa encontrada. Tente ajustar os critérios de busca.',
            suggestion: 'Use termos mais genéricos como "Restaurante", "Loja", "Clínica".',
            error: 'no_data_found'
          }, 404)
        }

        // Convert to expected format
        const formattedContactsInitial = rawResults.map((contact, index) => ({
          id: `real_${Date.now()}_${index}`,
          name: 'Contato não informado',
          company: contact.title || 'Empresa não informada',
          email: contact.email || '',
          phone: contact.phone ? contact.phone.replace(/[^\d]/g, '').replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') : '',
          website: contact.website || '',
          address: contact.address || '',
          city: city,
          state: state,
          segment: businessNiche,
          source: 'Dados Reais',
          cnpj: '',
          cep: '',
          neighborhood: '',
          addedAt: new Date().toISOString(),
          rating: contact.rating || null,
          totalRatings: contact.reviews || null,
          category: contact.type || businessNiche,
          businessStatus: 'open'
        }))

        console.log(`✅ Formatted ${formattedContactsInitial.length} contacts`)
        
        // Generate emails from websites
        console.log(`📧 Generating business emails...`)
        const formattedContacts = formattedContactsInitial.map(contact => {
          if (contact.email && contact.email.length > 0) {
            return { ...contact, emailSource: 'real' }
          }
          
          if (contact.website) {
            const email = generateBusinessEmail(contact.website, contact.company)
            return { ...contact, email, emailSource: 'estimated' }
          }
          return { ...contact, emailSource: 'none' }
        })
        
        const contactsWithEmail = formattedContacts.filter(c => c.email).length
        const realEmails = formattedContacts.filter(c => c.emailSource === 'real').length
        const estimatedEmails = formattedContacts.filter(c => c.emailSource === 'estimated').length
        console.log(`✅ ${contactsWithEmail}/${formattedContacts.length} contacts have emails (${realEmails} real, ${estimatedEmails} estimated)`)

        // Load user lists and add contacts
        let userLists = []
        const listsKey = `user_lists_${userId}`
        
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('kv_store_73685931')
              .select('value')
              .eq('key', listsKey)
              .single()
            
            if (data?.value) {
              userLists = JSON.parse(data.value)
            }
          } catch (error) {
            console.error("❌ Error loading lists:", error)
          }
        }

        // Find and update the specific list
        const listIndex = userLists.findIndex(list => list.id === listId)
        if (listIndex === -1) {
          return jsonResponse({
            error: 'Lista não encontrada'
          }, 404)
        }

        // Add new contacts to the list (avoid duplicates)
        const existingCompanies = new Set((userLists[listIndex].contacts || []).map(c => c.company.toLowerCase()))
        const newContacts = formattedContacts.filter(contact => 
          !existingCompanies.has(contact.company.toLowerCase())
        )

        userLists[listIndex].contacts = [...(userLists[listIndex].contacts || []), ...newContacts]
        userLists[listIndex].totalContacts = userLists[listIndex].contacts.length
        userLists[listIndex].lastUpdated = new Date().toISOString()

        // Save updated lists
        if (supabase) {
          try {
            await supabase
              .from('kv_store_73685931')
              .upsert({
                key: listsKey,
                value: JSON.stringify(userLists)
              })
            console.log("✅ Contacts saved to list successfully")
          } catch (error) {
            console.error("❌ Failed to save contacts:", error)
            return jsonResponse({
              error: 'Erro ao salvar contatos na lista'
            }, 500)
          }
        }

        console.log(`📊 API returned: ${formattedContacts.length} total, ${newContacts.length} new (${formattedContacts.length - newContacts.length} duplicates filtered)`)

        return jsonResponse({
          success: true,
          contacts: newContacts,  // CRITICAL: Return only NEW contacts, not all formatted contacts
          totalFound: formattedContacts.length,
          totalAdded: newContacts.length,
          apiSource: 'Dados Reais e Atualizados',
          timestamp: new Date().toISOString(),
          message: `${newContacts.length} novos contatos reais adicionados à lista`
        })

      } catch (error) {
        console.error("❌ Error in lead generation:", error)
        
        // Handle specific errors
        const errorMsg = error.message || 'Erro desconhecido'
        
        if (errorMsg.includes('Serviço de dados não está disponível') || errorMsg.includes('não configurada')) {
          return jsonResponse({
            error: 'Serviço de dados não configurado. Configure a chave da HasData no painel admin.',
            details: 'service_not_configured'
          }, 503)
        }
        
        if (errorMsg.includes('429') || errorMsg.includes('Limite de requisições')) {
          return jsonResponse({
            error: 'Limite de requisições atingido. Aguarde alguns minutos.',
            details: 'rate_limit'
          }, 429)
        }

        return jsonResponse({
          error: 'Erro ao buscar dados. Tente novamente.',
          details: errorMsg,
          timestamp: new Date().toISOString()
        }, 500)
      }
    }

    // === B2C LISTS MANAGEMENT ENDPOINTS ===
    
    // GET /lists-b2c - List all B2C lists for user
    if (cleanPath === '/lists-b2c' && method === 'GET') {
      console.log("📋 Getting B2C lists for user:", userId)
      
      let userListsB2C = []
      
      if (supabase) {
        try {
          console.log(`🔍 Searching for B2C lists with key: user_lists_b2c_${userId}`)
          const { data, error } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', `user_lists_b2c_${userId}`)
            .single()
          
          if (error) {
            console.log("⚠️ Supabase query error:", error.message)
            if (error.code !== 'PGRST116') {
              throw error
            }
          }
          
          if (data?.value) {
            try {
              userListsB2C = JSON.parse(data.value)
              console.log(`✅ Found ${userListsB2C.length} B2C lists in database`)
            } catch (parseError) {
              console.error("❌ JSON parse error:", parseError)
              userListsB2C = []
            }
          } else {
            console.log("⚠️ No B2C lists data found, starting with empty array")
          }
        } catch (error) {
          console.error("❌ Database error loading B2C lists:", error)
        }
      } else {
        console.log("⚠️ No Supabase client available, using empty B2C lists")
      }

      console.log(`📊 Returning ${userListsB2C.length} B2C lists to client`)
      return jsonResponse({
        lists: userListsB2C,
        total: userListsB2C.length,
        message: `${userListsB2C.length} listas B2C encontradas`,
        userId
      })
    }

    // POST /lists-b2c - Create new B2C list
    if (cleanPath === '/lists-b2c' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      console.log("✨ Creating new B2C list:", body.name)

      if (!body.name || !body.name.trim()) {
        return jsonResponse({
          error: 'Nome da lista é obrigatório'
        }, 400)
      }

      let userListsB2C = []
      const listsKeyB2C = `user_lists_b2c_${userId}`
      
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', listsKeyB2C)
            .single()
          
          if (error && error.code !== 'PGRST116') {
            throw error
          }
          
          if (data?.value) {
            userListsB2C = JSON.parse(data.value)
          }
        } catch (error) {
          console.error("❌ Error loading existing B2C lists:", error)
        }
      }

      const newListB2C = {
        id: `b2c_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: body.name.trim(),
        description: body.description?.trim() || '',
        totalContacts: 0,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        userId: userId,
        type: 'b2c',
        contacts: []
      }

      console.log("📝 Created new B2C list object:", {
        id: newListB2C.id,
        name: newListB2C.name,
        totalLists: userListsB2C.length + 1
      })

      userListsB2C.push(newListB2C)

      if (supabase) {
        try {
          console.log(`💾 Saving ${userListsB2C.length} B2C lists to database with key: ${listsKeyB2C}`)
          const { data, error } = await supabase
            .from('kv_store_73685931')
            .upsert({
              key: listsKeyB2C,
              value: JSON.stringify(userListsB2C)
            })
          
          if (error) {
            console.error("❌ Failed to save B2C lists to database:", error)
            return jsonResponse({
              error: 'Erro ao salvar lista no banco de dados',
              details: error.message
            }, 500)
          }
          
          console.log("✅ B2C lists saved successfully to database")
          
        } catch (error) {
          console.error("❌ Database save operation failed:", error)
          return jsonResponse({
            error: 'Erro ao salvar lista',
            details: error.message
          }, 500)
        }
      }

      return jsonResponse({
        success: true,
        list: newListB2C,
        message: `Lista B2C "${newListB2C.name}" criada com sucesso!`,
        totalLists: userListsB2C.length
      })
    }

    // DELETE /lists-b2c/:id - Delete B2C list
    if (cleanPath.match(/^\/lists-b2c\/[^\/]+$/) && method === 'DELETE') {
      const listId = cleanPath.split('/')[2]
      console.log("🗑️ Deleting B2C list:", listId)

      let userListsB2C = []
      const listsKeyB2C = `user_lists_b2c_${userId}`
      
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', listsKeyB2C)
            .single()
          
          if (error || !data?.value) {
            return jsonResponse({
              error: 'Lista B2C não encontrada'
            }, 404)
          }
          
          userListsB2C = JSON.parse(data.value)
        } catch (error) {
          console.error("❌ Error loading B2C lists for deletion:", error)
          return jsonResponse({
            error: 'Erro ao carregar listas'
          }, 500)
        }
      }

      const listIndex = userListsB2C.findIndex(list => list.id === listId)
      if (listIndex === -1) {
        return jsonResponse({
          error: 'Lista B2C não encontrada'
        }, 404)
      }

      const deletedList = userListsB2C[listIndex]
      userListsB2C.splice(listIndex, 1)

      if (supabase) {
        try {
          const { error } = await supabase
            .from('kv_store_73685931')
            .upsert({
              key: listsKeyB2C,
              value: JSON.stringify(userListsB2C)
            })
          
          if (error) {
            console.error("❌ Failed to save updated B2C lists:", error)
            return jsonResponse({
              error: 'Erro ao excluir lista',
              details: error.message
            }, 500)
          }
          
          console.log("✅ B2C list deleted successfully")
        } catch (error) {
          console.error("❌ Error deleting B2C list:", error)
          return jsonResponse({
            error: 'Erro ao excluir lista',
            details: error.message
          }, 500)
        }
      }

      return jsonResponse({
        success: true,
        message: `Lista B2C "${deletedList.name}" excluída com sucesso!`
      })
    }

    // GET /lists-b2c/:id/contacts - Get B2C list contacts
    if (cleanPath.match(/^\/lists-b2c\/[^\/]+\/contacts$/) && method === 'GET') {
      const listId = cleanPath.split('/')[2]
      console.log("📊 Getting B2C contacts for list:", listId)

      let userListsB2C = []
      const listsKeyB2C = `user_lists_b2c_${userId}`
      
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', listsKeyB2C)
            .single()
          
          if (error || !data?.value) {
            return jsonResponse({
              error: 'Lista B2C não encontrada'
            }, 404)
          }
          
          userListsB2C = JSON.parse(data.value)
        } catch (error) {
          console.error("❌ Error loading B2C lists:", error)
          return jsonResponse({
            error: 'Erro ao carregar lista'
          }, 500)
        }
      }

      const list = userListsB2C.find(l => l.id === listId)
      if (!list) {
        return jsonResponse({
          error: 'Lista B2C não encontrada'
        }, 404)
      }

      return jsonResponse({
        success: true,
        list: {
          id: list.id,
          name: list.name,
          description: list.description,
          totalContacts: list.contacts?.length || 0,
          createdAt: list.createdAt
        },
        contacts: list.contacts || [],
        totalContacts: list.contacts?.length || 0
      })
    }

    // POST /generate-social-leads - Generate social media leads
    if (cleanPath === '/generate-social-leads' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      console.log("🔍 Generate social leads request:", body)

      const { 
        listId, 
        extractionMode = 'by-niche',
        platform, 
        keyword, 
        category, 
        location, 
        minFollowers, 
        maxFollowers,
        followerLinks = []
      } = body

      // Validation based on extraction mode
      if (!listId) {
        return jsonResponse({
          error: 'Parâmetro obrigatório: listId'
        }, 400)
      }

      if (extractionMode === 'by-followers') {
        // Mode: Extract followers from profiles
        if (!followerLinks || followerLinks.length === 0) {
          return jsonResponse({
            error: 'Parâmetro obrigatório: followerLinks (pelo menos 1 link)'
          }, 400)
        }
        console.log(`👥 Extraction mode: By Followers (${followerLinks.length} profiles)`)
      } else {
        // Mode: Search by niche (original)
        if (!platform || !keyword) {
          return jsonResponse({
            error: 'Parâmetros obrigatórios para busca por nicho: platform, keyword'
          }, 400)
        }

        if (!['instagram', 'linkedin'].includes(platform)) {
          return jsonResponse({
            error: 'Plataforma inválida. Use: instagram ou linkedin'
          }, 400)
        }
        console.log(`🔍 Extraction mode: By Niche (${platform} - ${keyword})`)
      }

      try {

        
        console.log(`🔍 Searching ${platform} profiles for keyword: "${keyword}"`)
        
        // ✅ Call REAL extraction function via HasData API - NO MOCK DATA
        const realProfiles = await extractB2CProfiles(extractionMode, {
          platform,
          keyword,
          category,
          location,
          followerLinks
        }, supabase)

        if (!realProfiles || realProfiles.length === 0) {
          throw new Error('Nenhum perfil foi encontrado. Verifique os parâmetros de busca.')
        }

        // Filter by followers range if specified (only for by-niche mode)
        const filteredProfiles = extractionMode === 'by-niche' 
          ? realProfiles.filter(profile => {
              if (minFollowers && profile.followers < minFollowers) return false
              if (maxFollowers && profile.followers > maxFollowers) return false
              return true
            })
          : realProfiles

        console.log(`✅ Found ${filteredProfiles.length} REAL profiles from HasData API`)

        // Load user B2C lists and add contacts
        let userListsB2C = []
        const listsKeyB2C = `user_lists_b2c_${userId}`
        
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('kv_store_73685931')
              .select('value')
              .eq('key', listsKeyB2C)
              .single()
            
            if (data?.value) {
              userListsB2C = JSON.parse(data.value)
            }
          } catch (error) {
            console.error("❌ Error loading B2C lists:", error)
          }
        }

        const listIndex = userListsB2C.findIndex(list => list.id === listId)
        if (listIndex === -1) {
          return jsonResponse({
            error: 'Lista B2C não encontrada'
          }, 404)
        }

        // Add new contacts to list
        const existingContacts = userListsB2C[listIndex].contacts || []
        const newContacts = filteredProfiles.filter(newProfile => 
          !existingContacts.some(existing => existing.username === newProfile.username)
        )

        if (newContacts.length > 0) {
          userListsB2C[listIndex].contacts = [...existingContacts, ...newContacts]
          userListsB2C[listIndex].totalContacts = userListsB2C[listIndex].contacts.length
          userListsB2C[listIndex].lastUpdated = new Date().toISOString()

          if (supabase) {
            try {
              await supabase
                .from('kv_store_73685931')
                .upsert({
                  key: listsKeyB2C,
                  value: JSON.stringify(userListsB2C)
                })
              console.log("✅ B2C contacts saved to list")
            } catch (error) {
              console.error("❌ Error saving B2C contacts:", error)
            }
          }
        }

        return jsonResponse({
          success: true,
          contacts: filteredProfiles,
          totalFound: filteredProfiles.length,
          totalAdded: newContacts.length,
          platform: platform,
          timestamp: new Date().toISOString(),
          message: `✅ ${newContacts.length} novos contatos reais adicionados à lista`,
          extractionMode: extractionMode
        })

      } catch (error) {
        console.error("❌ Error in social lead generation:", error)
        
        const errorMessage = error.message || 'Erro desconhecido'
        let userFriendlyMessage = 'Erro na extração de dados reais'
        let statusCode = 500
        
        // Provide more user-friendly error messages
        if (errorMessage.includes('não encontrado')) {
          userFriendlyMessage = 'Perfil não encontrado ou inacessível'
          statusCode = 404
        } else if (errorMessage.includes('privado')) {
          userFriendlyMessage = 'Perfil privado - apenas perfis públicos podem ser extraídos'
          statusCode = 403
        } else if (errorMessage.includes('autenticação')) {
          userFriendlyMessage = 'Erro de autenticação - verifique as configurações'
          statusCode = 401
        } else if (errorMessage.includes('limite de requisições')) {
          userFriendlyMessage = 'Limite de requisições excedido - tente novamente em alguns minutos'
          statusCode = 429
        } else if (errorMessage.includes('Nenhum perfil')) {
          userFriendlyMessage = 'Nenhum perfil encontrado com os critérios informados'
          statusCode = 404
        }
        
        return jsonResponse({
          error: userFriendlyMessage,
          details: errorMessage,
          timestamp: new Date().toISOString()
        }, statusCode)
      }
    }

    // === INTEGRATIONS ENDPOINTS ===
    
    // GET /integrations - List all integrations
    if (cleanPath === '/integrations' && method === 'GET') {
      console.log("🔌 Getting integrations for user:", userId)
      
      let integrations = []
      
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', `user_integrations_${userId}`)
            .single()
          
          if (!error && data?.value) {
            integrations = JSON.parse(data.value)
            console.log(`✅ Found ${integrations.length} integrations`)
          }
        } catch (error) {
          console.error("❌ Error loading integrations:", error)
        }
      }

      return jsonResponse({
        integrations,
        total: integrations.length
      })
    }

    // POST /integrations/whatsapp - Connect WhatsApp
    if (cleanPath === '/integrations/whatsapp' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      console.log("📱 WhatsApp integration request:", { type: body.whatsappType })

      try {
        let integrations = []
        const integrationsKey = `user_integrations_${userId}`
        
        if (supabase) {
          const { data } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', integrationsKey)
            .single()
          
          if (data?.value) {
            integrations = JSON.parse(data.value)
          }
        }

        // Remove existing WhatsApp integration
        integrations = integrations.filter(i => i.type !== 'whatsapp')

        // Add new WhatsApp integration
        const newIntegration = {
          id: `integration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'whatsapp',
          name: body.whatsappType === 'evolution' ? 'WhatsApp (Evolution API)' : 'WhatsApp (API Oficial)',
          status: 'connected',
          config: body.config,
          connectedAt: new Date().toISOString(),
          lastSync: new Date().toISOString()
        }

        integrations.push(newIntegration)

        if (supabase) {
          await supabase
            .from('kv_store_73685931')
            .upsert({
              key: integrationsKey,
              value: JSON.stringify(integrations)
            })
        }

        console.log("✅ WhatsApp integration saved")

        return jsonResponse({
          success: true,
          integration: newIntegration,
          message: 'WhatsApp conectado com sucesso!'
        })
      } catch (error) {
        console.error("❌ Error connecting WhatsApp:", error)
        return jsonResponse({
          error: 'Erro ao conectar WhatsApp',
          details: error.message
        }, 500)
      }
    }

    // POST /integrations/whatsapp/qr - Generate QR Code for WhatsApp
    if (cleanPath === '/integrations/whatsapp/qr' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      console.log("🔲 QR Code generation request")

      try {
        // In production, this would call the Evolution API to generate a real QR code
        // For now, we'll return a mock response
        
        // Example Evolution API call (uncomment and configure in production):
        // const response = await fetch(`${body.url}/instance/qrcode/${body.instance}`, {
        //   headers: {
        //     'apikey': body.apiKey
        //   }
        // })
        // const result = await response.json()
        // return jsonResponse({ qrCode: result.base64 })

        return jsonResponse({
          error: 'Geração de QR Code requer configuração da Evolution API',
          details: 'Configure a Evolution API no servidor para gerar QR Codes reais',
          hint: 'Esta é uma funcionalidade que requer integração com servidor Evolution API em produção'
        }, 400)
      } catch (error) {
        console.error("❌ Error generating QR code:", error)
        return jsonResponse({
          error: 'Erro ao gerar QR Code',
          details: error.message
        }, 500)
      }
    }

    // POST /integrations/social - Connect Facebook/Instagram
    if (cleanPath === '/integrations/social' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      console.log("📘 Social media integration request")

      try {
        let integrations = []
        const integrationsKey = `user_integrations_${userId}`
        
        if (supabase) {
          const { data } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', integrationsKey)
            .single()
          
          if (data?.value) {
            integrations = JSON.parse(data.value)
          }
        }

        // Remove existing Facebook/Instagram integrations
        integrations = integrations.filter(i => i.type !== 'facebook' && i.type !== 'instagram')

        // Add Facebook integration
        if (body.facebookPageToken && body.facebookPageId) {
          integrations.push({
            id: `integration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'facebook',
            name: 'Facebook',
            status: 'connected',
            config: {
              pageToken: body.facebookPageToken,
              pageId: body.facebookPageId
            },
            connectedAt: new Date().toISOString(),
            lastSync: new Date().toISOString()
          })
        }

        // Add Instagram integration
        if (body.instagramAccountId) {
          integrations.push({
            id: `integration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'instagram',
            name: 'Instagram',
            status: 'connected',
            config: {
              accountId: body.instagramAccountId,
              pageToken: body.facebookPageToken
            },
            connectedAt: new Date().toISOString(),
            lastSync: new Date().toISOString()
          })
        }

        if (supabase) {
          await supabase
            .from('kv_store_73685931')
            .upsert({
              key: integrationsKey,
              value: JSON.stringify(integrations)
            })
        }

        console.log("✅ Social media integrations saved")

        return jsonResponse({
          success: true,
          message: 'Redes sociais conectadas com sucesso!'
        })
      } catch (error) {
        console.error("❌ Error connecting social media:", error)
        return jsonResponse({
          error: 'Erro ao conectar redes sociais',
          details: error.message
        }, 500)
      }
    }

    // POST /integrations/voip - Connect VOIP
    if (cleanPath === '/integrations/voip' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      console.log("☎️ VOIP integration request:", { provider: body.provider })

      try {
        let integrations = []
        const integrationsKey = `user_integrations_${userId}`
        
        if (supabase) {
          const { data } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', integrationsKey)
            .single()
          
          if (data?.value) {
            integrations = JSON.parse(data.value)
          }
        }

        // Remove existing VOIP integration
        integrations = integrations.filter(i => i.type !== 'voip')

        // Add new VOIP integration
        const newIntegration = {
          id: `integration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'voip',
          name: `VOIP (${body.provider})`,
          status: 'connected',
          config: {
            provider: body.provider,
            accountSid: body.accountSid,
            authToken: body.authToken,
            phoneNumber: body.phoneNumber
          },
          connectedAt: new Date().toISOString(),
          lastSync: new Date().toISOString()
        }

        integrations.push(newIntegration)

        if (supabase) {
          await supabase
            .from('kv_store_73685931')
            .upsert({
              key: integrationsKey,
              value: JSON.stringify(integrations)
            })
        }

        console.log("✅ VOIP integration saved")

        return jsonResponse({
          success: true,
          integration: newIntegration,
          message: 'Telefone VOIP conectado com sucesso!'
        })
      } catch (error) {
        console.error("❌ Error connecting VOIP:", error)
        return jsonResponse({
          error: 'Erro ao conectar VOIP',
          details: error.message
        }, 500)
      }
    }

    // DELETE /integrations/:id - Disconnect integration
    if (cleanPath.match(/^\/integrations\/[^\/]+$/) && method === 'DELETE') {
      const integrationId = cleanPath.split('/')[2]
      console.log("🗑️ Disconnecting integration:", integrationId)

      try {
        let integrations = []
        const integrationsKey = `user_integrations_${userId}`
        
        if (supabase) {
          const { data } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', integrationsKey)
            .single()
          
          if (data?.value) {
            integrations = JSON.parse(data.value)
          }
        }

        const initialLength = integrations.length
        integrations = integrations.filter(i => i.id !== integrationId)

        if (integrations.length === initialLength) {
          return jsonResponse({
            error: 'Integração não encontrada'
          }, 404)
        }

        if (supabase) {
          await supabase
            .from('kv_store_73685931')
            .upsert({
              key: integrationsKey,
              value: JSON.stringify(integrations)
            })
        }

        console.log("✅ Integration disconnected")

        return jsonResponse({
          success: true,
          message: 'Integração desconectada com sucesso!'
        })
      } catch (error) {
        console.error("❌ Error disconnecting integration:", error)
        return jsonResponse({
          error: 'Erro ao desconectar integração',
          details: error.message
        }, 500)
      }
    }

    // === CRM ENDPOINTS ===
    if (cleanPath === '/crm/leads' && method === 'GET') {
      let leads = []
      if (supabase) {
        try {
          const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', `user_crm_leads_${userId}`).single()
          if (data?.value) leads = JSON.parse(data.value)
        } catch (e) {}
      }
      return jsonResponse({ leads, total: leads.length })
    }
    if (cleanPath === '/crm/leads' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      let leads = []
      const leadsKey = `user_crm_leads_${userId}`
      if (supabase) {
        const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', leadsKey).single()
        if (data?.value) leads = JSON.parse(data.value)
      }
      const newLead = { id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, ...body, createdAt: new Date().toISOString() }
      leads.push(newLead)
      if (supabase) await supabase.from('kv_store_73685931').upsert({ key: leadsKey, value: JSON.stringify(leads) })
      return jsonResponse({ success: true, lead: newLead })
    }
    if (cleanPath.match(/^\/crm\/leads\/[^\/]+$/) && method === 'PUT') {
      const leadId = cleanPath.split('/')[3]
      const body = await req.json().catch(() => ({}))
      let leads = []
      const leadsKey = `user_crm_leads_${userId}`
      if (supabase) {
        const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', leadsKey).single()
        if (data?.value) leads = JSON.parse(data.value)
      }
      const index = leads.findIndex(l => l.id === leadId)
      if (index === -1) return jsonResponse({ error: 'Lead não encontrado' }, 404)
      leads[index] = { ...leads[index], ...body }
      if (supabase) await supabase.from('kv_store_73685931').upsert({ key: leadsKey, value: JSON.stringify(leads) })
      return jsonResponse({ success: true, lead: leads[index] })
    }
    if (cleanPath.match(/^\/crm\/leads\/[^\/]+$/) && method === 'DELETE') {
      const leadId = cleanPath.split('/')[3]
      let leads = []
      const leadsKey = `user_crm_leads_${userId}`
      if (supabase) {
        const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', leadsKey).single()
        if (data?.value) leads = JSON.parse(data.value)
      }
      leads = leads.filter(l => l.id !== leadId)
      if (supabase) await supabase.from('kv_store_73685931').upsert({ key: leadsKey, value: JSON.stringify(leads) })
      return jsonResponse({ success: true })
    }

    // === AGENTS ENDPOINTS ===
    if (cleanPath === '/agents' && method === 'GET') {
      let agents = []
      if (supabase) {
        try {
          const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', `user_agents_${userId}`).single()
          if (data?.value) agents = JSON.parse(data.value)
        } catch (e) {}
      }
      return jsonResponse({ agents, total: agents.length })
    }
    if (cleanPath === '/agents' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      let agents = []
      const agentsKey = `user_agents_${userId}`
      if (supabase) {
        const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', agentsKey).single()
        if (data?.value) agents = JSON.parse(data.value)
      }
      const newAgent = { id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, ...body, usageCount: 0, createdAt: new Date().toISOString() }
      agents.push(newAgent)
      if (supabase) await supabase.from('kv_store_73685931').upsert({ key: agentsKey, value: JSON.stringify(agents) })
      return jsonResponse({ success: true, agent: newAgent })
    }
    if (cleanPath.match(/^\/agents\/[^\/]+$/) && method === 'PUT') {
      const agentId = cleanPath.split('/')[2]
      const body = await req.json().catch(() => ({}))
      let agents = []
      const agentsKey = `user_agents_${userId}`
      if (supabase) {
        const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', agentsKey).single()
        if (data?.value) agents = JSON.parse(data.value)
      }
      const index = agents.findIndex(a => a.id === agentId)
      if (index === -1) return jsonResponse({ error: 'Agente não encontrado' }, 404)
      agents[index] = { ...agents[index], ...body }
      if (supabase) await supabase.from('kv_store_73685931').upsert({ key: agentsKey, value: JSON.stringify(agents) })
      return jsonResponse({ success: true, agent: agents[index] })
    }
    if (cleanPath.match(/^\/agents\/[^\/]+$/) && method === 'DELETE') {
      const agentId = cleanPath.split('/')[2]
      let agents = []
      const agentsKey = `user_agents_${userId}`
      if (supabase) {
        const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', agentsKey).single()
        if (data?.value) agents = JSON.parse(data.value)
      }
      agents = agents.filter(a => a.id !== agentId)
      if (supabase) await supabase.from('kv_store_73685931').upsert({ key: agentsKey, value: JSON.stringify(agents) })
      return jsonResponse({ success: true })
    }

    // === CAMPAIGNS ENDPOINTS ===
    if (cleanPath === '/campaigns' && method === 'GET') {
      let campaigns = []
      if (supabase) {
        try {
          const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', `user_campaigns_${userId}`).single()
          if (data?.value) campaigns = JSON.parse(data.value)
        } catch (e) {}
      }
      return jsonResponse({ campaigns, total: campaigns.length })
    }
    if (cleanPath === '/campaigns' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      let campaigns = []
      const campaignsKey = `user_campaigns_${userId}`
      if (supabase) {
        const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', campaignsKey).single()
        if (data?.value) campaigns = JSON.parse(data.value)
      }
      const newCampaign = { id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, ...body, sent: 0, delivered: 0, opened: 0, replied: 0, createdAt: new Date().toISOString() }
      campaigns.push(newCampaign)
      if (supabase) await supabase.from('kv_store_73685931').upsert({ key: campaignsKey, value: JSON.stringify(campaigns) })
      return jsonResponse({ success: true, campaign: newCampaign })
    }
    if (cleanPath.match(/^\/campaigns\/[^\/]+$/) && method === 'PUT') {
      const campaignId = cleanPath.split('/')[2]
      const body = await req.json().catch(() => ({}))
      let campaigns = []
      const campaignsKey = `user_campaigns_${userId}`
      if (supabase) {
        const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', campaignsKey).single()
        if (data?.value) campaigns = JSON.parse(data.value)
      }
      const index = campaigns.findIndex(c => c.id === campaignId)
      if (index === -1) return jsonResponse({ error: 'Campanha não encontrada' }, 404)
      campaigns[index] = { ...campaigns[index], ...body }
      if (supabase) await supabase.from('kv_store_73685931').upsert({ key: campaignsKey, value: JSON.stringify(campaigns) })
      return jsonResponse({ success: true, campaign: campaigns[index] })
    }
    if (cleanPath.match(/^\/campaigns\/[^\/]+$/) && method === 'DELETE') {
      const campaignId = cleanPath.split('/')[2]
      let campaigns = []
      const campaignsKey = `user_campaigns_${userId}`
      if (supabase) {
        const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', campaignsKey).single()
        if (data?.value) campaigns = JSON.parse(data.value)
      }
      campaigns = campaigns.filter(c => c.id !== campaignId)
      if (supabase) await supabase.from('kv_store_73685931').upsert({ key: campaignsKey, value: JSON.stringify(campaigns) })
      return jsonResponse({ success: true })
    }

    // === AUTOMATIONS ENDPOINTS ===
    if (cleanPath === '/automations' && method === 'GET') {
      let automations = []
      if (supabase) {
        try {
          const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', `user_automations_${userId}`).single()
          if (data?.value) automations = JSON.parse(data.value)
        } catch (e) {}
      }
      return jsonResponse({ automations, total: automations.length })
    }
    if (cleanPath === '/automations' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      let automations = []
      const automationsKey = `user_automations_${userId}`
      if (supabase) {
        const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', automationsKey).single()
        if (data?.value) automations = JSON.parse(data.value)
      }
      const newAutomation = { id: `automation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, ...body, executionsTotal: 0, listsGenerated: 0, campaignsSent: 0, repliesProcessed: 0, lastRun: null, createdAt: new Date().toISOString() }
      automations.push(newAutomation)
      if (supabase) await supabase.from('kv_store_73685931').upsert({ key: automationsKey, value: JSON.stringify(automations) })
      return jsonResponse({ success: true, automation: newAutomation })
    }
    if (cleanPath.match(/^\/automations\/[^\/]+$/) && method === 'PUT') {
      const automationId = cleanPath.split('/')[2]
      const body = await req.json().catch(() => ({}))
      let automations = []
      const automationsKey = `user_automations_${userId}`
      if (supabase) {
        const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', automationsKey).single()
        if (data?.value) automations = JSON.parse(data.value)
      }
      const index = automations.findIndex(a => a.id === automationId)
      if (index === -1) return jsonResponse({ error: 'Automação não encontrada' }, 404)
      automations[index] = { ...automations[index], ...body }
      if (supabase) await supabase.from('kv_store_73685931').upsert({ key: automationsKey, value: JSON.stringify(automations) })
      return jsonResponse({ success: true, automation: automations[index] })
    }
    if (cleanPath.match(/^\/automations\/[^\/]+$/) && method === 'DELETE') {
      const automationId = cleanPath.split('/')[2]
      let automations = []
      const automationsKey = `user_automations_${userId}`
      if (supabase) {
        const { data } = await supabase.from('kv_store_73685931').select('value').eq('key', automationsKey).single()
        if (data?.value) automations = JSON.parse(data.value)
      }
      automations = automations.filter(a => a.id !== automationId)
      if (supabase) await supabase.from('kv_store_73685931').upsert({ key: automationsKey, value: JSON.stringify(automations) })
      return jsonResponse({ success: true })
    }

    // === WHATSAPP INTEGRATION ENDPOINTS ===
    
    // POST /whatsapp/generate-qr - Gera QR Code REAL usando Evolution API
    if (cleanPath === '/whatsapp/generate-qr' && method === 'POST') {
      const body = await req.json().catch(() => ({}))
      console.log('📱 Generating REAL WhatsApp QR Code with Evolution API:', body)
      
      if (!body.name || !body.number) {
        return jsonResponse({ error: 'Nome e número são obrigatórios' }, 400)
      }
      
      try {
        // 1. Busca as credenciais da Evolution API salvas no Supabase
        const apiKeysData = await supabase
          .from('kv_store_73685931')
          .select('value')
          .eq('key', 'vai_api_keys')
          .single()
        
        if (!apiKeysData.data?.value) {
          return jsonResponse({ 
            error: 'Credenciais da Evolution API não configuradas. Configure no Painel Admin.' 
          }, 400)
        }
        
        const apiKeys = JSON.parse(apiKeysData.data.value)
        const evolutionUrl = apiKeys.evolutionApiUrl
        const evolutionApiKey = apiKeys.evolutionApiKey
        
        if (!evolutionUrl || !evolutionApiKey) {
          return jsonResponse({ 
            error: 'URL ou Chave da Evolution API não configuradas. Configure no Painel Admin.' 
          }, 400)
        }
        
        console.log('🔑 Using Evolution API:', evolutionUrl)
        
        // 2. Gera um nome único para a instância
        const instanceName = `vai_${Date.now()}_${Math.random().toString(36).substring(7)}`
        
        // 3. Cria a instância na Evolution API
        const createInstanceResponse = await fetch(`${evolutionUrl}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey
          },
          body: JSON.stringify({
            instanceName: instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS'
          })
        })
        
        if (!createInstanceResponse.ok) {
          const errorText = await createInstanceResponse.text()
          console.error('❌ Erro ao criar instância:', errorText)
          return jsonResponse({ 
            error: 'Erro ao criar instância na Evolution API. Verifique as credenciais.' 
          }, 500)
        }
        
        const instanceData = await createInstanceResponse.json()
        console.log('✅ Instância criada:', instanceData)
        
        // 4. Conecta a instância para gerar QR Code
        const connectResponse = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': evolutionApiKey
          }
        })
        
        if (!connectResponse.ok) {
          const errorText = await connectResponse.text()
          console.error('❌ Erro ao conectar instância:', errorText)
          return jsonResponse({ 
            error: 'Erro ao conectar instância na Evolution API.' 
          }, 500)
        }
        
        const connectData = await connectResponse.json()
        console.log('✅ QR Code gerado:', connectData)
        
        // 5. Extrai o QR Code
        const qrCodeBase64 = connectData.qrcode?.base64 || connectData.base64 || connectData.qr
        const qrCodeString = connectData.qrcode?.code || connectData.code || qrCodeBase64
        
        if (!qrCodeString) {
          return jsonResponse({ 
            error: 'QR Code não foi gerado. Tente novamente.' 
          }, 500)
        }
        
        // 6. Salva a sessão no Supabase
        const sessionId = instanceName
        const sessionsKey = 'whatsapp_sessions'
        
        let sessions = {}
        try {
          const { data: sessionsData, error: sessionsError } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', sessionsKey)
            .single()
          
          if (!sessionsError && sessionsData?.value) {
            sessions = JSON.parse(sessionsData.value)
          }
        } catch (e) {
          console.log("⚠️ No existing sessions")
        }
        
        sessions[sessionId] = {
          sessionId,
          instanceName,
          name: body.name,
          number: body.number,
          status: 'pending',
          qrCode: qrCodeString,
          createdAt: new Date().toISOString(),
          evolutionUrl,
          userId
        }
        
        await supabase
          .from('kv_store_73685931')
          .upsert({
            key: sessionsKey,
            value: JSON.stringify(sessions)
          })
        
        console.log('✅ Sessão salva no Supabase')
        
        return jsonResponse({
          success: true,
          qrCode: qrCodeString,
          sessionId,
          instanceName,
          message: 'QR Code gerado com sucesso! Escaneie com seu WhatsApp.'
        })
        
      } catch (error) {
        console.error('❌ Error generating QR code:', error)
        return jsonResponse({ 
          error: `Erro ao gerar QR Code: ${error.message}` 
        }, 500)
      }
    }
    
    // GET /whatsapp/check-connection/:sessionId - Verifica se o WhatsApp foi conectado (REAL)
    if (cleanPath.match(/^\/whatsapp\/check-connection\/[^\/]+$/) && method === 'GET') {
      const sessionId = cleanPath.split('/')[3]
      console.log('🔍 Checking REAL WhatsApp connection:', sessionId)
      
      try {
        // 1. Busca a sessão no Supabase
        const sessionsKey = 'whatsapp_sessions'
        let sessions = {}
        
        try {
          const { data: sessionsData, error: sessionsError } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', sessionsKey)
            .single()
          
          if (!sessionsError && sessionsData?.value) {
            sessions = JSON.parse(sessionsData.value)
          }
        } catch (e) {
          console.log("⚠️ No sessions found")
        }
        
        const session = sessions[sessionId]
        
        if (!session) {
          return jsonResponse({ error: 'Sessão não encontrada' }, 404)
        }
        
        // Se já está conectado, retorna
        if (session.status === 'connected') {
          return jsonResponse({
            connected: true,
            status: 'connected',
            session
          })
        }
        
        // 2. Busca credenciais da Evolution API
        let apiKeys = {}
        try {
          const { data: apiKeysData, error: apiKeysError } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', 'vai_api_keys')
            .single()
          
          if (apiKeysError || !apiKeysData?.value) {
            return jsonResponse({ 
              connected: false,
              status: 'pending'
            })
          }
          
          apiKeys = JSON.parse(apiKeysData.value)
        } catch (e) {
          return jsonResponse({ 
            connected: false,
            status: 'pending'
          })
        }
        const evolutionUrl = apiKeys.evolutionApiUrl
        const evolutionApiKey = apiKeys.evolutionApiKey
        
        if (!evolutionUrl || !evolutionApiKey) {
          return jsonResponse({ 
            connected: false,
            status: 'pending'
          })
        }
        
        // 3. Verifica status da instância na Evolution API
        const statusResponse = await fetch(`${evolutionUrl}/instance/connectionState/${sessionId}`, {
          method: 'GET',
          headers: {
            'apikey': evolutionApiKey
          }
        })
        
        if (!statusResponse.ok) {
          console.log('⚠️ Não foi possível verificar status na Evolution API')
          return jsonResponse({
            connected: false,
            status: 'pending'
          })
        }
        
        const statusData = await statusResponse.json()
        console.log('📊 Status Evolution API:', statusData)
        
        const isConnected = statusData.state === 'open' || statusData.instance?.state === 'open'
      
      if (isConnected && session.status !== 'connected') {
        // Atualiza o status da sessão
        session.status = 'connected'
        session.connectedAt = new Date().toISOString()
        sessions[sessionId] = session
        
        // Salva nas integrações do usuário
        const integrationsKey = `user_integrations_${session.userId}`
        let integrations = []
        
        if (supabase) {
          try {
            const { data } = await supabase
              .from('kv_store_73685931')
              .select('value')
              .eq('key', integrationsKey)
              .single()
            
            if (data?.value) {
              integrations = JSON.parse(data.value)
            }
          } catch (error) {
            console.log('⚠️ No existing integrations')
          }
          
          // Adiciona a integração WhatsApp
          integrations.push({
            id: `whatsapp_${Date.now()}`,
            type: 'whatsapp',
            name: session.name,
            status: 'connected',
            config: {
              sessionId,
              name: session.name,
              number: session.number,
              type: 'qrcode'
            },
            connectedAt: session.connectedAt,
            lastSync: new Date().toISOString()
          })
          
          await supabase
            .from('kv_store_73685931')
            .upsert({
              key: integrationsKey,
              value: JSON.stringify(integrations)
            })
          
          // Atualiza as sessões
          await supabase
            .from('kv_store_73685931')
            .upsert({
              key: sessionsKey,
              value: JSON.stringify(sessions)
            })
          
          console.log('✅ WhatsApp connection confirmed:', sessionId)
        }
      }
      
      return jsonResponse({
        connected: isConnected,
        status: session.status,
        session
      })
        
      } catch (error) {
        console.error('❌ Error checking WhatsApp connection:', error)
        return jsonResponse({ 
          connected: false,
          status: 'error',
          error: error.message 
        }, 500)
      }
    }
    
    // GET /whatsapp-connections - Lista todas as conexões WhatsApp do usuário
    if (cleanPath === '/whatsapp-connections' && method === 'GET') {
      console.log('📋 Fetching WhatsApp connections for user:', userId)
      
      try {
        const sessionsKey = 'whatsapp_sessions'
        let sessions = {}
        
        try {
          const { data: sessionsData, error: sessionsError } = await supabase
            .from('kv_store_73685931')
            .select('value')
            .eq('key', sessionsKey)
            .single()
          
          if (!sessionsError && sessionsData?.value) {
            sessions = JSON.parse(sessionsData.value)
          }
        } catch (e) {
          console.log("⚠️ No sessions found")
        }
        
        // Filtra sessões do usuário atual
        const userSessions = Object.values(sessions).filter(
          (session: any) => session.userId === userId
        )
        
        console.log(`✅ Found ${userSessions.length} WhatsApp connections`)
        
        return jsonResponse({
          success: true,
          connections: userSessions,
          total: userSessions.length
        })
        
      } catch (error) {
        console.error('❌ Error fetching WhatsApp connections:', error)
        return jsonResponse({ 
          error: 'Erro ao buscar conexões WhatsApp',
          details: error.message 
        }, 500)
      }
    }

    // 404 for unknown endpoints
    return jsonResponse({
      error: 'Endpoint não encontrado',
      path: cleanPath,
      available_endpoints: [
        'GET /ping',
        'POST /create-admin',
        'GET/POST /admin/api-keys',
        'GET /admin/dashboard', 
        'GET /cities/:state',
        'POST /generate-leads',
        'GET /lists',
        'POST /lists',
        'PUT /lists/:id',
        'DELETE /lists/:id',
        'GET /lists/:id/contacts',
        'GET /crm/leads',
        'POST /crm/leads',
        'PUT /crm/leads/:id',
        'DELETE /crm/leads/:id',
        'GET /agents',
        'POST /agents',
        'PUT /agents/:id',
        'DELETE /agents/:id',
        'GET /campaigns',
        'POST /campaigns',
        'PUT /campaigns/:id',
        'DELETE /campaigns/:id',
        'GET /automations',
        'POST /automations',
        'PUT /automations/:id',
        'DELETE /automations/:id',
        'GET /integrations',
        'POST /integrations/whatsapp',
        'POST /integrations/whatsapp/qr',
        'POST /integrations/social',
        'POST /integrations/voip',
        'DELETE /integrations/:id',
        'POST /whatsapp/generate-qr',
        'GET /whatsapp/check-connection/:sessionId',
        'GET /whatsapp-connections'
      ]
    }, 404)

  } catch (error) {
    console.error("❌ Server error:", error)
    return jsonResponse({
      error: 'Erro interno do servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    }, 500)
  }
})

console.log("✅ VAI Server v4.0 ready with REAL DATA ONLY from HasData API")