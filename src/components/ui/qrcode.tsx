import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface QRCodeCanvasProps {
  value: string
  size?: number
  level?: 'L' | 'M' | 'Q' | 'H'
  includeMargin?: boolean
}

export function QRCodeCanvas({ value, size = 256, level = 'H', includeMargin = true }: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: includeMargin ? 4 : 1,
          errorCorrectionLevel: level,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        },
        (error) => {
          if (error) {
            console.error('Error generating QR Code:', error)
          }
        }
      )
    }
  }, [value, size, level, includeMargin])

  return <canvas ref={canvasRef} />
}
