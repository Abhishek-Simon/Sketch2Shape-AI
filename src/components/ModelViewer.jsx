import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  Rotate3d,
  Grid,
  Palette,
  Circle,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
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
  const viewportContainerRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const controlsRef = useRef(null)
  const rootGroupRef = useRef(null)
  const loadedModelRef = useRef(null)
  const reqIdRef = useRef(null)
  const originalMaterialsMapRef = useRef(new Map())

  // Dynamic initial framing defaults
  const defaultCameraDistanceRef = useRef(5.0)
  const defaultCameraPositionRef = useRef(new THREE.Vector3(3.2, 2.4, 4.0))
  const defaultTargetRef = useRef(new THREE.Vector3(0, 0, 0))

  const [shadingMode, setShadingMode] = useState('shaded') // 'shaded' | 'wireframe' | 'matcap'
  const [activeAngle, setActiveAngle] = useState('persp')
  const [loadedStats, setLoadedStats] = useState(null)
  const [isLoadingModel, setIsLoadingModel] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isFullscreenFallback, setIsFullscreenFallback] = useState(false)

  const effectiveIsFullscreen = Boolean(isFullscreen || isFullscreenFallback)

  // Stable resize handler
  const handleResize = useCallback(() => {
    const container = containerRef.current
    const camera = cameraRef.current
    const renderer = rendererRef.current
    if (!container || !camera || !renderer) return

    const w = container.clientWidth
    const h = container.clientHeight
    if (w === 0 || h === 0) return

    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }, [])

  // Initialize Three.js Scene, Camera, Renderer, and OrbitControls
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 600
    const height = container.clientHeight || 500

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
    renderer.domElement.style.touchAction = 'none'

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

    // 7. Three.js OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.screenSpacePanning = true
    controls.minDistance = 0.8
    controls.maxDistance = 25.0
    controls.enableRotate = true
    controls.enableZoom = true
    controls.enablePan = true
    controlsRef.current = controls

    // 8. Resize Listener & Observer
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

      // Update OrbitControls with damping
      if (controlsRef.current) {
        controlsRef.current.update()
      }

      // Gentle floating animation when generated model is loaded
      if (loadedModelRef.current && rootGroupRef.current) {
        rootGroupRef.current.position.y = Math.sin(elapsedTime * 1.5) * 0.05
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
      controls.dispose()
      renderer.dispose()
    }
  }, [handleResize])

  // Fullscreen event listener and Escape key handling
  useEffect(() => {
    const onFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement)
      setIsFullscreen(isFs)
      setTimeout(() => {
        handleResize()
      }, 50)
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('webkitfullscreenchange', onFullscreenChange)

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {})
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen().catch(() => {})
          }
        }
        setIsFullscreenFallback(false)
        setTimeout(() => {
          handleResize()
        }, 50)
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [handleResize])

  // Recompute renderer dimensions when fullscreen state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      handleResize()
    }, 60)
    return () => clearTimeout(timer)
  }, [effectiveIsFullscreen, handleResize])

  // Toggle Full Screen
  const toggleFullscreen = async () => {
    const el = viewportContainerRef.current
    if (!el) return

    try {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement)
      if (isFs) {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen()
        }
      } else {
        if (el.requestFullscreen) {
          await el.requestFullscreen()
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen()
        } else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen()
        } else {
          setIsFullscreenFallback((prev) => !prev)
        }
      }
    } catch (err) {
      console.warn('Native fullscreen request failed, using CSS fullscreen:', err)
      setIsFullscreenFallback((prev) => !prev)
    }
  }

  // Smooth Zoom In and Zoom Out controls
  const handleZoom = (direction) => {
    if (!cameraRef.current || !controlsRef.current) return
    const camera = cameraRef.current
    const controls = controlsRef.current

    // Vector from target to camera
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target)
    const currentDist = offset.length()
    const step = Math.max(0.35, currentDist * 0.2)
    let targetDist

    if (direction === 'in') {
      // Zoom In: camera moves closer to model, strictly clamped to minDistance to prevent zooming through
      targetDist = Math.max(controls.minDistance, currentDist - step)
    } else {
      // Zoom Out: camera moves away from model, clamped to maxDistance
      targetDist = Math.min(controls.maxDistance, currentDist + step)
    }

    offset.setLength(targetDist)
    camera.position.copy(controls.target).add(offset)
    controls.update()
  }

  // Reset View to original optimal framing
  const resetView = () => {
    setActiveAngle('persp')
    if (!cameraRef.current || !controlsRef.current) return
    const camera = cameraRef.current
    const controls = controlsRef.current

    const defaultPos = defaultCameraPositionRef.current || new THREE.Vector3(3.2, 2.4, 4.0)
    const defaultTarget = defaultTargetRef.current || new THREE.Vector3(0, 0, 0)

    controls.target.copy(defaultTarget)
    camera.position.copy(defaultPos)
    camera.lookAt(controls.target)
    controls.update()

    if (rootGroupRef.current) {
      rootGroupRef.current.rotation.set(0, 0, 0)
    }
  }

  // Camera preset angles
  const setCameraAngle = (angle) => {
    setActiveAngle(angle)
    if (!cameraRef.current || !controlsRef.current) return
    const camera = cameraRef.current
    const controls = controlsRef.current
    const dist = defaultCameraDistanceRef.current || 5.0

    controls.target.set(0, 0, 0)

    if (angle === 'top') {
      camera.position.set(0, dist * 1.15, 0.01)
    } else if (angle === 'front') {
      camera.position.set(0, 0.2, dist)
    } else if (angle === 'side') {
      camera.position.set(dist, 0.2, 0)
    } else {
      // Perspective
      const defaultPos = defaultCameraPositionRef.current || new THREE.Vector3(dist * 0.7, dist * 0.5, dist * 0.8)
      camera.position.copy(defaultPos)
    }
    camera.lookAt(controls.target)
    controls.update()
  }

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

        // Center model at origin
        model.position.sub(center)

        const maxDim = Math.max(size.x, size.y, size.z)
        const targetSize = 2.4
        const scale = maxDim > 0 ? targetSize / maxDim : 1
        model.scale.set(scale, scale, scale)

        // Compute optimal camera distance and bounds based on model dimensions
        const camera = cameraRef.current
        const controls = controlsRef.current
        if (camera) {
          const scaledRadius = Math.max(0.6, (maxDim * scale) / 2)
          const fov = camera.fov * (Math.PI / 180)
          let cameraDistance = (scaledRadius / Math.sin(fov / 2)) * 1.35
          cameraDistance = Math.max(2.5, Math.min(8.0, cameraDistance))

          defaultCameraDistanceRef.current = cameraDistance
          defaultCameraPositionRef.current = new THREE.Vector3(
            cameraDistance * 0.7,
            cameraDistance * 0.5,
            cameraDistance * 0.8
          )
          defaultTargetRef.current = new THREE.Vector3(0, 0, 0)

          if (controls) {
            controls.minDistance = Math.max(0.6, scaledRadius * 0.8)
            controls.maxDistance = Math.max(15, cameraDistance * 4)
            controls.target.set(0, 0, 0)
          }

          camera.position.copy(defaultCameraPositionRef.current)
          camera.lookAt(0, 0, 0)

          if (controls) {
            controls.update()
          }
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

  // React to modelUrl prop changes
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
                className={`w-7 h-7 rounded flex items-center justify-center transition-all cursor-pointer ${
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
                className={`w-7 h-7 rounded flex items-center justify-center transition-all cursor-pointer ${
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
                className={`w-7 h-7 rounded flex items-center justify-center transition-all cursor-pointer ${
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
        <div
          ref={viewportContainerRef}
          className={`relative w-full flex-1 bg-viewport shadow-2xl select-none transition-all ${
            effectiveIsFullscreen
              ? 'fixed inset-0 z-50 rounded-none w-screen h-screen m-0 p-0'
              : 'min-h-[520px] lg:min-h-[580px] rounded-2xl overflow-hidden'
          }`}
        >
          {/* Three.js Canvas Container */}
          <div
            ref={containerRef}
            className="w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
          />

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
          <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-auto z-20">
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
                  className={`px-2 py-0.5 rounded capitalize transition-colors cursor-pointer ${
                    activeAngle === angle ? 'bg-primary text-white font-semibold' : 'hover:bg-white/10'
                  }`}
                >
                  {angle}
                </button>
              ))}
            </div>
          </div>

          {/* Floating Top-Left: Camera Controls Ribbon */}
          <div className="absolute top-4 left-4 flex items-center gap-1 p-1 rounded-xl bg-viewport/85 backdrop-blur-md border border-white/10 shadow-lg text-white pointer-events-auto z-20">
            {/* Reset View */}
            <button
              type="button"
              onClick={resetView}
              className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors text-white cursor-pointer"
              title="Reset View (Center & Default Zoom)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Zoom In */}
            <button
              type="button"
              onClick={() => handleZoom('in')}
              className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Zoom Out */}
            <button
              type="button"
              onClick={() => handleZoom('out')}
              className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Full Screen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                effectiveIsFullscreen ? 'bg-primary text-white shadow-xs' : 'hover:bg-white/15 text-white'
              }`}
              title={effectiveIsFullscreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}
            >
              {effectiveIsFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Floating Bottom-Left: Real Mesh Topology Badge (shown only when model is loaded) */}
          {isRealModel && displayVerts && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 pointer-events-auto z-20">
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
          <div className="hidden sm:flex absolute bottom-4 right-4 px-3 py-1.5 rounded-xl bg-viewport/90 backdrop-blur-md border border-white/10 shadow-lg text-white/60 font-inter text-[11px] items-center gap-2 pointer-events-none z-20">
            <Hand className="w-3.5 h-3.5 text-secondary" />
            <span>Drag to rotate • Scroll to zoom • Right-click to pan</span>
          </div>
        </div>
      </div>
    </div>
  )
}
