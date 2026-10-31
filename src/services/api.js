import axios from 'axios'

/**
 * Sketch2Shape API Service
 * Centralized API client for communicating with the FastAPI backend.
 */
export const BACKEND_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001'

const apiClient = axios.create({
  baseURL: BACKEND_BASE_URL,
  timeout: 30000,
})

/**
 * Converts a base64 data URL string (e.g. from canvas) to a standard binary Blob.
 *
 * @param {string} dataUrl
 * @returns {Promise<Blob>}
 */
export async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl)
  return await response.blob()
}

/**
 * Submit sketch canvas or uploaded image to the FastAPI /api/generate endpoint.
 *
 * @param {Object} params
 * @param {File} [params.file] - Direct File object from image upload
 * @param {string|Blob} [params.image] - Base64 data URL string or Blob from canvas
 * @param {string} [params.prompt] - Optional text prompt
 * @param {'draw'|'upload'} [params.mode] - Input mode indicator
 * @returns {Promise<{ job_id: string, status: string, message: string, filename: string, prompt?: string, created_at: string }>}
 */
export async function generate3DModel({
  file = null,
  image = null,
  prompt = '',
  mode = 'draw',
}) {
  const formData = new FormData()

  // Ensure only one input is sent as 'file'
  if (file instanceof File) {
    formData.append('file', file, file.name)
  } else if (image instanceof Blob) {
    formData.append('file', image, 'sketch.png')
  } else if (typeof image === 'string' && image.startsWith('data:')) {
    const blob = await dataUrlToBlob(image)
    formData.append('file', blob, 'sketch.png')
  } else {
    throw new Error('No valid sketch drawing or image file was provided.')
  }

  if (prompt && prompt.trim() !== '') {
    formData.append('prompt', prompt.trim())
  }
  formData.append('mode', mode)

  const response = await apiClient.post('/api/generate', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

/**
 * Poll current pipeline status for a specific job_id from GET /api/status/{job_id}.
 *
 * @param {string} jobId
 * @returns {Promise<{ job_id: string, status: 'queued'|'processing'|'completed'|'failed', prompt?: string, created_at: string, model_url?: string|null, error?: string|null }>}
 */
export async function getJobStatus(jobId) {
  if (!jobId) throw new Error('A valid jobId is required to check status.')
  const response = await apiClient.get(`/api/status/${jobId}`)
  return response.data
}

/**
 * Resolve relative model URLs (e.g. /api/model/{job_id}) against the backend base URL.
 *
 * @param {string|null} relativeOrAbsoluteUrl
 * @returns {string|null}
 */
export function resolveModelUrl(relativeOrAbsoluteUrl) {
  if (!relativeOrAbsoluteUrl) return null
  if (
    relativeOrAbsoluteUrl.startsWith('http://') ||
    relativeOrAbsoluteUrl.startsWith('https://') ||
    relativeOrAbsoluteUrl.startsWith('blob:')
  ) {
    return relativeOrAbsoluteUrl
  }
  const cleanBase = BACKEND_BASE_URL.replace(/\/+$/, '')
  const cleanPath = relativeOrAbsoluteUrl.startsWith('/')
    ? relativeOrAbsoluteUrl
    : `/${relativeOrAbsoluteUrl}`
  return `${cleanBase}${cleanPath}`
}

/**
 * Extract human-readable error messages from Axios or backend HTTPException responses.
 *
 * @param {any} error
 * @returns {string}
 */
export function getApiErrorMessage(error) {
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
    }
  }
  if (error.code === 'ERR_NETWORK') {
    return `Unable to connect to backend at ${BACKEND_BASE_URL}. Ensure the FastAPI server is running.`
  }
  return error.message || 'An unexpected error occurred during the API request.'
}
