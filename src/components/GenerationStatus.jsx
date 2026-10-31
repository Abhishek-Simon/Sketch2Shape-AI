import React, { useEffect, useState, useRef } from 'react'
import {
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Box,
  Layers
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
    <div className="bg-white p-4 rounded-xl border border-surface-container-high shadow-card flex flex-col gap-3 select-none">
      {/* 1. Header with dynamic status badge */}
      <div className="flex items-center justify-between pb-2 border-b border-surface-container-low h-8">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
              isCompleted
                ? 'bg-secondary-light text-secondary'
                : isFailed
                ? 'bg-red-100 text-red-600'
                : isRunning
                ? 'bg-primary-light text-primary'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {isCompleted ? (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : isFailed ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
          </div>
          <h3 className="font-manrope text-xs font-bold text-main-text">
            {isCompleted ? 'Generation Complete' : isFailed ? 'Generation Failed' : 'Generating 3D Model'}
          </h3>
        </div>

        {/* Status Badge */}
        <span
          className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-semibold uppercase tracking-wider border flex items-center gap-1.5 ${
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

      {/* 2. Large Percentage Indicator & Current Stage (Fixed Height: 52px) */}
      <div className="flex items-baseline justify-between h-[52px]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-extrabold font-manrope tracking-tight text-main-text leading-none">
              {progress}%
            </span>
            {isCompleted && (
              <span className="px-1.5 py-0.5 rounded-full bg-secondary-light text-secondary text-[10px] font-bold font-manrope">
                100% Done
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs font-medium">
            {isRunning && (
              <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
            )}
            <span
              className={`truncate text-xs ${
                isCompleted
                  ? 'text-secondary font-semibold'
                  : isFailed
                  ? 'text-red-600 font-semibold'
                  : isRunning
                  ? 'text-primary font-semibold'
                  : 'text-on-surface-variant'
              }`}
            >
              {currentStageName}
            </span>
          </div>
        </div>

        {jobId && (
          <span className="font-mono text-[9px] text-on-surface-variant/70 self-start">
            #{jobId.slice(0, 8)}
          </span>
        )}
      </div>

      {/* 3. Animated Horizontal Progress Bar (Fixed Height: 10px) */}
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

      {/* 4. Permanently Anchored Status Banner (Fixed Constant Height: 58px across all states) */}
      <div className="h-[58px] p-2.5 rounded-xl border flex items-center overflow-hidden transition-all bg-surface-container-low/60 border-surface-container-high/60">
        {isIdle && (
          <div className="flex items-center gap-2.5 text-xs text-on-surface-variant w-full">
            <div className="w-7 h-7 rounded-lg bg-white border border-surface-container-high flex items-center justify-center text-primary shrink-0 shadow-xs">
              <Box className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-main-text text-xs block leading-tight">Awaiting Input</span>
              <span className="text-on-surface-variant text-[10px] leading-tight block truncate mt-0.5">
                Draw or upload an image to start 3D generation.
              </span>
            </div>
          </div>
        )}

        {isRunning && (
          <div className="flex items-center gap-2.5 text-xs text-primary w-full">
            <div className="w-7 h-7 rounded-lg bg-white border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-main-text text-xs block leading-tight">Inference in Progress</span>
              <span className="text-on-surface-variant text-[10px] leading-tight block truncate mt-0.5">
                Colab GPU worker synthesizing 3D mesh & textures.
              </span>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="flex items-center gap-2.5 text-xs text-secondary w-full">
            <div className="w-7 h-7 rounded-lg bg-white border border-secondary/20 flex items-center justify-center text-secondary shrink-0 shadow-xs">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-main-text text-xs block leading-tight">Asset Ready</span>
              <span className="text-on-surface-variant text-[10px] leading-tight block truncate mt-0.5">
                GLB loaded in viewport. All formats ready to download.
              </span>
            </div>
          </div>
        )}

        {isFailed && (
          <div className="flex items-center justify-between w-full gap-2 text-xs text-red-700">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-xs block leading-tight">Generation Error</span>
                <span className="text-[10px] text-red-600 leading-tight block truncate mt-0.5">
                  {errorMessage || 'Inference error on GPU worker.'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="py-1 px-2 rounded-md bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-colors shadow-xs"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Processing Stages Milestones (Fixed Heights) */}
      <div className="flex flex-col gap-1 pt-1 border-t border-surface-container-low">
        <span className="font-mono text-[9px] uppercase font-bold tracking-wider text-on-surface-variant mb-0.5 block">
          Pipeline Stages
        </span>

        {STAGES.map((stage, idx) => {
          const isStageCompleted = activeIndex > idx || (isCompleted && idx === 5)
          const isStageActive = activeIndex === idx && !isCompleted && !isFailed
          const isStageFailed = isFailed && activeIndex === idx

          return (
            <div
              key={stage.id}
              className={`flex items-center justify-between px-2 py-1 rounded-md text-xs transition-all ${
                isStageActive
                  ? 'bg-primary-light/50 border border-primary/30 text-primary font-semibold'
                  : isStageCompleted
                  ? 'bg-surface-container-low/40 border border-transparent text-main-text'
                  : isStageFailed
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'border border-transparent text-on-surface-variant/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Stage Status Icon */}
                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0">
                  {isStageCompleted ? (
                    <div className="w-3.5 h-3.5 rounded-full bg-secondary-light text-secondary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : isStageActive ? (
                    <Loader2 className="w-3 h-3 text-primary animate-spin" />
                  ) : isStageFailed ? (
                    <AlertCircle className="w-3 h-3 text-red-600" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-outline-variant/60" />
                  )}
                </div>

                <span className={`text-[11px] truncate ${isStageActive ? 'font-bold text-primary' : ''}`}>
                  {stage.name}
                </span>
              </div>

              <span className="font-mono text-[9px] shrink-0 text-on-surface-variant/70">
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
