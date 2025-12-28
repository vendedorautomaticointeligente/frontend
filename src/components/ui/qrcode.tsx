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
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!value) return

    // Check if value is already a data URI (from backend QR generation)
    if (value.startsWith('data:image')) {
      // It's a ready-made image, display it directly using img tag
      if (imgRef.current) {
        imgRef.current.src = value
        imgRef.current.style.display = 'block'
      }
      if (canvasRef.current) {
        canvasRef.current.style.display = 'none'
      }
    } else {
      // It's plain text, generate QR code from it
      if (canvasRef.current) {
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
        canvasRef.current.style.display = 'block'
      }
      if (imgRef.current) {
        imgRef.current.style.display = 'none'
      }
    }
  }, [value, size, level, includeMargin])

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      <img ref={imgRef} style={{ display: 'none', maxWidth: `${size}px`, maxHeight: `${size}px` }} alt="QR Code" />
    </>
  )
}
