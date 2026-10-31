import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js'
import { zipSync, strToU8 } from 'three/examples/jsm/libs/fflate.module.js'
import { BACKEND_BASE_URL } from './api'

/**
 * Triggers a browser file download from a Blob or URL.
 */
export function triggerFileDownload(blobOrUrl, filename) {
  const isStringUrl = typeof blobOrUrl === 'string'
  const url = isStringUrl ? blobOrUrl : URL.createObjectURL(blobOrUrl)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  if (!isStringUrl) {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

/**
 * Load GLTF scene from a GLB URL into memory.
 */
function loadSceneFromUrl(url) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.load(
      url,
      (gltf) => resolve(gltf.scene || gltf.scenes[0]),
      undefined,
      (err) => reject(new Error('Failed to parse 3D asset for conversion: ' + (err.message || err)))
    )
  })
}

/**
 * Exports the 3D model into the requested format and triggers download.
 *
 * Supported formats:
 * - 'glb': Binary GLTF (Direct download of pristine source)
 * - 'gltf': GLTF with embedded/bundled buffers & textures
 * - 'obj': Wavefront OBJ with MTL packaged in ZIP
 * - 'stl': Binary STL for 3D printing
 * - 'ply': Stanford Polygon file with vertex attributes
 * - 'usdz': Apple AR QuickLook package
 */
export async function export3DModel({ format, jobId, modelUrl, modelName = 'sketch2shape_model' }) {
  const fmt = (format || 'glb').toLowerCase().trim()
  const cleanBase = (BACKEND_BASE_URL || '').replace(/\/+$/, '')

  // 1. Direct GLB download: always use the original raw binary file
  if (fmt === 'glb') {
    if (!modelUrl) throw new Error('Model URL is not available for download.')
    const downloadUrl = modelUrl.startsWith('http') || modelUrl.startsWith('blob:')
      ? modelUrl
      : `${cleanBase}${modelUrl.startsWith('/') ? '' : '/'}${modelUrl}`

    triggerFileDownload(downloadUrl, `${modelName}.glb`)
    return
  }

  // 2. For formats supported by backend (stl, ply, obj, gltf), try backend endpoint first if jobId exists
  if (jobId && ['stl', 'ply', 'obj', 'gltf'].includes(fmt)) {
    try {
      const exportUrl = `${cleanBase}/api/export/${jobId}?format=${fmt}`
      const response = await fetch(exportUrl)
      if (response.ok) {
        const disposition = response.headers.get('Content-Disposition') || ''
        let filename = `${modelName}.${fmt}`
        if (fmt === 'obj') filename = `${modelName}_obj.zip`
        if (fmt === 'gltf') filename = `${modelName}_gltf.zip`

        const match = disposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) {
          filename = match[1]
        }

        const blob = await response.blob()
        triggerFileDownload(blob, filename)
        return
      }
    } catch (backendErr) {
      console.warn(`Backend export for ${fmt} failed, falling back to Three.js client-side exporter:`, backendErr)
    }
  }

  // 3. Client-side Three.js Exporters
  if (!modelUrl) {
    throw new Error('No 3D asset URL available for conversion.')
  }

  const scene = await loadSceneFromUrl(modelUrl)

  if (fmt === 'stl') {
    const exporter = new STLExporter()
    const stlData = exporter.parse(scene, { binary: true })
    const blob = new Blob([stlData], { type: 'model/stl' })
    triggerFileDownload(blob, `${modelName}.stl`)
    return
  }

  if (fmt === 'ply') {
    return new Promise((resolve, reject) => {
      const exporter = new PLYExporter()
      exporter.parse(
        scene,
        (plyData) => {
          try {
            const blob = new Blob([plyData], { type: 'application/octet-stream' })
            triggerFileDownload(blob, `${modelName}.ply`)
            resolve()
          } catch (err) {
            reject(err)
          }
        },
        { binary: true }
      )
    })
  }

  if (fmt === 'usdz') {
    const exporter = new USDZExporter()
    const usdzBytes = await exporter.parseAsync(scene, {
      quickLookCompatible: true,
      maxTextureSize: 2048,
    })
    const blob = new Blob([usdzBytes], { type: 'model/vnd.usdz+zip' })
    triggerFileDownload(blob, `${modelName}.usdz`)
    return
  }

  if (fmt === 'obj') {
    const exporter = new OBJExporter()
    const objText = exporter.parse(scene)
    const mtlText = [
      '# Wavefront Material File exported by Sketch2Shape AI',
      'newmtl material_0',
      'Ka 0.2 0.2 0.2',
      'Kd 0.85 0.85 0.85',
      'Ks 0.25 0.25 0.25',
      'Ns 30',
      'd 1.0',
      'illum 2',
      '',
    ].join('\n')

    const zipped = zipSync({
      [`${modelName}.obj`]: strToU8(objText),
      [`${modelName}.mtl`]: strToU8(mtlText),
    })

    const blob = new Blob([zipped], { type: 'application/zip' })
    triggerFileDownload(blob, `${modelName}_obj.zip`)
    return
  }

  if (fmt === 'gltf') {
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter()
      exporter.parse(
        scene,
        (gltfOutput) => {
          try {
            if (typeof gltfOutput === 'object') {
              const jsonStr = JSON.stringify(gltfOutput, null, 2)
              const zipped = zipSync({
                [`${modelName}.gltf`]: strToU8(jsonStr),
              })
              const blob = new Blob([zipped], { type: 'application/zip' })
              triggerFileDownload(blob, `${modelName}_gltf.zip`)
            } else {
              const blob = new Blob([gltfOutput], { type: 'model/gltf+json' })
              triggerFileDownload(blob, `${modelName}.gltf`)
            }
            resolve()
          } catch (err) {
            reject(err)
          }
        },
        (err) => reject(new Error('GLTF export error: ' + (err.message || err))),
        { binary: false, embedImages: true }
      )
    })
  }

  throw new Error(`Unsupported export format: ${format}`)
}
