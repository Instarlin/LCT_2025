import { useEffect, useRef } from 'react'
import { Enums, RenderingEngine, init as initCornerstoneCore } from '@cornerstonejs/core'
import { init as initDicomLoader, wadouri } from '@cornerstonejs/dicom-image-loader'
import type { DicomFile } from '@/lib/dicom/extract-dicoms'

const VIEWPORT_ID = 'upload-stack-viewport'
const RENDERING_ENGINE_ID = 'upload-rendering-engine'

let initializationPromise: Promise<void> | null = null

const ensureCornerstoneInitialized = () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await initCornerstoneCore()
      await initDicomLoader()
    })()
  }
  return initializationPromise
}

type DicomViewerProps = {
  files: DicomFile[]
  activeImageIndex: number
  className?: string
}

export const DicomViewer = ({ files, activeImageIndex, className }: DicomViewerProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const engineRef = useRef<RenderingEngine | null>(null)
  const imageIdsRef = useRef<string[]>([])

  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      if (!containerRef.current) return
      await ensureCornerstoneInitialized()
      if (cancelled) return

      if (!engineRef.current || engineRef.current.hasBeenDestroyed) {
        engineRef.current = new RenderingEngine(RENDERING_ENGINE_ID)
      }

      const renderingEngine = engineRef.current

      try {
        renderingEngine.disableElement(VIEWPORT_ID)
      } catch (error) {
        // viewport might not exist yet
      }

      renderingEngine.enableElement({
        viewportId: VIEWPORT_ID,
        element: containerRef.current,
        type: Enums.ViewportType.STACK,
        defaultOptions: {
          background: [0, 0, 0],
        },
      })
    }

    void setup()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!engineRef.current) return

    const renderingEngine = engineRef.current
    const viewport = renderingEngine.getViewport(VIEWPORT_ID)
    if (!viewport || viewport.type !== Enums.ViewportType.STACK) return
    const stackViewport = viewport as any

    if (files.length === 0) {
      imageIdsRef.current = []
      wadouri.fileManager.purge()
      renderingEngine.render()
      return
    }

    wadouri.fileManager.purge()
    const imageIds = files.map(({ file }) => wadouri.fileManager.add(file))
    imageIdsRef.current = imageIds
    const startIndex = Math.min(Math.max(activeImageIndex, 0), imageIds.length - 1)

    void stackViewport
      .setStack(imageIds, startIndex)
      .then(() => {
        stackViewport.render?.()
      })
      .catch((error: unknown) => {
        console.error('Не удалось обновить стек DICOM', error)
      })
  }, [files, activeImageIndex])

  useEffect(() => {
    if (!engineRef.current || imageIdsRef.current.length === 0) return
    const renderingEngine = engineRef.current
    const viewport = renderingEngine.getViewport(VIEWPORT_ID)
    if (!viewport || viewport.type !== Enums.ViewportType.STACK) return
    const stackViewport = viewport as any

    const clampedIndex = Math.min(Math.max(activeImageIndex, 0), imageIdsRef.current.length - 1)

    void stackViewport
      .setImageIdIndex(clampedIndex)
      .then(() => {
        stackViewport.render?.()
      })
      .catch((error: unknown) => {
        console.error('Не удалось переключить DICOM срез', error)
      })
  }, [activeImageIndex])

  useEffect(() => {
    const engine = engineRef.current
    return () => {
      if (engine && !engine.hasBeenDestroyed) {
        engine.destroy()
      }
      wadouri.fileManager.purge()
    }
  }, [])

  return <div ref={containerRef} className={className} />
}
