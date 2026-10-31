import React from 'react'
import { Sparkles, Loader2, Cpu } from 'lucide-react'

const SUGGESTIONS = [
  'Sci-Fi Matte Plastic',
  'Brushed Titanium',
  'Organic Ceramic',
  'Low-Poly Stylized',
  'Polished Chrome'
]

export default function PromptInput({
  prompt = '',
  onPromptChange = () => {},
  onGenerate = () => {},
  isGenerating = false,
  validationError = null
}) {
  // Check if a chip is currently included in the prompt
  const isTagSelected = (tag) => {
    if (!prompt) return false
    return prompt.toLowerCase().includes(tag.toLowerCase())
  }

  // Toggle chip selection in prompt
  const handleTagToggle = (tag) => {
    if (isTagSelected(tag)) {
      // Remove tag from prompt
      const regex = new RegExp(`(^|,\\s*)${tag}(\\s*,|$)`, 'gi')
      let updated = prompt.replace(regex, (match, p1, p2) => {
        if (p1.startsWith(',') && p2.endsWith(',')) return ', '
        return ''
      }).trim()

      // Clean up leading/trailing commas or leftover commas
      updated = updated.replace(/^,\s*/, '').replace(/,\s*$/, '').trim()
      onPromptChange(updated)
    } else {
      // Append tag to prompt
      if (!prompt || prompt.trim() === '') {
        onPromptChange(tag)
      } else {
        onPromptChange(`${prompt.trim()}, ${tag}`)
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Prompt Field */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label 
            htmlFor="prompt-field"
            className="text-xs font-semibold text-main-text"
          >
            Prompt & Material Style
          </label>
          <span className="font-mono text-[10px] text-outline">Optional</span>
        </div>

        <textarea
          id="prompt-field"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Describe object materials, detailing, or aesthetic (optional)..."
          rows={2}
          className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container-high/80 text-main-text text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none placeholder:text-on-surface-variant/70"
        />

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {SUGGESTIONS.map((tag) => {
            const selected = isTagSelected(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagToggle(tag)}
                className={`px-2 py-0.5 rounded-full border text-[10px] transition-all cursor-pointer select-none ${
                  selected
                    ? 'bg-primary text-white border-primary shadow-xs font-semibold'
                    : 'bg-surface-container-low hover:bg-surface-container border-surface-container-high/60 text-on-surface-variant'
                }`}
                title={selected ? `Remove ${tag}` : `Add ${tag}`}
              >
                {selected ? '✓ ' : '+ '}
                {tag}
              </button>
            )
          })}
        </div>
      </div>

      {/* Validation Warning Alert if input is missing */}
      {validationError && (
        <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium animate-fadeIn">
          {validationError}
        </div>
      )}

      {/* Action Button: Generate 3D Model */}
      <div className="flex flex-col gap-1.5 pt-1">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full h-11 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending to Pipeline...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate 3D Model</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-between px-1 text-on-surface-variant font-mono text-[10px]">
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-secondary" />
            <span>FastAPI Inference Ready</span>
          </span>
          <span>1 Input / Task</span>
        </div>
      </div>
    </div>
  )
}
