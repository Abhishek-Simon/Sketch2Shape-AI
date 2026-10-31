import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronRight,
  History,
  Share2,
  Wand2,
  Pencil,
  UploadCloud,
  Headphones,
  Armchair,
  FlaskConical
} from 'lucide-react'

import SketchCanvas from './SketchCanvas'
import UploadImage from './UploadImage'
import PromptInput from './PromptInput'
import ModelViewer from './ModelViewer'
import GenerationStatus from './GenerationStatus'
import ExportPanel from './ExportPanel'
import {
  generate3DModel,
  getJobStatus,
  resolveModelUrl,
  getApiErrorMessage
} from '../services/api'

export default function Workspace() {
  const [inputMode, setInputMode] = useState('draw') // 'draw' | 'upload'
  const [sketchImage, setSketchImage] = useState(null)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [prompt, setPrompt] = useState(
    'Futuristic robotic drone with metallic violet shell, teal sensor ring, and ceramic camera lens'
  )
  const [validationError, setValidationError] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [jobStatus, setJobStatus] = useState('idle') // 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
  const [isModelReady, setIsModelReady] = useState(false)
  const [modelUrl, setModelUrl] = useState(null)

  const pollingTimerRef = useRef(null)

  // Stop polling helper
  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current)
      pollingTimerRef.current = null
    }
  }, [])

  // Clean up polling timer on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  // Poll GET /api/status/{job_id} until completed or failed
  const startPolling = useCallback(
    (targetJobId) => {
      stopPolling()

      const checkStatus = async () => {
        try {
          const statusRes = await getJobStatus(targetJobId)
          const currentStatus = statusRes.status

          setJobStatus(currentStatus)

          if (currentStatus === 'completed') {
            stopPolling()
            setIsGenerating(false)
            if (statusRes.model_url) {
              const fullUrl = resolveModelUrl(statusRes.model_url)
              setModelUrl(fullUrl)
              setIsModelReady(true)
            }
          } else if (currentStatus === 'failed') {
            stopPolling()
            setIsGenerating(false)
            setValidationError(statusRes.error || 'Generation failed on backend.')
          }
        } catch (err) {
          console.error('Job status polling error:', err)
          stopPolling()
          setIsGenerating(false)
          setValidationError(getApiErrorMessage(err))
          setJobStatus('failed')
        }
      }

      // Initial check after 1.5s, then every 2s
      pollingTimerRef.current = setInterval(checkStatus, 2000)
    },
    [stopPolling]
  )

  // Handle starter template selection
  const handleSelectTemplate = (templateName) => {
    setValidationError(null)
    if (templateName === 'Mech Helmet') {
      setPrompt('Tactical mecha cyber-helmet with neon cyan visor and carbon fiber plating')
    } else if (templateName === 'Ergo Armchair') {
      setPrompt('Minimalist ergonomic lounge armchair with sculpted birch wood and soft wool fabric')
    } else if (templateName === 'Flask Asset') {
      setPrompt('Sci-fi alchemical energy flask containing swirling azure plasma liquid')
    }
  }

  // Handle generation trigger with validation
  const handleGenerate = async () => {
    // Prevent duplicate submissions while request is active
    if (isGenerating) return

    setValidationError(null)

    // Validate that either a sketch or uploaded image exists
    const hasSketch = Boolean(sketchImage)
    const hasUpload = Boolean(uploadedImage?.file || uploadedImage?.dataUrl)

    if (!hasSketch && !hasUpload) {
      setValidationError('Please draw a sketch or upload an image before generating a 3D model.')
      return
    }

    // Prepare payload ensuring we do not send both inputs simultaneously
    let payload = {}
    if (inputMode === 'draw') {
      if (!hasSketch && hasUpload) {
        setInputMode('upload')
        payload = { file: uploadedImage.file, prompt, mode: 'upload' }
      } else {
        payload = { image: sketchImage, prompt, mode: 'draw' }
      }
    } else {
      if (!hasUpload && hasSketch) {
        setInputMode('draw')
        payload = { image: sketchImage, prompt, mode: 'draw' }
      } else {
        payload = { file: uploadedImage.file, prompt, mode: 'upload' }
      }
    }

    try {
      setIsGenerating(true)
      setJobStatus('queued')
      setIsModelReady(false)
      setModelUrl(null)

      // 1. Submit input to POST /api/generate
      const response = await generate3DModel(payload)
      const newJobId = response.job_id

      setJobId(newJobId)
      setJobStatus(response.status || 'queued')

      // 2. Start polling GET /api/status/{job_id}
      startPolling(newJobId)
    } catch (err) {
      console.error('Generation pipeline error:', err)
      setValidationError(getApiErrorMessage(err))
      setJobStatus('failed')
      setIsGenerating(false)
    }
  }

  // Active preview image for metadata inspection
  const currentPreview = inputMode === 'upload' && uploadedImage
    ? uploadedImage.dataUrl
    : sketchImage

  // Memoized handlers for canvas and upload components
  const handleSketchChange = useCallback((img) => {
    setSketchImage(img)
    if (img) setValidationError(null)
  }, [])

  const handleImageSelected = useCallback((img) => {
    setUploadedImage(img)
    if (img) setValidationError(null)
  }, [])

  return (
    <div className="w-full px-3 sm:px-5 lg:px-8 py-4 sm:py-6 max-w-[1680px] mx-auto">
      {/* Top Studio Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 bg-white p-3 px-4 rounded-xl border border-surface-container-high shadow-card">
        {/* Left: Session Breadcrumbs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
            <span>Workspaces</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-main-text font-semibold">
              {jobId ? `Job #${jobId.slice(0, 8)}` : 'Generative Session #084'}
            </span>
          </div>

          <span className="hidden md:inline-block w-1 h-1 rounded-full bg-outline-variant" />

          {/* Dynamic pipeline status badge */}
          <div className="hidden md:flex items-center gap-1.5 text-secondary text-xs font-semibold bg-secondary-light px-2.5 py-0.5 rounded-full border border-secondary/20">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isGenerating
                  ? 'bg-primary animate-ping'
                  : jobStatus === 'completed'
                  ? 'bg-secondary'
                  : jobStatus === 'failed'
                  ? 'bg-red-500'
                  : 'bg-secondary'
              }`}
            />
            <span className="capitalize">
              {isGenerating
                ? jobStatus === 'queued'
                  ? 'Job Queued'
                  : 'Processing Pipeline...'
                : jobStatus === 'completed'
                ? 'Model Ready'
                : 'Pipeline Standby'}
            </span>
          </div>
        </div>

        {/* Right: Studio Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container border border-surface-container-high text-on-surface-variant text-xs font-medium transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>Version 2.4</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container border border-surface-container-high text-on-surface-variant text-xs font-medium transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Collaborate</span>
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-opacity disabled:opacity-60 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Synthesizing...' : 'Quick Bake'}</span>
          </button>
        </div>
      </div>

      {/* 3-Column Studio Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================= LEFT COLUMN: SKETCH INPUT ================= */}
        <section className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-xl border border-surface-container-high shadow-card flex flex-col gap-4">
            {/* Heading */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-manrope text-base font-bold text-main-text">
                  Create Your 3D Model
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-primary-light text-primary font-mono text-[10px] font-semibold uppercase tracking-wider border border-primary/20">
                  v2.1
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Transform hand-drawn sketches or images into textured 3D assets
              </p>
            </div>

            {/* Segmented Tab Toggle */}
            <div className="grid grid-cols-2 p-1 rounded-lg bg-surface-container-low border border-surface-container-high/60 gap-1">
              <button
                type="button"
                onClick={() => {
                  setInputMode('draw')
                  setValidationError(null)
                }}
                className={`py-1.5 text-center text-xs rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  inputMode === 'draw'
                    ? 'bg-white text-main-text shadow-sm ring-1 ring-black/5'
                    : 'text-on-surface-variant hover:text-main-text'
                }`}
              >
                <Pencil className="w-3.5 h-3.5 text-primary" />
                <span>Draw Sketch</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode('upload')
                  setValidationError(null)
                }}
                className={`py-1.5 text-center text-xs rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  inputMode === 'upload'
                    ? 'bg-white text-main-text shadow-sm ring-1 ring-black/5'
                    : 'text-on-surface-variant hover:text-main-text'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5 text-primary" />
                <span>Upload Image</span>
              </button>
            </div>

            {/* Active Input Tool: Canvas or Upload */}
            {inputMode === 'draw' ? (
              <SketchCanvas onSketchChange={handleSketchChange} />
            ) : (
              <UploadImage
                onImageSelected={handleImageSelected}
                currentImage={uploadedImage}
              />
            )}

            {/* Prompt Input */}
            <PromptInput
              prompt={prompt}
              onPromptChange={(newPrompt) => {
                setPrompt(newPrompt)
              }}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              validationError={validationError}
            />
          </div>

          {/* Starter Sketch Templates Card */}
          <div className="bg-white p-4 rounded-xl border border-surface-container-high shadow-card flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-main-text">
                Starter Sketch Templates
              </span>
              <span className="font-mono text-[10px] text-primary hover:underline cursor-pointer">
                Explore All
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div
                onClick={() => handleSelectTemplate('Mech Helmet')}
                className="group rounded-lg overflow-hidden bg-surface-container-low border border-surface-container-high/60 hover:border-primary/40 p-2 text-center hover:bg-surface-container transition-all cursor-pointer"
                title="Use Mech Helmet prompt & style"
              >
                <div className="w-full h-10 rounded bg-white flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                  <Headphones className="w-4 h-4" />
                </div>
                <span className="font-mono text-[10px] text-main-text mt-1.5 block truncate font-medium">
                  Mech Helmet
                </span>
              </div>

              <div
                onClick={() => handleSelectTemplate('Ergo Armchair')}
                className="group rounded-lg overflow-hidden bg-surface-container-low border border-surface-container-high/60 hover:border-primary/40 p-2 text-center hover:bg-surface-container transition-all cursor-pointer"
                title="Use Ergo Armchair prompt & style"
              >
                <div className="w-full h-10 rounded bg-white flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                  <Armchair className="w-4 h-4" />
                </div>
                <span className="font-mono text-[10px] text-main-text mt-1.5 block truncate font-medium">
                  Ergo Armchair
                </span>
              </div>

              <div
                onClick={() => handleSelectTemplate('Flask Asset')}
                className="group rounded-lg overflow-hidden bg-surface-container-low border border-surface-container-high/60 hover:border-primary/40 p-2 text-center hover:bg-surface-container transition-all cursor-pointer"
                title="Use Flask Asset prompt & style"
              >
                <div className="w-full h-10 rounded bg-white flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <span className="font-mono text-[10px] text-main-text mt-1.5 block truncate font-medium">
                  Flask Asset
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= CENTER COLUMN: 3D PREVIEW ================= */}
        <section className="lg:col-span-6 flex flex-col gap-4">
          <ModelViewer
            modelUrl={modelUrl}
            modelName={
              isModelReady
                ? `model_${jobId ? jobId.slice(0, 8) : 'asset'}.glb`
                : 'Sample 3D Preview'
            }
            statusText={isModelReady ? 'Generated Mesh' : 'Sample Scene'}
          />
        </section>

        {/* ================= RIGHT COLUMN: GENERATION STATUS & EXPORT ================= */}
        <section className="lg:col-span-3 flex flex-col gap-4">
          <GenerationStatus
            jobStatus={jobStatus}
            jobId={jobId}
            errorMessage={validationError}
            isGenerating={isGenerating}
            isModelReady={isModelReady}
            previewImage={currentPreview}
            promptText={prompt}
            inputName={
              inputMode === 'draw'
                ? (sketchImage ? 'canvas_sketch.png' : null)
                : uploadedImage?.name
            }
            inputDimensions={
              inputMode === 'draw'
                ? (sketchImage ? 'HTML Canvas Sketch' : null)
                : (uploadedImage?.width && uploadedImage?.height ? `${uploadedImage.width} × ${uploadedImage.height} px` : null)
            }
            inputMode={inputMode}
          />
          <ExportPanel
            isModelAvailable={isModelReady}
            modelUrl={modelUrl}
            objUrl={null}
            modelName={jobId ? `sketch2shape_${jobId.slice(0, 8)}` : 'sketch2shape_model'}
          />
        </section>
      </div>
    </div>
  )
}
