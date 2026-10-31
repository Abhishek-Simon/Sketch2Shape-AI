import React, { useEffect, useState, useRef } from 'react'
import {
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Box,
  Layers,
  ArrowRight
} from 'lucide-react'

const STAGES = [
  { id: 'upload', name: 'Uploading image', desc: 'Sending sketch payload to backend' },
  { id: 'sketch', name: 'Processing sketch', desc: 'Extracting contours & depth map' },
  { id: 'geometry', name: 'Generating geometry', desc: 'Synthesizing 3D spatial mesh' },
  { id: 'textures', name: 'Creating textures', desc: 'Applying PBR surface materials' },
  { id: 'export', name: 'Exporting GLB', desc: 'Packaging binary model asset' },
  { id: 'complete', name: 'Generation complete', desc: 'Asset ready in 3D viewport' },
]

export default function GenerationStatus({
  jobStatus = 'idle', // 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
  jobId = null,
  errorMessage = null,
  isGenerating = false,
  isModelReady = false,
  onRetry = () => {},
}) {
  const [progress, setProgress] = useState(0)
  const timerRef = useRef(null)

  // Synchronize progress with real backend/worker lifecycle
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (jobStatus === 'completed' && isModelReady) {
      setProgress(100)
      return
    }

    if (jobStatus === 'idle') {
      setProgress(0)
      return
    }

    if (jobStatus === 'failed') {
      return
    }

    if (jobStatus === 'queued') {
      // Step smoothly from 10% to 25% while waiting in worker queue
      setProgress((prev) => (prev < 10 ? 12 : prev))
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 25) {
            if (timerRef.current) clearInterval(timerRef.current)
            return 25
          }
          return prev + 2
        })
      }, 350)
      return
    }

    if (jobStatus === 'processing') {
      // Active GPU inference on Colab worker.
      // Progressively advance through stages, capped at 94% until GLB is fully verified
      setProgress((prev) => (prev < 30 ? 32 : prev))
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 94) {
            return 94
          }
          const increment = prev < 55 ? 3 : prev < 78 ? 2 : 1
          return prev + increment
        })
      }, 750)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [jobStatus, isModelReady])

  // Map current percentage and status to active stage index
  const getActiveStageIndex = () => {
    if (jobStatus === 'completed' && isModelReady) return 5
    if (jobStatus === 'idle') return -1
    if (jobStatus === 'failed') {
      if (progress < 25) return 1
      if (progress < 60) return 2
      if (progress < 80) return 3
      return 4
    }
    if (jobStatus === 'queued') {
      return progress < 15 ? 0 : 1
    }
    // Processing
    if (progress < 35) return 1
    if (progress < 65) return 2
    if (progress < 85) return 3
    return 4
  }

  const activeIndex = getActiveStageIndex()
  const isCompleted = jobStatus === 'completed' && isModelReady
  const isFailed = jobStatus === 'failed'
  const isRunning = isGenerating || jobStatus === 'queued' || jobStatus === 'processing'
  const isIdle = jobStatus === 'idle' && !isGenerating

  const currentStageName =
    isCompleted
      ? 'Generation complete'
      : activeIndex >= 0 && activeIndex < STAGES.length
      ? STAGES[activeIndex].name
      : 'Ready to generate'

  return (
    <div className="bg-white p-4 rounded-xl border border-surface-container-high shadow-card flex flex-col gap-4">
      {/* 1. Header with dynamic status badge */}
      <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
            isCompleted
              ? 'bg-secondary-light text-secondary'
              : isFailed
              ? 'bg-red-100 text-red-600'
              : isRunning
              ? 'bg-primary-light text-primary'
              : 'bg-surface-container text-on-surface-variant'
          }`}>
            {isCompleted ? (
              <Check className="w-4 h-4 stroke-[2.5]" />
            ) : isFailed ? (
              <AlertCircle className="w-4 h-4" />
            ) : isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </div>
          <h3 className="font-manrope text-sm font-bold text-main-text">
            {isCompleted ? 'Generation Complete' : isFailed ? 'Generation Failed' : 'Generating 3D Model'}
          </h3>
        </div>

        {/* Status Badge */}
        <span
          className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider border flex items-center gap-1.5 ${
            isCompleted
              ? 'bg-secondary-light text-secondary border-secondary/20'
              : isFailed
              ? 'bg-red-50 text-red-600 border-red-200'
              : isRunning
              ? 'bg-primary-light text-primary border-primary/20'
              : 'bg-surface-container text-on-surface-variant border-surface-container-high'
          }`}
        >
          {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />}
          <span>
            {isCompleted
              ? 'Ready'
              : isFailed
              ? 'Failed'
              : jobStatus === 'queued'
              ? 'Queued'
              : isRunning
              ? 'Active'
              : 'Standby'}
          </span>
        </span>
      </div>

      {/* 2. Large Percentage Indicator & Current Stage */}
      <div className="flex items-baseline justify-between pt-0.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-4xl font-extrabold font-manrope tracking-tight text-main-text">
              {progress}%
            </span>
            {isCompleted && (
              <span className="px-2 py-0.5 rounded-full bg-secondary-light text-secondary text-xs font-bold font-manrope">
                100% Done
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs font-medium">
            {isRunning && (
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
            )}
            <span
              className={
                isCompleted
                  ? 'text-secondary font-semibold'
                  : isFailed
                  ? 'text-red-600 font-semibold'
                  : isRunning
                  ? 'text-primary font-semibold'
                  : 'text-on-surface-variant'
              }
            >
              {currentStageName}
            </span>
          </div>
        </div>

        {jobId && (
          <span className="font-mono text-[10px] text-on-surface-variant/70 self-start">
            #{jobId.slice(0, 8)}
          </span>
        )}
      </div>

      {/* 3. Animated Horizontal Progress Bar */}
      <div className="w-full bg-surface-container-low rounded-full h-2.5 overflow-hidden p-0.5 border border-surface-container-high/60">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isCompleted
              ? 'bg-gradient-to-r from-secondary to-teal-400'
              : isFailed
              ? 'bg-red-500'
              : 'bg-gradient-to-r from-primary via-indigo-500 to-secondary'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 4. Idle Placeholder State */}
      {isIdle && (
        <div className="p-3 rounded-xl bg-surface-container-low/70 border border-surface-container-high/60 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-white border border-surface-container-high flex items-center justify-center text-primary shrink-0 shadow-xs">
            <Box className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="font-semibold text-main-text block">Awaiting Input</span>
            <span className="text-on-surface-variant leading-relaxed text-[11px] block mt-0.5">
              Draw a sketch on the canvas or upload an image, then click <strong className="text-primary font-semibold">Generate 3D Model</strong> to start the pipeline.
            </span>
          </div>
        </div>
      )}

      {/* 5. Error Alert & Retry Action */}
      {isFailed && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex flex-col gap-2.5 text-xs text-red-700 animate-fadeIn">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold block">Generation Error</span>
              <span className="text-[11px] text-red-600 leading-tight block mt-0.5 break-words">
                {errorMessage || 'Remote GPU worker encountered an error while reconstructing 3D mesh.'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="w-full py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Generation</span>
          </button>
        </div>
      )}

      {/* 6. Processing Stages Milestones */}
      <div className="flex flex-col gap-1.5 pt-1 border-t border-surface-container-low">
        <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mb-1 block">
          Pipeline Stages
        </span>

        {STAGES.map((stage, idx) => {
          const isStageCompleted = activeIndex > idx || (isCompleted && idx === 5)
          const isStageActive = activeIndex === idx && !isCompleted && !isFailed
          const isStageFailed = isFailed && activeIndex === idx
          const isStagePending = activeIndex < idx

          return (
            <div
              key={stage.id}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                isStageActive
                  ? 'bg-primary-light/50 border border-primary/30 text-primary font-semibold'
                  : isStageCompleted
                  ? 'bg-surface-container-low/60 border border-transparent text-main-text'
                  : isStageFailed
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'border border-transparent text-on-surface-variant/70'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Stage Status Icon */}
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                  {isStageCompleted ? (
                    <div className="w-4 h-4 rounded-full bg-secondary-light text-secondary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : isStageActive ? (
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  ) : isStageFailed ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-outline-variant/60" />
                  )}
                </div>

                <span className={`text-[11px] truncate ${isStageActive ? 'font-bold text-primary' : ''}`}>
                  {stage.name}
                </span>
              </div>

              <span className="font-mono text-[10px] shrink-0 text-on-surface-variant/80">
                {isStageCompleted ? (
                  <span className="text-secondary font-semibold">Done</span>
                ) : isStageActive ? (
                  <span className="text-primary font-semibold">In Progress</span>
                ) : isStageFailed ? (
                  <span className="text-red-600 font-semibold">Failed</span>
                ) : (
                  <span>Pending</span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
