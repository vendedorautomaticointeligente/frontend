import React, { useState, useEffect } from 'react'
import { Download, Volume2, Play, Pause, AlertCircle, Loader2 } from 'lucide-react'

/**
 * MediaMessage Component
 * 
 * Renderiza mídia (áudio, imagem, vídeo, documento) dentro de mensagens
 * Suporta:
 * - 🎙️ Áudio com player HTML5 (incluindo voice messages)
 * - 📷 Imagem com preview e zoom
 * - 🎬 Vídeo com controles
 * - 📄 Documento com link de download
 * 
 * Props:
 * - type: 'audio' | 'image' | 'video' | 'document'
 * - data: objeto com url, caption, transcription, analysis, etc
 * - direction: 'sent' | 'received'
 * - messageId: ID para debugging
 * 
 * @author Sistema VAI
 * @version 1.0
 */

type MediaType = 'audio' | 'image' | 'video' | 'document'

interface MediaData {
  type?: string
  url?: string
  caption?: string
  filename?: string
  transcription?: string
  analysis?: string
  duration?: number
  mimetype?: string
  ptt?: boolean
  animated?: boolean
  analyzed_at?: string
}

interface MediaMessageProps {
  type: MediaType
  data: MediaData
  direction: 'sent' | 'received'
  messageId: string
  text?: string // Fallback text se não conseguir renderizar
}

/**
 * =============================================
 * COMPONENTE PRINCIPAL
 * =============================================
 */
export function MediaMessage({
  type,
  data,
  direction,
  messageId,
  text = ''
}: MediaMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Validações iniciais
  useEffect(() => {
    if (!data || !data.url) {
      setError('URL de mídia não encontrada')
    }
  }, [data])

  // Renderizar baseado no tipo
  if (error) {
    return <MediaError error={error} text={text} direction={direction} />
  }

  switch (type) {
    case 'audio':
      return (
        <AudioMessage
          data={data}
          direction={direction}
          messageId={messageId}
          onError={setError}
        />
      )

    case 'image':
      return (
        <ImageMessage
          data={data}
          direction={direction}
          messageId={messageId}
          onError={setError}
        />
      )

    case 'video':
      return (
        <VideoMessage
          data={data}
          direction={direction}
          messageId={messageId}
          onError={setError}
        />
      )

    case 'document':
      return (
        <DocumentMessage
          data={data}
          direction={direction}
          messageId={messageId}
          onError={setError}
        />
      )

    default:
      return <MediaError error={`Tipo de mídia desconhecido: ${type}`} text={text} direction={direction} />
  }
}

/**
 * =============================================
 * ÁUDIO (🎙️)
 * =============================================
 */

interface AudioMessageProps {
  data: MediaData
  direction: 'sent' | 'received'
  messageId: string
  onError: (error: string) => void
}

