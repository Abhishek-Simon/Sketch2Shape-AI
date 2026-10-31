import React from 'react'
import { Box, HelpCircle, User, Cpu } from 'lucide-react'

export default function Navbar({ activeTab = 'workspace', onTabChange = () => {} }) {
  return (
    <header className="sticky top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-surface-container-high shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="h-16 w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Brand & Nav Tabs */}
        <div className="flex items-center gap-6 lg:gap-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary-hover flex items-center justify-center text-white shadow-sm shadow-primary/25">
              <Box className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-manrope text-lg font-bold tracking-tight text-main-text">
                Sketch2Shape
              </span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-mono text-[11px] font-semibold">
                AI Studio
              </span>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-surface-container-low border border-surface-container-high/60">
            <button
              onClick={() => onTabChange('workspace')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'workspace'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-main-text'
              }`}
            >
              Workspace
            </button>
            <button
              onClick={() => onTabChange('my-models')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'my-models'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-main-text'
              }`}
            >
              <span>My Models</span>
              <span className="px-1.5 py-0.2 bg-white/20 text-[10px] rounded-full">3</span>
            </button>
            <button
              onClick={() => onTabChange('about')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'about'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-main-text'
              }`}
            >
              About
            </button>
          </nav>
        </div>

        {/* Right: Engine Status & Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-light/70 border border-secondary/20 text-secondary">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="font-mono text-xs font-semibold text-secondary-on-container">
              Studio Engine Ready
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
              title="Help & Documentation"
              type="button"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <div
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white cursor-pointer shadow-sm hover:opacity-90 transition-opacity"
              title="User Account"
            >
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
