'use client'

import { useEffect, useRef } from 'react'

interface QrScannerProps {
  onScan: (text: string) => void
}

export default function QrScanner({ onScan }: QrScannerProps) {
  const onScanRef = useRef(onScan)
  const scannerRef = useRef<any>(null)
  const divId = 'qr-scanner-container'

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (!mounted) return

      const scanner = new Html5Qrcode(divId)
      scannerRef.current = scanner

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            onScanRef.current(decodedText)
          },
          undefined
        )
      } catch (err) {
        // Fallback to any available camera
        try {
          await scanner.start(
            { facingMode: 'user' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText: string) => {
              onScanRef.current(decodedText)
            },
            undefined
          )
        } catch (fallbackErr) {
          console.error('Camera not accessible:', fallbackErr)
        }
      }
    }

    init()

    return () => {
      mounted = false
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="relative">
      <div id={divId} className="overflow-hidden rounded-xl" />
      <p className="text-center text-xs text-gray-500 mt-3">
        Håll QR-koden stilla framför kameran
      </p>
    </div>
  )
}