function AudioMessage({
  data,
  direction,
  messageId,
  onError
}: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showTranscription, setShowTranscription] = useState(false)
  const audioRef = React.useRef<HTMLAudioElement>(null)

  const isPTT = data.ptt ?? false
  const transcription = data.transcription
  const mediaType = isPTT ? 'Mensagem de Voz' : 'Áudio'
  const durationText = data.duration ? `${data.duration}s` : 'Duração desconhecida'

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch(err => {
          console.error('Erro ao reproduzir áudio:', err)
          onError('Erro ao reproduzir áudio')
        })
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      setDuration(audioRef.current.duration || 0)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercent = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className={`w-full space-y-2 ${direction === 'sent' ? 'items-end' : 'items-start'}`}>
      {/* Player de Áudio */}
      <div className={`
        w-64 p-3 rounded-lg border
        ${direction === 'sent'
          ? 'bg-blue-50 border-blue-200'
          : 'bg-gray-100 border-gray-300'
        }
      `}>
        {/* Cabeçalho */}
        <div className="flex items-center gap-2 mb-3">
          <Volume2 className={`w-4 h-4 ${direction === 'sent' ? 'text-blue-600' : 'text-gray-700'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${direction === 'sent' ? 'text-blue-900' : 'text-gray-900'}`}>
              🎙️ {mediaType}
            </p>
            <p className={`text-xs ${direction === 'sent' ? 'text-blue-700' : 'text-gray-600'}`}>
              {durationText}
            </p>
          </div>
        </div>

        {/* Controles de Áudio */}
        <div className="space-y-2">
          {/* Botão Play/Pause */}
          <button
            onClick={handlePlayPause}
            className={`
              w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md
              transition-colors font-medium text-sm
              ${direction === 'sent'
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
              }
            `}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Ouvir
              </>
            )}
          </button>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className={`w-full h-1 bg-gray-300 rounded-full overflow-hidden`}>
              <div
                className={`h-full transition-all ${direction === 'sent' ? 'bg-blue-500' : 'bg-gray-700'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs px-1">
              <span className={direction === 'sent' ? 'text-blue-700' : 'text-gray-700'}>
                {formatTime(currentTime)}
              </span>
              <span className={direction === 'sent' ? 'text-blue-600' : 'text-gray-600'}>
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Elemento de áudio oculto */}
          <audio
            ref={audioRef}
            src={data.url}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={(e) => {
              console.error('Erro no elemento audio:', e)
              onError('Erro ao carregar áudio')
            }}
          />

          {/* Botão para mostrar transcrição */}
          {transcription && (
            <button
              onClick={() => setShowTranscription(!showTranscription)}
              className={`
                w-full text-xs py-1 px-2 rounded transition-colors
                ${direction === 'sent'
                  ? showTranscription ? 'bg-blue-300 text-blue-900' : 'bg-blue-200 hover:bg-blue-300 text-blue-800'
                  : showTranscription ? 'bg-gray-400 text-gray-900' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }
              `}
            >
              {showTranscription ? '✓ Transcrição' : 'Ver Transcrição'}
            </button>
          )}
        </div>
      </div>

      {/* Transcrição (se disponível) */}
      {transcription && showTranscription && (
        <div className={`
          w-64 p-3 rounded-lg border text-sm
          ${direction === 'sent'
            ? 'bg-blue-50 border-blue-200 text-blue-900'
            : 'bg-gray-100 border-gray-300 text-gray-900'
          }
        `}>
          <p className="font-semibold text-xs mb-1">📝 Transcrição:</p>
          <p className="leading-relaxed break-words">{transcription}</p>
        </div>
      )}
    </div>
  )
}

/**
 * =============================================
 * IMAGEM (📷)
 * =============================================
 */

interface ImageMessageProps {
  data: MediaData
  direction: 'sent' | 'received'
  messageId: string
  onError: (error: string) => void
}

function ImageMessage({
  data,
  direction,
  messageId,
  onError
}: ImageMessageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const analysis = data.analysis
  const caption = data.caption

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    onError('Erro ao carregar imagem')
  }

  return (
    <div className={`w-full space-y-2 ${direction === 'sent' ? 'items-end' : 'items-start'}`}>
      {/* Container de Imagem */}
      <div className={`
        rounded-lg overflow-hidden border-2 transition-all
        ${isZoomed ? 'w-full' : 'w-64'}
        ${direction === 'sent' ? 'border-blue-300' : 'border-gray-300'}
      `}>
        {/* Loader */}
        {isLoading && (
          <div className={`
            w-full h-40 flex items-center justify-center
            ${direction === 'sent' ? 'bg-blue-100' : 'bg-gray-200'}
          `}>
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        )}

        {/* Imagem */}
        <img
          src={data.url}
          alt={caption || 'Imagem'}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onClick={() => setIsZoomed(!isZoomed)}
          className={`
            w-full h-auto cursor-pointer transition-transform
            ${!isLoading ? 'block' : 'hidden'}
            ${isZoomed ? 'max-h-96' : ''}
          `}
          style={{
            maxHeight: isZoomed ? '600px' : '300px',
            objectFit: 'contain'
          }}
        />
      </div>

      {/* Caption */}
      {caption && !isLoading && (
        <div className={`
          w-64 px-3 py-2 text-sm rounded
          ${direction === 'sent'
            ? 'bg-blue-50 text-blue-900'
            : 'bg-gray-100 text-gray-900'
          }
        `}>
          {caption}
        </div>
      )}

      {/* Botão para mostrar análise */}
      {analysis && !isLoading && (
        <button
          onClick={() => setShowAnalysis(!showAnalysis)}
          className={`
            w-64 text-xs py-2 px-3 rounded transition-colors
            ${direction === 'sent'
              ? showAnalysis ? 'bg-blue-300 text-blue-900' : 'bg-blue-200 hover:bg-blue-300 text-blue-800'
              : showAnalysis ? 'bg-gray-400 text-gray-900' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }
          `}
        >
          {showAnalysis ? '✓ Análise' : 'Ver Análise'}
        </button>
      )}

      {/* Análise da Imagem (se disponível) */}
      {analysis && showAnalysis && !isLoading && (
        <div className={`
          w-64 p-3 rounded-lg border text-sm
          ${direction === 'sent'
            ? 'bg-blue-50 border-blue-200 text-blue-900'
            : 'bg-gray-100 border-gray-300 text-gray-900'
          }
        `}>
          <p className="font-semibold text-xs mb-2">🔍 Análise:</p>
          <p className="leading-relaxed break-words">{analysis}</p>
        </div>
      )}

      {/* Informação de zoom */}
      {!isLoading && (
        <p className="text-xs text-gray-500 w-64 text-center">
          Clique na imagem para ampliar
        </p>
      )}
    </div>
  )
}

/**
 * =============================================
 * VÍDEO (🎬)
 * =============================================
 */

interface VideoMessageProps {
  data: MediaData
  direction: 'sent' | 'received'
  messageId: string
  onError: (error: string) => void
}

function VideoMessage({
  data,
  direction,
  messageId,
  onError
}: VideoMessageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const analysis = data.analysis
  const caption = data.caption
  const duration = data.duration

  return (
    <div className={`w-full space-y-2 ${direction === 'sent' ? 'items-end' : 'items-start'}`}>
      {/* Container de Vídeo */}
      <div className={`
        w-64 rounded-lg overflow-hidden border-2
        ${direction === 'sent' ? 'border-blue-300' : 'border-gray-300'}
      `}>
        {/* Vídeo com controles HTML5 */}
        <video
          src={data.url}
          controls
          onLoadedMetadata={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            onError('Erro ao carregar vídeo')
          }}
          className="w-full h-auto bg-black"
          style={{ maxHeight: '300px' }}
        >
          Seu navegador não suporta vídeo HTML5
        </video>
      </div>

      {/* Informação de Duração */}
      {duration && !isLoading && (
        <div className={`
          w-64 px-3 py-1 text-xs rounded
          ${direction === 'sent'
            ? 'text-blue-700'
            : 'text-gray-700'
          }
        `}>
          ⏱️ Duração: {duration}s
        </div>
      )}

      {/* Caption */}
      {caption && !isLoading && (
        <div className={`
          w-64 px-3 py-2 text-sm rounded
          ${direction === 'sent'
            ? 'bg-blue-50 text-blue-900'
            : 'bg-gray-100 text-gray-900'
          }
        `}>
          {caption}
        </div>
      )}

      {/* Análise do Vídeo (se disponível) */}
      {analysis && !isLoading && (
        <div className={`
          w-64 p-3 rounded-lg border text-sm
          ${direction === 'sent'
            ? 'bg-blue-50 border-blue-200 text-blue-900'
            : 'bg-gray-100 border-gray-300 text-gray-900'
          }
        `}>
          <p className="font-semibold text-xs mb-2">🔍 Análise:</p>
          <p className="leading-relaxed break-words">{analysis}</p>
        </div>
      )}
    </div>
  )
}

/**
 * =============================================
 * DOCUMENTO (📄)
 * =============================================
 */

interface DocumentMessageProps {
  data: MediaData
  direction: 'sent' | 'received'
  messageId: string
  onError: (error: string) => void
}

function DocumentMessage({
  data,
  direction,
  messageId,
  onError
}: DocumentMessageProps) {
  const filename = data.filename || 'documento'
  const caption = data.caption

  const handleDownload = () => {
    if (!data.url) {
      onError('URL do documento não disponível')
      return
    }

    // Criar link temporário e fazer download
    const link = document.createElement('a')
    link.href = data.url
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className={`w-full space-y-2 ${direction === 'sent' ? 'items-end' : 'items-start'}`}>
      {/* Card de Documento */}
      <div className={`
        w-64 p-3 rounded-lg border-2
        ${direction === 'sent'
          ? 'bg-blue-50 border-blue-300'
          : 'bg-gray-100 border-gray-300'
        }
      `}>
        {/* Info */}
        <div className="flex items-start gap-3 mb-2">
          <div className={`
            w-10 h-10 rounded flex items-center justify-center flex-shrink-0
            ${direction === 'sent' ? 'bg-blue-200' : 'bg-gray-300'}
          `}>
            <span className="text-lg">📄</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`
              text-sm font-medium truncate
              ${direction === 'sent' ? 'text-blue-900' : 'text-gray-900'}
            `}>
              {filename}
            </p>
          </div>
        </div>

        {/* Botão Download */}
        <button
          onClick={handleDownload}
          className={`
            w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md
            transition-colors font-medium text-sm
            ${direction === 'sent'
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-400 hover:bg-gray-500 text-white'
            }
          `}
        >
          <Download className="w-4 h-4" />
          Baixar
        </button>
      </div>

      {/* Caption */}
      {caption && (
        <div className={`
          w-64 px-3 py-2 text-sm rounded
          ${direction === 'sent'
            ? 'bg-blue-50 text-blue-900'
            : 'bg-gray-100 text-gray-900'
          }
        `}>
          {caption}
        </div>
      )}
    </div>
  )
}

/**
 * =============================================
 * ERRO
 * =============================================
 */

interface MediaErrorProps {
  error: string
  text?: string
  direction: 'sent' | 'received'
}

function MediaError({
  error,
  text,
  direction
}: MediaErrorProps) {
  return (
    <div className={`
      flex items-start gap-2 p-3 rounded-lg border
      ${direction === 'sent'
        ? 'bg-blue-50 border-blue-200'
        : 'bg-red-50 border-red-200'
      }
    `}>
      <AlertCircle className={`w-5 h-5 flex-shrink-0 ${direction === 'sent' ? 'text-blue-600' : 'text-red-600'}`} />
      <div className="flex-1">
        <p className={`text-sm font-medium ${direction === 'sent' ? 'text-blue-900' : 'text-red-900'}`}>
          {error}
        </p>
        {text && (
          <p className={`text-sm mt-1 ${direction === 'sent' ? 'text-blue-700' : 'text-red-700'}`}>
            {text}
          </p>
        )}
      </div>
    </div>
  )
}
