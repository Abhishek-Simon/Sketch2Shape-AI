import React from 'react'

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-surface-container-high shadow-[0_-1px_6px_rgba(0,0,0,0.02)] mt-8">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-[1680px] mx-auto text-xs text-on-surface-variant">
        <div>
          <span>© 2025 Sketch2Shape AI. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6 font-medium">
          <a
            href="#docs"
            onClick={(e) => {
              e.preventDefault()
              alert('Sketch2Shape API & SDK documentation is coming soon!')
            }}
            className="hover:text-main-text transition-colors"
          >
            Documentation
          </a>
          <a
            href="#status"
            onClick={(e) => {
              e.preventDefault()
              alert('All AI generation clusters and WebGL engines operational (99.98% uptime).')
            }}
            className="hover:text-main-text transition-colors"
          >
            System Status
          </a>
          <a
            href="#terms"
            onClick={(e) => {
              e.preventDefault()
              alert('Sketch2Shape AI Studio Privacy & Terms')
            }}
            className="hover:text-main-text transition-colors"
          >
            Privacy & Terms
          </a>
        </div>
      </div>
    </footer>
  )
}
