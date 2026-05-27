import axios from 'axios'
import { getStoredToken } from './auth-storage'
import type { ResourceRecord } from '../types/resources'

type ApiEnvelope<T> = {
  data: T
  meta?: {
    total?: number
  }
  success: boolean
}

type QueryValue = string | number | boolean | undefined | null

const http = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

http.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function listResource<T extends ResourceRecord>(
  endpoint: string,
  search?: string,
  query?: Record<string, QueryValue>,
): Promise<{ items: T[]; total: number }> {
  const params = new URLSearchParams()
  if (search) {
    params.set('search', search)
  }

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') {
        continue
      }

      params.set(key, String(value))
    }
  }

  const response = await http.get<ApiEnvelope<T[]>>(endpoint, {
    params,
  })

  return {
    items: response.data.data ?? [],
    total: response.data.meta?.total ?? response.data.data?.length ?? 0,
  }
}

export async function listOptions(endpoint: string): Promise<ResourceRecord[]> {
  const response = await http.get<ApiEnvelope<ResourceRecord[]>>(endpoint)
  return response.data.data ?? []
}

export async function createResource<T extends ResourceRecord>(
  endpoint: string,
  payload: ResourceRecord,
): Promise<T> {
  const response = await http.post<ApiEnvelope<T>>(endpoint, payload)
  return response.data.data
}

export async function updateResource<T extends ResourceRecord>(
  endpoint: string,
  id: number,
  payload: ResourceRecord,
): Promise<T> {
  const response = await http.put<ApiEnvelope<T>>(`${endpoint}/${id}`, payload)
  return response.data.data
}

export async function deleteResource(endpoint: string, id: number): Promise<void> {
  await http.delete(`${endpoint}/${id}`)
}

export async function getResource<T extends ResourceRecord>(endpoint: string, id: number): Promise<T> {
  const response = await http.get<ApiEnvelope<T>>(`${endpoint}/${id}`)
  return response.data.data
}

export async function replaceResource<T>(path: string, payload: ResourceRecord): Promise<T> {
  const response = await http.put<ApiEnvelope<T>>(path, payload)
  return response.data.data as T
}

export function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { error?: string } | undefined)?.error ??
      error.message ??
      'Terjadi kesalahan saat menghubungi server.'
    )
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Terjadi kesalahan yang tidak diketahui.'
}

export async function downloadFile(endpoint: string, defaultFilename: string): Promise<void> {
  const token = getStoredToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await http.get(endpoint, {
    headers,
    responseType: 'blob',
  })

  const contentDisposition = response.headers['content-disposition'] ?? ''
  const match = contentDisposition.match(/filename="?([^";\n]+)"?/)
  const filename = match?.[1] ?? defaultFilename

  const blob = new Blob([response.data])
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function uploadFile<T>(endpoint: string, file: File): Promise<T> {
  const formData = new FormData()
  formData.append('file', file)

  const token = getStoredToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await http.post<ApiEnvelope<T>>(endpoint, formData, {
    headers,
    timeout: 60000,
  })

  return response.data.data
}
