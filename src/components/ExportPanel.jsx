import React, { useState } from 'react'
import { Download, FolderArchive, Smartphone, ExternalLink, Copy, Check, Lock } from 'lucide-react'

export default function ExportPanel({
  isModelAvailable = false,
  modelUrl = null,
  objUrl = null,
  modelName = 'sketch2shape_model'
}) {
  const [copied, setCopied] = useState(false)
  const [downloadingFormat, setDownloadingFormat] = useState(null)

  const isGlbAvailable = Boolean(isModelAvailable && modelUrl)
  const isObjAvailable = Boolean(objUrl)

  const handleDownload = async (format) => {
    if (format === 'glb') {
      if (!isGlbAvailable) return
      setDownloadingFormat('glb')
      try {
        const link = document.createElement('a')
        link.href = modelUrl
        link.download = `${modelName}.glb`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (err) {
        console.error('GLB download error:', err)
      } finally {
        setTimeout(() => setDownloadingFormat(null), 600)
      }
    } else if (format === 'obj') {
      if (!isObjAvailable) return
      setDownloadingFormat('obj')
      try {
        const link = document.createElement('a')
        link.href = objUrl
        link.download = `${modelName}.obj`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (err) {
        console.error('OBJ download error:', err)
      } finally {
        setTimeout(() => setDownloadingFormat(null), 600)
      }
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
    <div className="bg-white p-4 rounded-xl border border-surface-container-high shadow-card flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
        <h3 className="font-manrope text-xs font-bold text-main-text">
          Download & Export
        </h3>
        <span className="font-mono text-[10px] text-outline">
          {isGlbAvailable ? 'Asset Ready' : 'Pending Model'}
        </span>
      </div>

      {/* Download Controls */}
      <div className="flex flex-col gap-2">
        {/* GLB (Recommended) - Enabled only when real model URL exists */}
        <button
          type="button"
          disabled={!isGlbAvailable}
          onClick={() => handleDownload('glb')}
          className={`w-full py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-between shadow-sm transition-all select-none ${
            isGlbAvailable
              ? 'bg-primary hover:bg-primary-hover text-white active:scale-[0.99] cursor-pointer'
              : 'bg-surface-container-high/60 text-on-surface-variant/50 cursor-not-allowed shadow-none'
          }`}
          title={isGlbAvailable ? 'Download GLB format' : 'Disabled until a real 3D model is generated'}
        >
          <div className="flex items-center gap-2">
            {isGlbAvailable ? (
              <Download className="w-4 h-4" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-on-surface-variant/60" />
            )}
            <span>
              {downloadingFormat === 'glb' ? 'Downloading GLB...' : 'Download GLB'}
            </span>
          </div>
          <span
            className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
              isGlbAvailable
                ? 'bg-white/20 text-white'
                : 'bg-surface-container text-on-surface-variant/60'
            }`}
          >
            Web / AR
          </span>
        </button>

        {/* OBJ + MTL - Kept disabled unless real OBJ URL is provided */}
        <button
          type="button"
          disabled={!isObjAvailable}
          onClick={() => handleDownload('obj')}
          className={`w-full py-2.5 px-3 rounded-xl border font-semibold text-xs flex items-center justify-between transition-colors select-none ${
            isObjAvailable
              ? 'bg-surface-container-low hover:bg-surface-container border-surface-container-high text-main-text active:scale-[0.99] cursor-pointer'
              : 'bg-surface-container-low/40 border-transparent text-on-surface-variant/40 cursor-not-allowed'
          }`}
          title={isObjAvailable ? 'Download OBJ + MTL format' : 'OBJ format is disabled until provided by backend'}
        >
          <div className="flex items-center gap-2">
            {isObjAvailable ? (
              <FolderArchive className="w-4 h-4" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-on-surface-variant/50" />
            )}
            <span>
              {downloadingFormat === 'obj' ? 'Archiving OBJ...' : 'Download OBJ + MTL'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-on-surface-variant">
            Blender / Maya
          </span>
        </button>

        {/* USDZ Format - Disabled placeholder */}
        <button
          type="button"
          disabled={true}
          className="w-full py-2 px-3 rounded-xl border text-xs flex items-center justify-between transition-colors select-none bg-surface-container-low/40 border-transparent text-on-surface-variant/40 cursor-not-allowed"
          title="USDZ format is disabled until provided by backend"
        >
          <span className="flex items-center gap-2 font-medium">
            <Smartphone className="w-3.5 h-3.5" />
            <span>USDZ (Apple Vision / iOS)</span>
          </span>
          <span className="font-mono text-[10px] text-on-surface-variant">QuickLook</span>
        </button>
      </div>

      {!isGlbAvailable && (
        <p className="text-[10px] text-on-surface-variant bg-surface-container-low p-2 rounded-lg border border-surface-container-high/60 text-center font-medium">
          Export buttons will unlock once a real model file is generated from the backend.
        </p>
      )}

      {/* Quick Action Links */}
      <div className="flex items-center justify-between pt-2 border-t border-surface-container-low text-xs">
        <a
          href="#editor"
          onClick={(e) => {
            e.preventDefault()
            alert('3D Editor integration will open when a real generated model is available.')
          }}
          className="text-primary hover:underline font-medium flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Open in 3D Editor</span>
        </a>
        <button
          type="button"
          onClick={handleCopyLink}
          className="text-on-surface-variant hover:text-main-text flex items-center gap-1 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-secondary" />
              <span className="text-secondary font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy Share Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
