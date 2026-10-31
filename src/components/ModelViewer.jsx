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
  Lightbulb,
  ExternalLink,
  Sliders,
  Sun,
  Layers,
  Upload
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
  const sampleGroupRef = useRef(null)
  const loadedModelRef = useRef(null)
  const reqIdRef = useRef(null)
  const originalMaterialsMapRef = useRef(new Map())

  const [shadingMode, setShadingMode] = useState('shaded') // 'shaded' | 'wireframe' | 'matcap'
  const [activeAngle, setActiveAngle] = useState('persp')
  const [loadedStats, setLoadedStats] = useState(null)
  const [isLoadingModel, setIsLoadingModel] = useState(false)
  const [loadError, setLoadError] = useState(null)

  // Build the demo sample planet (clearly labeled as a sample preview, not a generated result)
  const createSamplePlanetGroup = useCallback(() => {
    const group = new THREE.Group()
    group.name = 'sample_planet_group'

    // Central Core Sphere / Body
    const bodyGeom = new THREE.SphereGeometry(1.0, 36, 36)
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0x6655e8,
      emissive: 0x1a1240,
      specular: 0x8f85ff,
      shininess: 90
    })
    const body = new THREE.Mesh(bodyGeom, bodyMat)
    body.name = 'model_body'
    group.add(body)

    // Equatorial Ring
    const ringGeom = new THREE.TorusGeometry(1.3, 0.08, 16, 64)
    const ringMat = new THREE.MeshPhongMaterial({
      color: 0x20b8a6,
      emissive: 0x073630,
      specular: 0x8afff0,
      shininess: 120
    })
    const ring = new THREE.Mesh(ringGeom, ringMat)
    ring.rotation.x = Math.PI / 2.3
    ring.name = 'model_ring'
    group.add(ring)

    // Secondary Orbit Ring
    const ring2Geom = new THREE.TorusGeometry(1.45, 0.04, 16, 64)
    const ring2Mat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      opacity: 0.8,
      transparent: true
    })
    const ring2 = new THREE.Mesh(ring2Geom, ring2Mat)
    ring2.rotation.x = -Math.PI / 4
    ring2.name = 'model_ring2'
    group.add(ring2)

    // Top Optic Cap
    const capGeom = new THREE.CylinderGeometry(0.35, 0.45, 0.4, 24)
    const capMat = new THREE.MeshPhongMaterial({ color: 0x252a3a, specular: 0xffffff, shininess: 100 })
    const cap = new THREE.Mesh(capGeom, capMat)
    cap.position.y = 1.05
    cap.name = 'model_cap'
    group.add(cap)

    // Glowing Sensor Node
    const eyeGeom = new THREE.SphereGeometry(0.25, 24, 24)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x20b8a6 })
    const eye = new THREE.Mesh(eyeGeom, eyeMat)
    eye.position.set(0, 0.35, 0.95)
    eye.name = 'model_eye'
    group.add(eye)

    return group
  }, [])

  // Initialize Three.js Scene and Viewer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 600
    const height = container.clientHeight || 520

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x171B2D)
    sceneRef.current = scene

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(3.2, 2.4, 4.0)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.innerHTML = ''
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // 4. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xdde3ff, 0.9)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
    keyLight.position.set(5, 8, 5)
    keyLight.castShadow = true
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x6655e8, 1.4)
    fillLight.position.set(-5, -2, -3)
    scene.add(fillLight)

    const rimLight = new THREE.PointLight(0x20b8a6, 2.5, 10)
    rimLight.position.set(0, 4, -4)
    scene.add(rimLight)

    // 5. Studio Grid Floor Helper
    const gridHelper = new THREE.GridHelper(10, 20, 0x3d4668, 0x222842)
    gridHelper.position.y = -1.2
    scene.add(gridHelper)

    // Pedestal Disc
    const baseDiscGeom = new THREE.CylinderGeometry(1.5, 1.5, 0.04, 32)
    const baseDiscMat = new THREE.MeshBasicMaterial({
      color: 0x6655e8,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    })
    const baseDisc = new THREE.Mesh(baseDiscGeom, baseDiscMat)
    baseDisc.position.y = -1.18
    scene.add(baseDisc)

    // 6. Root Transform Group
    const rootGroup = new THREE.Group()
    scene.add(rootGroup)
    rootGroupRef.current = rootGroup

    // Default Sample Group
    const sampleGroup = createSamplePlanetGroup()
    sampleGroupRef.current = sampleGroup
    rootGroup.add(sampleGroup)

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

    // 8. Resize Listener
    const handleResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return
      const w = container.clientWidth
      const h = container.clientHeight
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // 9. Animation Loop
    const clock = new THREE.Clock()
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      if (!isDragging && rootGroupRef.current) {
        rootGroupRef.current.rotation.y += 0.006
        const ring2 = sampleGroupRef.current?.getObjectByName('model_ring2')
        if (ring2) ring2.rotation.z += 0.012
      }

      // Subtle levitation
      if (rootGroupRef.current) {
        rootGroupRef.current.position.y = Math.sin(elapsedTime * 1.5) * 0.1
      }

      renderer.render(scene, camera)
    }
    animate()

    // Cleanup
    return () => {
      cancelAnimationFrame(reqIdRef.current)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointermove', onPointerMove)
      domElement.removeEventListener('pointerdown', onPointerDown)
      domElement.removeEventListener('wheel', onWheel)
      renderer.dispose()
    }
  }, [createSamplePlanetGroup])

  // Prepared GLTF/GLB Loader for real models
  const loadGLBModel = useCallback((url) => {
    if (!rootGroupRef.current) return

    setIsLoadingModel(true)
    setLoadError(null)

    const loader = new GLTFLoader()
    loader.load(
      url,
      (gltf) => {
        // Remove sample group if present
        if (sampleGroupRef.current) {
          rootGroupRef.current.remove(sampleGroupRef.current)
        }
        // Remove existing loaded model if present
        if (loadedModelRef.current) {
          rootGroupRef.current.remove(loadedModelRef.current)
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

  // React to modelUrl prop changes
  useEffect(() => {
    if (modelUrl) {
      loadGLBModel(modelUrl)
    } else {
      // Restore sample preview if modelUrl is null
      if (loadedModelRef.current && rootGroupRef.current) {
        rootGroupRef.current.remove(loadedModelRef.current)
        loadedModelRef.current = null
      }
      if (sampleGroupRef.current && rootGroupRef.current) {
        rootGroupRef.current.add(sampleGroupRef.current)
      }
      setLoadedStats(null)
    }
  }, [modelUrl, loadGLBModel])

  // Update Shading Modes (Wireframe, MatCap, Shaded)
  useEffect(() => {
    if (!rootGroupRef.current) return

    rootGroupRef.current.traverse((child) => {
      if (child.isMesh && child.name !== 'model_eye') {
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
          if (child.material) {
            child.material.wireframe = false
          }
          if (child.name === 'model_body') {
            child.material.color?.set(0x6655e8)
            child.material.emissive?.set(0x1a1240)
          } else if (child.name === 'model_ring') {
            child.material.color?.set(0x20b8a6)
            child.material.emissive?.set(0x073630)
          } else if (child.name === 'model_cap') {
            child.material.color?.set(0x252a3a)
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

  // Display metadata (clearly denoting sample preview vs real model)
  const isRealModel = Boolean(modelUrl && loadedModelRef.current)
  const displayTitle = modelName || (isRealModel ? 'Generated_Model.glb' : 'Sample 3D Preview')
  const displayStatus = statusText || (isRealModel ? 'Generated Mesh' : 'Sample Scene')
  const displayVerts = vertCount || loadedStats?.verts || '14,820 Verts'
  const displayPolys = polyCount || loadedStats?.polys || '28,450 Polys'

  return (
    <div className="flex flex-col gap-4">
      {/* Viewport Card */}
      <div className="bg-white p-4 rounded-xl border border-surface-container-high shadow-card flex flex-col gap-3">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-surface-container-low">
          {/* Asset Title & Meta */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <Rotate3d className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-manrope text-sm font-bold text-main-text leading-tight">
                  {displayTitle}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-mono text-[10px] font-semibold">
                  {displayStatus}
                </span>
              </div>
              <span className="font-mono text-[11px] text-on-surface-variant">
                {isRealModel
                  ? 'Active 3D mesh loaded in Three.js viewport'
                  : 'Interactive sample preview • Ready for generated GLB assets'}
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
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-light text-secondary-on-container font-mono text-xs font-semibold border border-secondary/20">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span>{isRealModel ? 'GLB Active' : 'WebGL Active'}</span>
            </div>
          </div>
        </div>

        {/* Main 3D Dark Canvas Viewport */}
        <div className="relative w-full h-[480px] lg:h-[520px] rounded-2xl overflow-hidden bg-viewport shadow-2xl select-none">
          {/* Three.js Canvas Container */}
          <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

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

          {/* Floating Top-Right: Camera Orientation Gizmo & Angles */}
          <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-auto">
            {/* Isometric Mini Gizmo Cube */}
            <div 
              onClick={resetView}
              className="w-14 h-14 rounded-xl bg-viewport/85 backdrop-blur-md border border-white/10 p-1 flex flex-col items-center justify-center shadow-lg cursor-pointer hover:bg-viewport transition-colors"
              title="Reset to Isometric View"
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

          {/* Floating Bottom-Left: Mesh Topology Badge */}
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

          {/* Floating Bottom-Right: Navigation Instruction Tooltip */}
          <div className="hidden sm:flex absolute bottom-4 right-4 px-3 py-1.5 rounded-xl bg-viewport/90 backdrop-blur-md border border-white/10 shadow-lg text-white/60 font-inter text-[11px] items-center gap-2 pointer-events-none">
            <Hand className="w-3.5 h-3.5 text-secondary" />
            <span>Drag to rotate • Scroll to zoom</span>
          </div>
        </div>

        {/* Helpful Bottom Status Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-surface-container-high/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary shadow-xs border border-surface-container-high">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-main-text">
                {isRealModel ? '3D Asset Rendered' : 'Sample 3D Preview Loaded'}
              </p>
              <p className="text-xs text-on-surface-variant">
                {isRealModel
                  ? 'Model mesh rendered via Three.js GLTFLoader. Ready for inspection and export.'
                  : 'The viewport displays a sample scene. Generating a model will load the real reconstructed GLB asset.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-surface-container border border-surface-container-high text-main-text text-xs font-medium shadow-xs transition-colors"
          >
            <span>View Docs</span>
            <ExternalLink className="w-3 h-3 text-on-surface-variant" />
          </button>
        </div>
      </div>

      {/* Material Node & Decimation Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3 px-4 rounded-xl border border-surface-container-high shadow-card flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] text-on-surface-variant block uppercase tracking-wider">
              Topology
            </span>
            <span className="text-xs font-bold text-main-text">
              Quad Topology
            </span>
          </div>
          <button
            type="button"
            className="w-7 h-7 rounded-lg bg-surface-container-low hover:bg-surface-container border border-surface-container-high flex items-center justify-center text-main-text transition-colors"
            title="Topology Mode"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white p-3 px-4 rounded-xl border border-surface-container-high shadow-card flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] text-on-surface-variant block uppercase tracking-wider">
              Lighting Rig
            </span>
            <span className="text-xs font-bold text-main-text">
              Studio Softbox
            </span>
          </div>
          <button
            type="button"
            className="w-7 h-7 rounded-lg bg-surface-container-low hover:bg-surface-container border border-surface-container-high flex items-center justify-center text-main-text transition-colors"
            title="Adjust Lighting"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white p-3 px-4 rounded-xl border border-surface-container-high shadow-card flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] text-on-surface-variant block uppercase tracking-wider">
              UV Unwrap
            </span>
            <span className="text-xs font-bold text-secondary">
              Auto-Seam OK
            </span>
          </div>
          <button
            type="button"
            className="w-7 h-7 rounded-lg bg-surface-container-low hover:bg-surface-container border border-surface-container-high flex items-center justify-center text-main-text transition-colors"
            title="UV Unwrap Settings"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
