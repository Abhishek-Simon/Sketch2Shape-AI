import React from 'react'
import { Check, Loader2, Hourglass, Image as ImageIcon, AlertCircle } from 'lucide-react'

export default function GenerationStatus({
  jobStatus = 'idle', // 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
  jobId = null,
  errorMessage = null,
  isGenerating = false,
  isModelReady = false,
  previewImage = null,
  promptText = '',
  inputName = null,
  inputDimensions = null,
  inputMode = 'draw'
}) {
  const steps = [
    {
      id: 1,
      title: 'Sketch Processing',
      description: 'Contours & depth maps extracted',
    },
    {
      id: 2,
      title: 'Multi-View Synthesis',
      description: 'Multi-view texture maps synthesized',
    },
    {
      id: 3,
      title: '3D Reconstruction',
      description: 'Spatial mesh geometry generation',
    },
    {
      id: 4,
      title: 'Model Export',
      description: 'Optimization & GLB baking',
    },
  ]

  // Determine stage status label based on real backend lifecycle status
  const getStepStatus = (stepId) => {
    if (jobStatus === 'completed' || isModelReady) {
      return { label: 'Ready', state: 'completed' }
    }
    if (jobStatus === 'failed') {
      return { label: 'Failed', state: 'failed' }
    }
    if (jobStatus === 'processing') {
      if (stepId === 1) return { label: 'Completed', state: 'completed' }
      if (stepId === 2 || stepId === 3) return { label: 'In Progress', state: 'active' }
      return { label: 'Pending', state: 'pending' }
    }
    if (jobStatus === 'queued') {
      if (stepId === 1) return { label: 'Queued', state: 'active' }
      return { label: 'Pending', state: 'pending' }
    }
    return { label: 'Pending', state: 'pending' }
  }

  const getStageHeaderDisplay = () => {
    switch (jobStatus) {
      case 'completed':
        return 'Completed'
      case 'processing':
        return 'Processing'
      case 'queued':
        return 'Queued'
      case 'failed':
        return 'Failed'
      default:
        return 'Standby'
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Pipeline Progress Card */}
      <div className="bg-white p-4 rounded-xl border border-surface-container-high shadow-card flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
          <h3 className="font-manrope text-sm font-bold text-main-text">
            Generation Pipeline
          </h3>
          <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold border ${
            jobStatus === 'completed' ? 'bg-secondary-light text-secondary border-secondary/20' :
            jobStatus === 'failed' ? 'bg-red-50 text-red-600 border-red-200' :
            jobStatus === 'queued' || jobStatus === 'processing' ? 'bg-primary-light text-primary border-primary/20' :
            'bg-surface-container text-on-surface-variant border-surface-container-high'
          }`}>
            {getStageHeaderDisplay()}
          </span>
        </div>

        {/* Stepper List */}
        <div className="flex flex-col gap-2">
          {steps.map((step) => {
            const status = getStepStatus(step.id)
            const isCompleted = status.state === 'completed'
            const isActive = status.state === 'active'
            const isFailed = status.state === 'failed'
            const isPending = status.state === 'pending'

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-primary-light/40 border-primary/30 shadow-xs'
                    : isCompleted
                    ? 'bg-surface-container-low/60 border-surface-container-high/60'
                    : isFailed
                    ? 'bg-red-50/60 border-red-200'
                    : 'bg-surface-container-low/20 border-transparent opacity-60'
                }`}
              >
                {/* Status Icon */}
                <div className="mt-0.5 shrink-0">
                  {isCompleted && (
                    <div className="w-5 h-5 rounded-full bg-secondary-container text-secondary-on-container flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}
                  {isActive && (
                    <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center animate-spin">
                      <Loader2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {isFailed && (
                    <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {isPending && (
                    <div className="w-5 h-5 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center">
                      <Hourglass className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Step Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isActive ? 'text-primary font-bold' : isFailed ? 'text-red-700' : 'text-main-text'
                      }`}
                    >
                      {step.title}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-medium ${
                        isActive
                          ? 'text-primary font-bold'
                          : isCompleted
                          ? 'text-secondary font-semibold'
                          : isFailed
                          ? 'text-red-600 font-semibold'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Error message banner if generation failed */}
        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-semibold block">Generation Error</span>
              <span className="text-[10px] break-words">{errorMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Metadata & Inspection Card */}
      <div className="bg-white p-4 rounded-xl border border-surface-container-high shadow-card flex flex-col gap-3">
        <span className="font-manrope text-xs font-bold text-main-text">
          Input Metadata
        </span>

        {/* Thumbnail Preview Row */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-container-low border border-surface-container-high/60">
          <div className="w-12 h-12 rounded-md bg-white p-1 border border-surface-container-high flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
            {previewImage ? (
              <img
                src={previewImage}
                alt="Input sketch thumbnail"
                className="w-full h-full object-contain"
              />
            ) : (
              <ImageIcon className="w-5 h-5 text-on-surface-variant/50" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-mono text-xs text-main-text font-semibold block truncate">
              {inputName || (previewImage ? (inputMode === 'draw' ? 'canvas_sketch.png' : 'uploaded_input.png') : 'No image provided')}
            </span>
            <span className="font-mono text-[10px] text-on-surface-variant block truncate">
              {inputDimensions || (previewImage ? (inputMode === 'draw' ? 'HTML Canvas • Vector / Raster' : 'Uploaded Image File') : 'Awaiting sketch or upload')}
            </span>
          </div>
        </div>

        {/* Properties Specs */}
        <div className="space-y-1.5 pt-0.5 text-main-text text-[11px]">
          {jobId && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-on-surface-variant font-medium shrink-0">Job ID:</span>
              <span className="font-mono text-[10px] text-primary font-bold truncate" title={jobId}>
                {jobId}
              </span>
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <span className="text-on-surface-variant font-medium shrink-0">Prompt:</span>
            <span className="text-right text-main-text font-medium line-clamp-2">
              {promptText ? promptText : 'None provided (direct contour inference)'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant font-medium">Input Source:</span>
            <span className="font-mono text-main-text">
              {inputMode === 'draw' ? 'Sketch Canvas' : 'Uploaded Image'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant font-medium">Pipeline Status:</span>
            <span className={`font-mono font-semibold capitalize ${
              jobStatus === 'completed' ? 'text-secondary' :
              jobStatus === 'failed' ? 'text-red-500' :
              jobStatus === 'processing' || jobStatus === 'queued' ? 'text-primary' :
              'text-on-surface-variant'
            }`}>
              {jobStatus}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant font-medium">Target Formats:</span>
            <span className="font-mono text-main-text">GLB, OBJ + MTL, USDZ</span>
          </div>
        </div>
      </div>
    </div>
  )
}
