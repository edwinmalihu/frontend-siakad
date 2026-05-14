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
): Promise<{ items: T[]; total: number }> {
  const response = await http.get<ApiEnvelope<T[]>>(endpoint, {
    params: search ? { search } : undefined,
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
