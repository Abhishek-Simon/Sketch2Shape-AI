import React, { useState } from 'react'
import {
  Download,
  FolderArchive,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Printer,
  FileCode,
  Box,
  Layers,
  AlertCircle
} from 'lucide-react'
import { export3DModel } from '../services/exporter'

const EXPORT_FORMATS = [
  {
    id: 'gltf',
    label: 'GLTF (.gltf)',
    desc: 'Web / Embedded ZIP',
    icon: FileCode,
    badge: 'glTF + Bin',
  },
  {
    id: 'obj',
    label: 'OBJ (.obj + .mtl)',
    desc: 'Blender / Maya ZIP',
    icon: FolderArchive,
    badge: 'Wavefront',
  },
  {
    id: 'stl',
    label: 'STL (.stl)',
    desc: '3D Printing CAD',
    icon: Printer,
    badge: 'Slicers',
  },
  {
    id: 'ply',
    label: 'PLY (.ply)',
    desc: 'Mesh / Polygon',
    icon: Layers,
    badge: 'Stanford',
  },
  {
    id: 'usdz',
    label: 'USDZ (.usdz)',
    desc: 'Apple Vision / iOS AR',
    icon: Smartphone,
    badge: 'QuickLook',
  },
]

export default function ExportPanel({
  isModelAvailable = false,
  modelUrl = null,
  jobId = null,
  modelName = 'sketch2shape_model'
}) {
  const [copied, setCopied] = useState(false)
  const [exportingFormat, setExportingFormat] = useState(null)
  const [exportError, setExportError] = useState(null)

  const isAvailable = Boolean(isModelAvailable && modelUrl)

  const handleExport = async (format) => {
    if (!isAvailable || exportingFormat) return
    setExportingFormat(format)
    setExportError(null)

    try {
      await export3DModel({
        format,
        jobId,
        modelUrl,
        modelName,
      })
    } catch (err) {
      console.error(`Export failed for format ${format}:`, err)
      setExportError(err.message || `Failed to export as .${format}`)
    } finally {
      setExportingFormat(null)
    }
  }

  const handleCopyLink = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-surface-container-high shadow-card flex flex-col gap-3.5 flex-1 justify-between">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary-light flex items-center justify-center text-primary">
            <Download className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-manrope text-xs font-bold text-main-text">
            Download & Export
          </h3>
        </div>
        <span
          className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            isAvailable
              ? 'bg-secondary-light text-secondary border-secondary/20'
              : 'bg-surface-container text-on-surface-variant/70 border-surface-container-high'
          }`}
        >
          {isAvailable ? 'All Formats Ready' : 'Pending Model'}
        </span>
      </div>

      {/* 2. Primary Featured GLB Download Button */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={!isAvailable || exportingFormat === 'glb'}
          onClick={() => handleExport('glb')}
          className={`w-full py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-between shadow-sm transition-all select-none ${
            isAvailable
              ? 'bg-primary hover:bg-primary-hover active:bg-primary-active text-white active:scale-[0.99] cursor-pointer shadow-primary/20'
              : 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed shadow-none'
          }`}
          title={isAvailable ? 'Download primary GLB asset' : 'Generate a model first to unlock exports'}
        >
          <div className="flex items-center gap-2.5">
            {exportingFormat === 'glb' ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Box className="w-4 h-4 text-white" />
            )}
            <div className="text-left">
              <span className="block font-bold">
                {exportingFormat === 'glb' ? 'Downloading GLB...' : 'Download GLB (Primary)'}
              </span>
              <span className="text-[10px] text-white/80 block font-normal -mt-0.5">
                Standard WebGL & Three.js format
              </span>
            </div>
          </div>
          <span
            className={`font-mono text-[10px] px-2 py-0.5 rounded font-semibold ${
              isAvailable ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant/40'
            }`}
          >
            Recommended
          </span>
        </button>

        {/* 3. Multi-Format Export Options */}
        <div className="flex items-center justify-between pt-1">
          <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            Production Formats
          </span>
          <span className="font-mono text-[10px] text-on-surface-variant/70">
            {isAvailable ? 'Click format to export' : 'Locked'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {EXPORT_FORMATS.map((fmt) => {
            const Icon = fmt.icon
            const isCurrentExporting = exportingFormat === fmt.id

            return (
              <button
                key={fmt.id}
                type="button"
                disabled={!isAvailable || Boolean(exportingFormat)}
                onClick={() => handleExport(fmt.id)}
                className={`py-2 px-2.5 rounded-lg border text-left flex items-center justify-between transition-all select-none ${
                  isAvailable
                    ? 'bg-surface-container-low hover:bg-surface-container active:scale-[0.98] border-surface-container-high/80 text-main-text cursor-pointer hover:border-primary/40'
                    : 'bg-surface-container-low/30 border-transparent text-on-surface-variant/40 cursor-not-allowed'
                }`}
                title={isAvailable ? `Export as ${fmt.label}` : 'Available after model generation'}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isCurrentExporting ? (
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                  ) : (
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isAvailable ? 'text-primary' : 'text-on-surface-variant/40'}`} />
                  )}
                  <div className="min-w-0">
                    <span className="font-semibold text-[11px] block truncate leading-tight">
                      {isCurrentExporting ? 'Exporting...' : fmt.label}
                    </span>
                    <span className="text-[9px] text-on-surface-variant block truncate">
                      {fmt.desc}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-[9px] text-on-surface-variant/70 shrink-0 ml-1">
                  {fmt.badge}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Export Error Alert */}
      {exportError && (
        <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-start gap-1.5 animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
          <span className="leading-tight break-words">{exportError}</span>
        </div>
      )}

      {/* 4. Quick Action Links at the bottom */}
      <div className="flex items-center justify-between pt-2 border-t border-surface-container-low text-xs">
        <a
          href="#editor"
          onClick={(e) => {
            e.preventDefault()
            if (!isAvailable) {
              alert('Generate a 3D model first to inspect in external tools.')
              return
            }
            alert('Opening 3D model in WebGL inspector.')
          }}
          className={`font-medium flex items-center gap-1 transition-colors ${
            isAvailable ? 'text-primary hover:underline' : 'text-on-surface-variant/50 cursor-not-allowed'
          }`}
        >
          <ExternalLink className="w-3 h-3" />
          <span>Open Inspector</span>
        </a>

        <button
          type="button"
          onClick={handleCopyLink}
          className="text-on-surface-variant hover:text-main-text flex items-center gap-1 transition-colors cursor-pointer text-xs"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-secondary" />
              <span className="text-secondary font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
