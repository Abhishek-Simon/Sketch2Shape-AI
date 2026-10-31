import React, { useState, useRef } from 'react'
import { UploadCloud, X, CheckCircle2 } from 'lucide-react'

export default function UploadImage({ onImageSelected, currentImage }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFiles = (files) => {
    if (!files || files.length === 0) return
    const file = files[0]

    // Accept PNG, JPG/JPEG, WebP
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
      alert('Please upload a valid PNG or JPG image file.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      const img = new Image()
      img.onload = () => {
        if (onImageSelected) {
          onImageSelected({
            file,
            dataUrl,
            name: file.name,
            width: img.naturalWidth,
            height: img.naturalHeight,
            size: file.size < 1024 * 1024
              ? `${(file.size / 1024).toFixed(1)} KB`
              : `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          })
        }
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleRemove = (e) => {
    e.stopPropagation()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (onImageSelected) {
      onImageSelected(null)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          // Reset file input value so re-uploading the same file works
          e.target.value = ''
        }}
      />

      {currentImage ? (
        <div className="relative rounded-xl border border-surface-container-high bg-white p-3 shadow-inner">
          <div className="relative w-full h-[180px] rounded-lg overflow-hidden bg-surface-container-low flex items-center justify-center">
            <img
              src={currentImage.dataUrl}
              alt="Uploaded concept"
              className="w-full h-full object-contain"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-main-text/80 hover:bg-main-text text-white flex items-center justify-center shadow-md transition-colors"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between pt-2 px-1 gap-2">
            <div className="flex items-center gap-2 truncate min-w-0">
              <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
              <div className="truncate min-w-0">
                <span className="font-mono text-xs text-main-text truncate font-medium block">
                  {currentImage.name}
                </span>
                <span className="font-mono text-[10px] text-on-surface-variant block">
                  {currentImage.width && currentImage.height ? `${currentImage.width} × ${currentImage.height} px` : ''}
                  {currentImage.size ? ` • ${currentImage.size}` : ''}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-primary font-medium hover:underline shrink-0"
            >
              Replace
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
            isDragOver
              ? 'border-primary bg-primary-light/40 scale-[1.01]'
              : 'border-outline-variant/60 bg-surface-container-low/70 hover:bg-surface-container-low hover:border-primary/50'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary mb-2 shadow-xs">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="font-semibold text-xs text-main-text">
            Drop PNG/JPG sketch here
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            or browse your system files
          </p>
          <span className="mt-2 font-mono text-[10px] text-outline">
            Supports PNG, JPG, WebP • Transparent BG preferred
          </span>
        </div>
      )}
    </div>
  )
}
