import React, { useState } from 'react'
import Navbar from './components/Navbar'
import Workspace from './components/Workspace'
import Footer from './components/Footer'
import { Box, Sparkles, Layers, Cpu, ArrowRight } from 'lucide-react'

export default function App() {
  const [activeTab, setActiveTab] = useState('workspace')

  return (
    <div className="min-h-screen bg-background flex flex-col font-inter text-main-text selection:bg-primary-light selection:text-primary">
      {/* 1. Navbar */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {activeTab === 'workspace' && <Workspace />}

        {/* Optional simple views for My Models & About if user clicks them */}
        {activeTab === 'my-models' && (
          <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-manrope text-2xl font-bold text-main-text">My 3D Models</h1>
                <p className="text-xs text-on-surface-variant">Previously generated and exported 3D spatial assets</p>
              </div>
              <button
                onClick={() => setActiveTab('workspace')}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover flex items-center gap-1.5 transition-colors"
              >
                <span>New Model</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'Model_0492_drone.glb', poly: '28,450 Polys', date: 'Today at 14:32', badge: 'Ready' },
                { name: 'Model_0381_helmet.glb', poly: '42,120 Polys', date: 'Yesterday', badge: 'Exported' },
                { name: 'Model_0219_chair.glb', poly: '18,900 Polys', date: '3 days ago', badge: 'Exported' }
              ].map((model, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-surface-container-high shadow-card flex flex-col gap-3">
                  <div className="h-36 rounded-lg bg-viewport flex items-center justify-center text-primary-light">
                    <Box className="w-12 h-12 stroke-[1.5]" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-main-text">{model.name}</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-secondary-light text-secondary font-semibold">
                        {model.badge}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-on-surface-variant block mt-1">
                      {model.poly} • {model.date}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('workspace')}
                    className="w-full py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-xs font-medium text-main-text transition-colors mt-auto"
                  >
                    Open in Workspace
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-6">
            <div>
              <span className="px-2.5 py-1 rounded-full bg-primary-light text-primary font-mono text-xs font-semibold">
                About The Project
              </span>
              <h1 className="font-manrope text-3xl font-extrabold text-main-text mt-3">
                Sketch2Shape AI Studio
              </h1>
              <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                Sketch2Shape AI bridges the gap between fast conceptual sketch ideation and production-ready 3D CAD assets.
                Powered by a dual pipeline of multimodal contour synthesis and spatial 3D Gaussian / NeRF reconstruction,
                artists and industrial designers can visualize concepts in interactive 3D in seconds.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white border border-surface-container-high shadow-card flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-manrope font-bold text-sm text-main-text">Sketch to Multi-View</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">Extracts geometric contours and synthesizes PBR-consistent view angles.</p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-surface-container-high shadow-card flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary-light text-secondary flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <h3 className="font-manrope font-bold text-sm text-main-text">A100 Spatial Meshing</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">High-fidelity 3D reconstruction with quad-dominant manifold topology.</p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-surface-container-high shadow-card flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-surface-container text-main-text flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="font-manrope font-bold text-sm text-main-text">Production Formats</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">Export directly to GLB (Web/AR), OBJ + MTL (Blender), and USDZ (Apple Vision).</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveTab('workspace')}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-md transition-all flex items-center gap-2"
              >
                <span>Launch Studio Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
