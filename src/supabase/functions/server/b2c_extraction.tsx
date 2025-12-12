// ===============================================
// B2C Extraction Logic - HasData API ONLY
// Handles both "by-niche" and "by-followers" modes
// Uses ONLY real data from HasData API - NO MOCK DATA
// ===============================================

import { 
  searchInstagramProfiles, 
  searchLinkedInProfiles,
  extractInstagramFollowers,
  extractLinkedInConnections
} from './social_apis.tsx'

interface B2CProfile {
  id: string
  name: string
  username: string
  platform: string
  profileUrl: string
  bio: string
  followers: number
  following?: number
  verified: boolean
  profilePicture?: string
  location: string
  category: string
  addedAt: string
  extractedFrom?: string
  source: string
  company?: string
  isPrivate?: boolean
}

/**
 * Main B2C extraction function
 * Supports two modes:
 * 1. by-followers: Extract followers from specific Instagram/LinkedIn profiles
 * 2. by-niche: Search for profiles matching a keyword/niche
 */
export async function extractB2CProfiles(
  extractionMode: string, 
  options: any, 
  supabase?: any
): Promise<B2CProfile[]> {
  const { 
    platform, 
    keyword, 
    category, 
    location, 
    followerLinks = [] 
  } = options

  let profiles: B2CProfile[] = []
  const errors: string[] = [] // Track errors for multiple profiles

  if (extractionMode === 'by-followers') {
    // ========================================
    // MODE 1: EXTRACT FOLLOWERS FROM PROFILES
    // ========================================
    console.log(`👥 Extracting REAL followers from ${followerLinks.length} profile(s) via HasData`)
    
    if (!supabase) {
      throw new Error('Configuração do sistema não disponível')
    }
    
    if (!followerLinks || followerLinks.length === 0) {
      throw new Error('Nenhum link de perfil foi fornecido. Adicione pelo menos um link do Instagram ou LinkedIn.')
    }
    
    for (const link of followerLinks) {
      try {
        if (link.includes('instagram.com')) {
          // Extract Instagram handle from URL
          const usernameMatch = link.match(/instagram\.com\/([^/?]+)/i)
          if (!usernameMatch) {
            errors.push(`Link inválido: ${link}`)
            console.log(`⚠️ Invalid Instagram link: ${link}`)
            continue
          }
          
          const handle = usernameMatch[1]
          console.log(`📱 Extracting Instagram followers from @${handle}...`)
          
          // Use HasData API to extract real followers
          const instagramFollowers = await extractInstagramFollowers(handle, 50, supabase)
          profiles.push(...instagramFollowers)
          
          console.log(`✅ Added ${instagramFollowers.length} real Instagram profiles from @${handle}`)
          
        } else if (link.includes('linkedin.com')) {
          // Extract LinkedIn handle from URL
          const usernameMatch = link.match(/linkedin\.com\/in\/([^/?]+)/i)
          if (!usernameMatch) {
            errors.push(`Link inválido: ${link}`)
            console.log(`⚠️ Invalid LinkedIn link: ${link}`)
            continue
          }
          
          const handle = usernameMatch[1]
          console.log(`💼 Extracting LinkedIn connections from ${handle}...`)
          
          // Use HasData API to extract real connections
          const linkedInConnections = await extractLinkedInConnections(handle, 50, supabase)
          profiles.push(...linkedInConnections)
          
          console.log(`✅ Added ${linkedInConnections.length} real LinkedIn profiles from ${handle}`)
          
        } else {
          errors.push(`Plataforma não suportada: ${link}`)
          console.log(`⚠️ Unsupported platform URL: ${link}`)
          continue
        }
      } catch (error) {
        console.error(`❌ Error extracting from ${link}:`, error)
        const errorMsg = error.message || 'Erro desconhecido'
        
        // More user-friendly error messages
        if (errorMsg.includes('não encontrado')) {
          errors.push(`❌ ${link}: Perfil não encontrado ou inacessível`)
        } else if (errorMsg.includes('privado')) {
          errors.push(`🔒 ${link}: Perfil privado (apenas perfis públicos podem ser extraídos)`)
        } else if (errorMsg.includes('autenticação')) {
          errors.push(`🔑 ${link}: Erro de autenticação - verifique a configuração da API no Painel Admin`)
        } else if (errorMsg.includes('Limite de requisições')) {
          errors.push(`⏱️ ${link}: Limite de requisições excedido - aguarde alguns minutos`)
        } else {
          errors.push(`⚠️ ${link}: ${errorMsg}`)
        }
        
        // Continue processing other profiles instead of stopping
        continue
      }
    }
    
    // If we have some profiles, return them with warnings about errors
    if (profiles.length > 0) {
      console.log(`✅ Total real profiles extracted via by-followers: ${profiles.length}`)
      if (errors.length > 0) {
        console.log(`⚠️ Warnings during extraction: ${errors.join('; ')}`)
      }
    } else if (errors.length > 0) {
      // No profiles extracted and we have errors
      throw new Error(`Não foi possível extrair dados de nenhum perfil:\n${errors.join('\n')}`)
    } else {
      throw new Error('Nenhum contato foi encontrado. Verifique os links e tente novamente.')
    }
    
  } else if (extractionMode === 'by-niche') {
    // ========================================
    // MODE 2: SEARCH PROFILES BY KEYWORD/NICHE
    // ========================================
    console.log(`🔍 Searching ${platform} profiles for keyword: "${keyword}" via HasData`)
    
    if (!keyword || keyword.trim() === '') {
      throw new Error('Palavra-chave não fornecida. Informe o nicho ou interesse para busca.')
    }
    
    if (!platform || (platform !== 'instagram' && platform !== 'linkedin')) {
      throw new Error('Plataforma inválida. Escolha Instagram ou LinkedIn.')
    }
    
    try {
      if (platform === 'instagram') {
        // Search Instagram profiles by keyword using HasData
        console.log(`📱 Searching Instagram for "${keyword}"...`)
        const instagramProfiles = await searchInstagramProfiles(keyword, location, 30, supabase)
        
        if (instagramProfiles.length === 0) {
          throw new Error(`Nenhum perfil encontrado no Instagram para "${keyword}". Tente outra palavra-chave.`)
        }
        
        profiles.push(...instagramProfiles)
        console.log(`✅ Found ${instagramProfiles.length} Instagram profiles for "${keyword}"`)
        
      } else if (platform === 'linkedin') {
        // Search LinkedIn profiles by keyword using HasData
        console.log(`💼 Searching LinkedIn for "${keyword}"...`)
        const linkedInProfiles = await searchLinkedInProfiles(keyword, location, 30, supabase)
        
        if (linkedInProfiles.length === 0) {
          throw new Error(`Nenhum perfil encontrado no LinkedIn para "${keyword}". Tente outra palavra-chave.`)
        }
        
        profiles.push(...linkedInProfiles)
        console.log(`✅ Found ${linkedInProfiles.length} LinkedIn profiles for "${keyword}"`)
      }
      
      console.log(`✅ Total real profiles extracted via by-niche: ${profiles.length}`)
      
    } catch (error) {
      console.error(`❌ Error searching profiles by niche:`, error)
      throw new Error(`Erro na busca por nicho: ${error.message}`)
    }
    
  } else {
    throw new Error(`Modo de extração inválido: ${extractionMode}. Use "by-followers" ou "by-niche".`)
  }

  return profiles
}