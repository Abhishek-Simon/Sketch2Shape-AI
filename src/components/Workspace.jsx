import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Pencil,
  UploadCloud
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
  const [prompt, setPrompt] = useState('')
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
    <div className="w-full px-3 sm:px-5 lg:px-8 py-4 sm:py-6 max-w-[1720px] mx-auto">
      {/* 3-Column Studio Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* ================= LEFT COLUMN: SKETCH INPUT ================= */}
        <section className="lg:col-span-3 xl:col-span-3 flex flex-col h-full">
          <div className="bg-white p-4 rounded-xl border border-surface-container-high shadow-card flex flex-col justify-between h-full gap-4">
            <div className="flex flex-col gap-4">
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
            </div>

            {/* Prompt Input & Generate Button */}
            <div className="pt-2 border-t border-surface-container-low">
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
          </div>
        </section>

        {/* ================= CENTER COLUMN: 3D PREVIEW ================= */}
        <section className="lg:col-span-6 xl:col-span-6 flex flex-col h-full">
          <ModelViewer
            modelUrl={modelUrl}
            modelName={
              isModelReady
                ? `model_${jobId ? jobId.slice(0, 8) : 'asset'}.glb`
                : null
            }
            statusText={isModelReady ? 'Generated Mesh' : null}
          />
        </section>

        {/* ================= RIGHT COLUMN: GENERATION STATUS & EXPORT ================= */}
        <section className="lg:col-span-3 xl:col-span-3 flex flex-col gap-4 h-full">
          <GenerationStatus
            jobStatus={jobStatus}
            jobId={jobId}
            errorMessage={validationError}
            isGenerating={isGenerating}
            isModelReady={isModelReady}
            onRetry={handleGenerate}
          />
          <ExportPanel
            isModelAvailable={isModelReady}
            modelUrl={modelUrl}
            jobId={jobId}
            modelName={jobId ? `sketch2shape_${jobId.slice(0, 8)}` : 'sketch2shape_model'}
          />
        </section>
      </div>
    </div>
  )
}
