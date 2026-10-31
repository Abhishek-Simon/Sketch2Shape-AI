import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  Rotate3d,
  Grid,
  Palette,
  Circle,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Hand,
  Box
} from 'lucide-react'

export default function ModelViewer({
  modelUrl = null,
  modelName = null,
  statusText = null,
  polyCount = null,
  vertCount = null
}) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const rootGroupRef = useRef(null)
  const loadedModelRef = useRef(null)
  const reqIdRef = useRef(null)
  const originalMaterialsMapRef = useRef(new Map())

  const [shadingMode, setShadingMode] = useState('shaded') // 'shaded' | 'wireframe' | 'matcap'
  const [activeAngle, setActiveAngle] = useState('persp')
  const [loadedStats, setLoadedStats] = useState(null)
  const [isLoadingModel, setIsLoadingModel] = useState(false)
  const [loadError, setLoadError] = useState(null)

  // Initialize Three.js Scene and Viewer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x161923)
    sceneRef.current = scene

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(3.2, 2.4, 4.0)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    rendererRef.current = renderer

    // Mount to DOM
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.4)
    mainLight.position.set(5, 8, 5)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 1024
    mainLight.shadow.mapSize.height = 1024
    scene.add(mainLight)

    const hemiLight = new THREE.HemisphereLight(0x6655e8, 0x0f172a, 0.5)
    scene.add(hemiLight)

    const fillLight = new THREE.PointLight(0x20b8a6, 0.8, 15)
    fillLight.position.set(-4, 2, -3)
    scene.add(fillLight)

    // 5. Ground Studio Grid
    const gridHelper = new THREE.GridHelper(10, 20, 0x334155, 0x1e293b)
    gridHelper.position.y = -1.2
    scene.add(gridHelper)

    // 6. Root Transform Group (starts empty, model added only on generation)
    const rootGroup = new THREE.Group()
    scene.add(rootGroup)
    rootGroupRef.current = rootGroup

    // 7. Interactive Orbit / Drag Interaction
    let isDragging = false
    let prevMousePos = { x: 0, y: 0 }

    const onPointerDown = (e) => {
      isDragging = true
      prevMousePos = { x: e.clientX, y: e.clientY }
    }

    const onPointerUp = () => {
      isDragging = false
    }

    const onPointerMove = (e) => {
      if (!isDragging || !rootGroupRef.current) return
      const deltaX = e.clientX - prevMousePos.x
      const deltaY = e.clientY - prevMousePos.y
      rootGroupRef.current.rotation.y += deltaX * 0.012
      rootGroupRef.current.rotation.x += deltaY * 0.012
      prevMousePos = { x: e.clientX, y: e.clientY }
    }

    const onWheel = (e) => {
      e.preventDefault()
      if (!cameraRef.current) return
      const zoomFactor = e.deltaY * 0.005
      cameraRef.current.position.z = Math.max(2, Math.min(10, cameraRef.current.position.z + zoomFactor))
    }

    const domElement = renderer.domElement
    domElement.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointermove', onPointerMove)
    domElement.addEventListener('wheel', onWheel, { passive: false })

    // 8. Resize Listener & Observer
    const handleResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return
      const w = container.clientWidth
      const h = container.clientHeight
      if (w === 0 || h === 0) return
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(container)

    // 9. Animation Loop
    const clock = new THREE.Clock()
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      // Rotate and animate only when a real generated model is loaded
      if (loadedModelRef.current && rootGroupRef.current) {
        if (!isDragging) {
          rootGroupRef.current.rotation.y += 0.005
        }
        rootGroupRef.current.position.y = Math.sin(elapsedTime * 1.5) * 0.08
      } else if (rootGroupRef.current) {
        rootGroupRef.current.position.y = 0
      }

      renderer.render(scene, camera)
    }
    animate()

    // Cleanup
    return () => {
      cancelAnimationFrame(reqIdRef.current)
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointermove', onPointerMove)
      domElement.removeEventListener('pointerdown', onPointerDown)
      domElement.removeEventListener('wheel', onWheel)
      renderer.dispose()
    }
  }, [])

  // GLTF/GLB Loader for real generated models
  const loadGLBModel = useCallback((url) => {
    if (!rootGroupRef.current) return

    setIsLoadingModel(true)
    setLoadError(null)

    const loader = new GLTFLoader()
    loader.load(
      url,
      (gltf) => {
        // Remove previous loaded model if present
        if (loadedModelRef.current && rootGroupRef.current) {
          rootGroupRef.current.remove(loadedModelRef.current)
          loadedModelRef.current = null
        }

        const model = gltf.scene
        loadedModelRef.current = model

        // Calculate bounding box and center/scale the loaded model
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())

        model.position.sub(center) // Center at origin
        const maxDim = Math.max(size.x, size.y, size.z)
        if (maxDim > 0) {
          const scale = 2.4 / maxDim
          model.scale.set(scale, scale, scale)
        }

        // Cache original materials and calculate real vertices and polygons
        let vertices = 0
        let polys = 0
        originalMaterialsMapRef.current.clear()

        model.traverse((child) => {
          if (child.isMesh && child.geometry) {
            child.castShadow = true
            child.receiveShadow = true
            originalMaterialsMapRef.current.set(child, child.material)

            const geom = child.geometry
            if (geom.attributes.position) {
              vertices += geom.attributes.position.count
            }
            if (geom.index) {
              polys += geom.index.count / 3
            } else if (geom.attributes.position) {
              polys += geom.attributes.position.count / 3
            }
          }
        })

        rootGroupRef.current.add(model)
        setLoadedStats({
          verts: `${Math.round(vertices).toLocaleString()} Verts`,
          polys: `${Math.round(polys).toLocaleString()} Polys`
        })
        setIsLoadingModel(false)
      },
      undefined,
      (err) => {
        console.error('Failed to load GLB model:', err)
        setLoadError('Failed to load GLB model file')
        setIsLoadingModel(false)
      }
    )
  }, [])

  // React to modelUrl prop changes: load when provided, clear completely when null
  useEffect(() => {
    if (modelUrl) {
      loadGLBModel(modelUrl)
    } else {
      if (loadedModelRef.current && rootGroupRef.current) {
        rootGroupRef.current.remove(loadedModelRef.current)
        loadedModelRef.current = null
      }
      setLoadedStats(null)
    }
  }, [modelUrl, loadGLBModel])

  // Update Shading Modes (Wireframe, MatCap, Shaded) on real model
  useEffect(() => {
    if (!loadedModelRef.current || !rootGroupRef.current) return

    rootGroupRef.current.traverse((child) => {
      if (child.isMesh) {
        if (shadingMode === 'wireframe') {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => (m.wireframe = true))
          } else if (child.material) {
            child.material.wireframe = true
          }
        } else if (shadingMode === 'matcap') {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => {
              m.wireframe = false
              m.color?.set(0xd0d5dd)
            })
          } else if (child.material) {
            child.material.wireframe = false
            child.material.color?.set(0xd0d5dd)
          }
        } else {
          // Shaded / original textured
          const originalMat = originalMaterialsMapRef.current.get(child)
          if (originalMat) {
            child.material = originalMat
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => (m.wireframe = false))
            } else {
              child.material.wireframe = false
            }
          } else if (child.material) {
            child.material.wireframe = false
          }
        }
      }
    })
  }, [shadingMode])

  // Camera presets
  const setCameraAngle = (angle) => {
    setActiveAngle(angle)
    if (!cameraRef.current || !rootGroupRef.current) return

    rootGroupRef.current.rotation.set(0, 0, 0)

    if (angle === 'top') {
      cameraRef.current.position.set(0, 5.5, 0.1)
    } else if (angle === 'front') {
      cameraRef.current.position.set(0, 0.5, 5.2)
    } else if (angle === 'side') {
      cameraRef.current.position.set(5.2, 0.5, 0)
    } else {
      cameraRef.current.position.set(3.2, 2.4, 4.0)
    }
    cameraRef.current.lookAt(0, 0, 0)
  }

  const handleZoom = (delta) => {
    if (!cameraRef.current) return
    cameraRef.current.position.z = Math.max(2, Math.min(8, cameraRef.current.position.z + delta))
  }

  const resetView = () => {
    setCameraAngle('persp')
    if (rootGroupRef.current) {
      rootGroupRef.current.rotation.set(0, 0, 0)
    }
  }

  // Display metadata
  const isRealModel = Boolean(modelUrl && loadedModelRef.current)
  const displayTitle = isRealModel ? (modelName || 'Generated_Model.glb') : '3D Viewport'
  const displayStatus = isRealModel ? (statusText || 'Generated Mesh') : 'Standby'
  const displayVerts = loadedStats?.verts || null
  const displayPolys = loadedStats?.polys || null

  return (
    <div className="flex flex-col h-full">
      {/* Viewport Card */}
      <div className="bg-white p-4 rounded-xl border border-surface-container-high shadow-card flex flex-col gap-3 h-full">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-surface-container-low">
          {/* Asset Title & Meta */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isRealModel ? 'bg-primary-light text-primary' : 'bg-surface-container text-on-surface-variant'
            }`}>
              <Rotate3d className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-manrope text-sm font-bold text-main-text leading-tight">
                  {displayTitle}
                </h3>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold border ${
                  isRealModel
                    ? 'bg-secondary-light text-secondary border-secondary/20'
                    : 'bg-surface-container text-on-surface-variant border-surface-container-high'
                }`}>
                  {displayStatus}
                </span>
              </div>
              <span className="font-mono text-[11px] text-on-surface-variant">
                {isRealModel
                  ? 'Active 3D mesh loaded in Three.js viewport'
                  : 'Interactive 3D Viewport • Awaiting generated model'}
              </span>
            </div>
          </div>

          {/* Shading Modes & Status */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 rounded-lg bg-surface-container-low border border-surface-container-high/60 text-on-surface-variant">
              {/* Wireframe */}
              <button
                type="button"
                onClick={() => setShadingMode('wireframe')}
                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                  shadingMode === 'wireframe'
                    ? 'bg-white text-primary shadow-xs font-bold'
                    : 'hover:bg-white/60 hover:text-main-text'
                }`}
                title="Wireframe View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              {/* Shaded */}
              <button
                type="button"
                onClick={() => setShadingMode('shaded')}
                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                  shadingMode === 'shaded'
                    ? 'bg-white text-primary shadow-xs font-bold'
                    : 'hover:bg-white/60 hover:text-main-text'
                }`}
                title="Shaded / PBR Textured"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              {/* MatCap */}
              <button
                type="button"
                onClick={() => setShadingMode('matcap')}
                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                  shadingMode === 'matcap'
                    ? 'bg-white text-primary shadow-xs font-bold'
                    : 'hover:bg-white/60 hover:text-main-text'
                }`}
                title="Clay / MatCap"
              >
                <Circle className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Viewport Engine Status */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs font-semibold border ${
              isRealModel
                ? 'bg-secondary-light text-secondary-on-container border-secondary/20'
                : 'bg-surface-container text-on-surface-variant border-surface-container-high'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isRealModel ? 'bg-secondary animate-pulse' : 'bg-outline-variant'}`} />
              <span>{isRealModel ? 'GLB Active' : 'Standby'}</span>
            </div>
          </div>
        </div>

        {/* Main 3D Dark Canvas Viewport */}
        <div className="relative w-full flex-1 min-h-[520px] lg:min-h-[580px] rounded-2xl overflow-hidden bg-viewport shadow-2xl select-none">
          {/* Three.js Canvas Container */}
          <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Empty Viewport Placeholder Overlay (shown when no model has been generated yet) */}
          {!isRealModel && !isLoadingModel && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none select-none z-20">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-3 shadow-inner">
                <Box className="w-7 h-7 stroke-[1.5]" />
              </div>
              <p className="font-manrope text-sm font-semibold text-white/90">
                Your 3D model will appear here after generation.
              </p>
              <p className="font-inter text-xs text-white/40 mt-1 max-w-sm">
                Draw a sketch or upload an image on the left, then click Generate 3D Model.
              </p>
            </div>
          )}

          {/* Loading Overlay */}
          {isLoadingModel && (
            <div className="absolute inset-0 bg-viewport/80 backdrop-blur-xs flex items-center justify-center z-30">
              <div className="flex flex-col items-center gap-2 text-white">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-xs">Loading GLB Model...</span>
              </div>
            </div>
          )}

          {/* Load Error Banner */}
          {loadError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-500/40 text-red-200 text-xs font-mono z-30">
              {loadError}
            </div>
          )}

          {/* Floating Top-Right: Quick Orientation Gizmo & Angles */}
          <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-auto">
            {/* View Cube / Orientation Badge */}
            <div
              onClick={() => setCameraAngle('persp')}
              className="w-10 h-10 rounded-xl bg-viewport/85 backdrop-blur-md border border-white/10 shadow-lg flex flex-col items-center justify-center cursor-pointer hover:bg-viewport transition-colors"
              title="Reset to Perspective View"
            >
              <div className="w-6 h-6 relative flex items-center justify-center">
                <span className="text-[8px] font-mono text-secondary absolute -top-1 font-bold">Y+</span>
                <span className="text-[8px] font-mono text-red-400 absolute -left-1 font-bold">X+</span>
                <span className="text-[8px] font-mono text-primary-light absolute -right-1 font-bold">Z+</span>
                <div className="w-3.5 h-3.5 rounded-xs bg-white/20 rotate-45" />
              </div>
              <span className="font-mono text-[8px] text-surface-container uppercase tracking-wider mt-0.5">
                {activeAngle}
              </span>
            </div>

            {/* Quick Angles Selector */}
            <div className="flex flex-col gap-1 p-1 rounded-lg bg-viewport/85 backdrop-blur-md border border-white/10 shadow-md font-mono text-[10px] text-white/80">
              {['top', 'front', 'side', 'persp'].map((angle) => (
                <button
                  key={angle}
                  type="button"
                  onClick={() => setCameraAngle(angle)}
                  className={`px-2 py-0.5 rounded capitalize transition-colors ${
                    activeAngle === angle ? 'bg-primary text-white font-semibold' : 'hover:bg-white/10'
                  }`}
                >
                  {angle}
                </button>
              ))}
            </div>
          </div>

          {/* Floating Top-Left: Camera Controls Ribbon */}
          <div className="absolute top-4 left-4 flex items-center gap-1 p-1 rounded-xl bg-viewport/85 backdrop-blur-md border border-white/10 shadow-lg text-white pointer-events-auto">
            <button
              type="button"
              onClick={resetView}
              className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-hover shadow-xs"
              title="Orbit Mode"
            >
              <Rotate3d className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-0.5)}
              className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(0.5)}
              className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={resetView}
              className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors"
              title="Fit Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Floating Bottom-Left: Real Mesh Topology Badge (shown only when model is loaded) */}
          {isRealModel && displayVerts && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 pointer-events-auto">
              <div className="px-3 py-1.5 rounded-xl bg-viewport/90 backdrop-blur-md border border-white/10 shadow-lg flex items-center gap-2.5 font-mono text-[11px] text-white">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                  <span className="font-medium">{displayVerts}</span>
                </div>
                <span className="text-white/30">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{displayPolys}</span>
                </div>
                <span className="text-white/30">|</span>
                <span className="text-secondary font-medium uppercase text-[10px]">
                  {shadingMode === 'wireframe' ? 'Wireframe' : 'PBR Metallic'}
                </span>
              </div>
            </div>
          )}

          {/* Floating Bottom-Right: Navigation Instruction Tooltip */}
          <div className="hidden sm:flex absolute bottom-4 right-4 px-3 py-1.5 rounded-xl bg-viewport/90 backdrop-blur-md border border-white/10 shadow-lg text-white/60 font-inter text-[11px] items-center gap-2 pointer-events-none">
            <Hand className="w-3.5 h-3.5 text-secondary" />
            <span>Drag to rotate • Scroll to zoom</span>
          </div>
        </div>
      </div>
    </div>
  )
}
