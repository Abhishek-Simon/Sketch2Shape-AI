import React, { useRef, useState, useEffect, useCallback } from 'react'
import { 
  Paintbrush, 
  Eraser, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Sparkles,
  Download
} from 'lucide-react'

export default function SketchCanvas({ onSketchChange }) {
  const canvasRef = useRef(null)
  const isInitializedRef = useRef(false)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef(null)
  const historyRef = useRef([])
  const historyStepRef = useRef(-1)
  const onSketchChangeRef = useRef(onSketchChange)

  const [tool, setTool] = useState('brush') // 'brush' | 'eraser'
  const [brushSize, setBrushSize] = useState(4)
  const [mirrorX, setMirrorX] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [historyLength, setHistoryLength] = useState(0)
  const [historyStep, setHistoryStep] = useState(-1)

  // Keep latest onSketchChange callback in ref without re-triggering effects
  useEffect(() => {
    onSketchChangeRef.current = onSketchChange
  }, [onSketchChange])

  // Helper to check if canvas has any non-transparent pixels
  const checkHasContent = (canvas) => {
    try {
      const ctx = canvas.getContext('2d')
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imgData.data
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return true
      }
    } catch {
      // In case context cannot be read
    }
    return false
  }

  // Draw starter sample (Drone sketch from Stitch reference) - kept functional for manual Preset button
  const drawSampleDrone = useCallback((targetCanvas) => {
    const canvas = targetCanvas || canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const w = canvas.width
    const h = canvas.height
    const cx = w / 2
    const cy = h / 2

    ctx.save()
    ctx.strokeStyle = '#252A3A'
    ctx.fillStyle = '#252A3A'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Central Core Body
    ctx.beginPath()
    ctx.ellipse(cx, cy, 55, 36, 0, 0, Math.PI * 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.setLineDash([4, 3])
    ctx.ellipse(cx, cy - 2, 32, 18, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Core sensor eye
    ctx.beginPath()
    ctx.strokeStyle = '#6655E8'
    ctx.lineWidth = 2
    ctx.arc(cx, cy - 4, 8, 0, Math.PI * 2)
    ctx.stroke()

    // Arms
    ctx.strokeStyle = '#252A3A'
    ctx.lineWidth = 2.2

    // Front-Left Arm & Rotor
    ctx.beginPath()
    ctx.moveTo(cx - 40, cy + 10)
    ctx.lineTo(cx - 95, cy + 45)
    ctx.lineTo(cx - 115, cy + 40)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(cx - 118, cy + 40, 32, 10, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Front-Right Arm & Rotor
    ctx.beginPath()
    ctx.moveTo(cx + 40, cy + 10)
    ctx.lineTo(cx + 95, cy + 45)
    ctx.lineTo(cx + 115, cy + 40)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(cx + 118, cy + 40, 32, 10, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Back-Left Arm & Rotor
    ctx.beginPath()
    ctx.moveTo(cx - 32, cy - 14)
    ctx.lineTo(cx - 88, cy - 44)
    ctx.lineTo(cx - 105, cy - 42)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(cx - 108, cy - 42, 26, 8, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Back-Right Arm & Rotor
    ctx.beginPath()
    ctx.moveTo(cx + 32, cy - 14)
    ctx.lineTo(cx + 88, cy - 44)
    ctx.lineTo(cx + 105, cy - 42)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(cx + 108, cy - 42, 26, 8, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Symmetry Centerline Guide
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(32, 184, 166, 0.45)'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.moveTo(cx, 15)
    ctx.lineTo(cx, h - 15)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.restore()
  }, [])

  // Save current canvas state to history stack and notify parent
  const saveState = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    const nextStep = historyStepRef.current + 1
    const nextHistory = historyRef.current.slice(0, nextStep)
    nextHistory.push(imageData)

    historyRef.current = nextHistory
    historyStepRef.current = nextStep

    setHistoryStep(nextStep)
    setHistoryLength(nextHistory.length)

    if (onSketchChangeRef.current) {
      const hasContent = checkHasContent(canvas)
      onSketchChangeRef.current(hasContent ? canvas.toDataURL('image/png') : null)
    }
  }, [])

  // Initialize canvas ONLY ONCE on mount as a clean, blank drawing surface
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || isInitializedRef.current) return
    isInitializedRef.current = true

    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.round(rect.width) || 340
    canvas.height = 230

    // Ensure canvas starts completely blank (do not auto-draw preset)
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    historyRef.current = [initialImageData]
    historyStepRef.current = 0

    setHistoryStep(0)
    setHistoryLength(1)

    // Notify parent that the canvas initializes empty
    if (onSketchChangeRef.current) {
      onSketchChangeRef.current(null)
    }
  }, [])

  // Preserve existing drawing across canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect()
      const newWidth = Math.round(rect.width)
      const newHeight = 230
      if (!newWidth || (canvas.width === newWidth && canvas.height === newHeight)) return

      // Copy existing canvas bitmap before resize
      const ctx = canvas.getContext('2d')
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height
      const tempCtx = tempCanvas.getContext('2d')
      tempCtx.drawImage(canvas, 0, 0)

      canvas.width = newWidth
      canvas.height = newHeight

      // Restore drawing onto resized canvas
      ctx.drawImage(tempCanvas, 0, 0)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Get pointer coordinates mapped to canvas pixel buffer
  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches
      ? (e.touches[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? 0)
      : e.clientX
    const clientY = e.touches
      ? (e.touches[0]?.clientY ?? e.changedTouches?.[0]?.clientY ?? 0)
      : e.clientY

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    isDrawingRef.current = true
    setIsDrawing(true)

    const coords = getCoordinates(e)
    lastPointRef.current = coords

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    ctx.save()
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#252A3A'
      ctx.beginPath()
      ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2)
      ctx.fill()

      if (mirrorX) {
        const centerX = canvas.width / 2
        const mirrorXPos = centerX + (centerX - coords.x)
        ctx.beginPath()
        ctx.arc(mirrorXPos, coords.y, brushSize / 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  const draw = (e) => {
    if (!isDrawingRef.current) return
    e.preventDefault()

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const currentPoint = getCoordinates(e)
    const lastPoint = lastPointRef.current || currentPoint

    ctx.save()
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = '#000000'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = '#252A3A'
    }

    // Main stroke
    ctx.beginPath()
    ctx.moveTo(lastPoint.x, lastPoint.y)
    ctx.lineTo(currentPoint.x, currentPoint.y)
    ctx.stroke()

    // Symmetrical stroke if mirrorX is enabled
    if (mirrorX) {
      const centerX = canvas.width / 2
      const mirrorLastX = centerX + (centerX - lastPoint.x)
      const mirrorCurrentX = centerX + (centerX - currentPoint.x)
      ctx.beginPath()
      ctx.moveTo(mirrorLastX, lastPoint.y)
      ctx.lineTo(mirrorCurrentX, currentPoint.y)
      ctx.stroke()
    }

    ctx.restore()
    lastPointRef.current = currentPoint
  }

  const stopDrawing = (e) => {
    if (!isDrawingRef.current) return
    e?.preventDefault()
    isDrawingRef.current = false
    setIsDrawing(false)
    lastPointRef.current = null
    saveState()
  }

  // Safety listener: if user releases pointer outside the canvas element
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false
        setIsDrawing(false)
        lastPointRef.current = null
        saveState()
      }
    }

    window.addEventListener('mouseup', handleGlobalPointerUp)
    window.addEventListener('touchend', handleGlobalPointerUp)

    return () => {
      window.removeEventListener('mouseup', handleGlobalPointerUp)
      window.removeEventListener('touchend', handleGlobalPointerUp)
    }
  }, [saveState])

  const handleUndo = () => {
    if (historyStepRef.current <= 0) return
    const prevStep = historyStepRef.current - 1
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    ctx.putImageData(historyRef.current[prevStep], 0, 0)
    historyStepRef.current = prevStep
    setHistoryStep(prevStep)

    if (onSketchChangeRef.current) {
      const hasContent = checkHasContent(canvas)
      onSketchChangeRef.current(hasContent ? canvas.toDataURL('image/png') : null)
    }
  }

  const handleRedo = () => {
    if (historyStepRef.current >= historyRef.current.length - 1) return
    const nextStep = historyStepRef.current + 1
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    ctx.putImageData(historyRef.current[nextStep], 0, 0)
    historyStepRef.current = nextStep
    setHistoryStep(nextStep)

    if (onSketchChangeRef.current) {
      const hasContent = checkHasContent(canvas)
      onSketchChangeRef.current(hasContent ? canvas.toDataURL('image/png') : null)
    }
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    saveState()
    if (onSketchChangeRef.current) {
      onSketchChangeRef.current(null)
    }
  }

  // Manually draw the starter drone preset when clicked
  const handleResetPreset = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawSampleDrone(canvas)
    saveState()
  }

  // Export the canvas as a downloadable PNG image
  const handleExportPNG = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Create a temporary canvas with a clean white background for the exported image
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvas.width
    exportCanvas.height = canvas.height
    const exportCtx = exportCanvas.getContext('2d')

    exportCtx.fillStyle = '#FFFFFF'
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    exportCtx.drawImage(canvas, 0, 0)

    const link = document.createElement('a')
    link.download = 'sketch_concept.png'
    link.href = exportCanvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Canvas Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-high/60">
        <div className="flex items-center gap-1 shrink-0">
          {/* Brush Tool */}
          <button
            type="button"
            onClick={() => setTool('brush')}
            className={`h-7 w-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
              tool === 'brush'
                ? 'bg-white text-primary shadow-xs ring-1 ring-primary/20 font-bold'
                : 'text-on-surface-variant hover:bg-white/80'
            }`}
            title="Brush Tool"
          >
            <Paintbrush className="w-3.5 h-3.5" />
          </button>

          {/* Eraser Tool */}
          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`h-7 w-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
              tool === 'eraser'
                ? 'bg-white text-primary shadow-xs ring-1 ring-primary/20 font-bold'
                : 'text-on-surface-variant hover:bg-white/80'
            }`}
            title="Eraser Tool"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-surface-container-high mx-0.5" />

          {/* Undo */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyStep <= 0}
            className="h-7 w-7 rounded-md text-on-surface-variant hover:bg-white/80 flex items-center justify-center transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
            title="Undo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Redo */}
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyStep >= historyLength - 1}
            className="h-7 w-7 rounded-md text-on-surface-variant hover:bg-white/80 flex items-center justify-center transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
            title="Redo"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Export PNG */}
          <button
            type="button"
            onClick={handleExportPNG}
            className="h-7 flex items-center gap-1.5 px-2 text-on-surface-variant hover:text-primary hover:bg-white/80 text-[11px] font-medium rounded-md transition-colors cursor-pointer shrink-0"
            title="Export sketch as PNG image"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {/* Sample Preset reload - draws starter drone sketch when clicked manually */}
          <button
            type="button"
            onClick={handleResetPreset}
            className="h-7 flex items-center gap-1.5 px-2 text-primary hover:bg-white/80 text-[11px] font-medium rounded-md transition-colors cursor-pointer shrink-0"
            title="Draw Concept Sketch Preset"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Preset</span>
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={handleClear}
            className="h-7 flex items-center gap-1.5 px-2 text-on-surface-variant hover:text-red-600 hover:bg-red-50 text-[11px] font-medium rounded-md transition-colors cursor-pointer shrink-0"
            title="Clear Canvas"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Sketch Board Canvas */}
      <div className="relative w-full h-[230px] rounded-xl bg-white border border-surface-container-high overflow-hidden shadow-inner group">
        {/* Subtle grid pattern background */}
        <div 
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#dde2f7 1.2px, transparent 1.2px)',
            backgroundSize: '12px 12px'
          }}
        />

        {/* Symmetry Line Indicator (Visible when Mirror is active) */}
        {mirrorX && (
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-secondary/60 pointer-events-none z-10" />
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          className="relative z-10 w-full h-full block cursor-crosshair touch-none"
        />

        {/* Floating Canvas Watermark Status */}
        <div className="absolute bottom-2 right-2 z-20 px-2 py-0.5 rounded bg-surface-container-high/90 text-on-surface-variant font-mono text-[10px] flex items-center gap-1.5 shadow-xs backdrop-blur-xs pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
          <span>Active: {tool === 'eraser' ? 'Eraser' : 'Pen'} ({brushSize}px)</span>
        </div>
      </div>

      {/* Brush Size Slider & Symmetry Controls */}
      <div className="flex items-center justify-between gap-3 px-1 pt-0.5">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-on-surface-variant font-medium">Size</span>
          <input
            type="range"
            min="1"
            max="24"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
            className="w-full h-1 bg-surface-container rounded-lg appearance-none cursor-pointer"
          />
          <div className="w-5 h-5 rounded-full bg-surface-container-low flex items-center justify-center shrink-0 border border-surface-container-high">
            <div 
              className="rounded-full bg-primary"
              style={{ width: `${Math.max(3, Math.min(14, brushSize))}px`, height: `${Math.max(3, Math.min(14, brushSize))}px` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-on-surface-variant hover:text-main-text select-none">
            <input
              type="checkbox"
              checked={mirrorX}
              onChange={(e) => setMirrorX(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-primary focus:ring-0 accent-primary cursor-pointer"
            />
            <span>Mirror X</span>
          </label>
        </div>
      </div>
    </div>
  )
}
