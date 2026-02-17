const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function requestRaw(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  source_url: string | null;
  source_type: string;
  sources?: Array<{ type: string; url?: string; storagePath?: string }>;
  status: string;
  config: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  document_count?: number;
  assets?: BrandAsset[];
  latestJob?: Job;
}

export interface BrandAsset {
  id: string;
  brand_id: string;
  asset_type: string;
  file_path: string;
}

export interface ProgressEntry {
  message: string;
  timestamp: string;
}

export interface Document {
  id: string;
  brand_id: string;
  title: string | null;
  format: string;
  markdown_path: string;
  pdf_path: string | null;
  rendered_html: string | null;
  edited_html: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  downloadUrl?: string;
}

export interface Job {
  id: string;
  type: string;
  status: string;
  entity_type: string | null;
  entity_id: string | null;
  progress_log: ProgressEntry[];
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface AppLog {
  id: number;
  level: string;
  message: string;
  meta: Record<string, unknown>;
  timestamp: string;
}

export interface ConversationResponse {
  response: string;
  roundNumber: number;
  maxRounds: number;
  isComplete: boolean;
}

export const api = {
  getBrands: () => request<Brand[]>('/brands'),
  getBrand: (slug: string) => request<Brand>(`/brands/${slug}`),

  // F2: Multi-source brand creation
  createBrand: (data: FormData | { name: string; slug: string; sourceUrl?: string; sourceType: string }) => {
    if (data instanceof FormData) {
      return requestRaw('/brands', {
        method: 'POST',
        body: data,
      }).then(r => r.json()) as Promise<{ brand: Brand; jobId: string }>;
    }
    return request<{ brand: Brand; jobId: string }>('/brands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  deleteBrand: (slug: string) => request<{ success: boolean }>(`/brands/${slug}`, { method: 'DELETE' }),
  reExtract: (slug: string) =>
    request<{ jobId: string }>(`/brands/${slug}/re-extract`, { method: 'POST' }),
  regenerateTemplates: (slug: string) =>
    request<{ jobId: string }>(`/brands/${slug}/regenerate-templates`, { method: 'POST' }),

  // F2: Approve brand + conversation
  approveBrand: (slug: string) =>
    request<{ jobId: string }>(`/brands/${slug}/approve`, { method: 'POST' }),
  sendConversationMessage: (slug: string, message: string) =>
    request<ConversationResponse>(`/brands/${slug}/conversation`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  getDocuments: (slug: string) => request<Document[]>(`/brands/${slug}/documents`),
  createDocument: (slug: string, data: { title?: string; format: string; markdownContent: string }) =>
    request<{ document: Document; jobId: string }>(`/brands/${slug}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // F3: Create document from file upload
  createDocumentFromFile: (slug: string, data: { title?: string; format: string; file: File }) => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('format', data.format);
    if (data.title) formData.append('title', data.title);
    return requestRaw(`/brands/${slug}/documents`, {
      method: 'POST',
      body: formData,
    }).then(r => r.json()) as Promise<{ document: Document; jobId: string }>;
  },

  getDocument: (id: string) => request<Document>(`/documents/${id}`),

  // F4: Document editing
  getDocumentHtml: (id: string) => request<{ html: string }>(`/documents/${id}/html`),
  saveDocumentContent: (id: string, editedHtml: string) =>
    request<{ success: boolean }>(`/documents/${id}/content`, {
      method: 'PATCH',
      body: JSON.stringify({ editedHtml }),
    }),
  reRenderDocument: (id: string) =>
    request<{ success: boolean }>(`/documents/${id}/re-render`, { method: 'POST' }),

  getJob: (id: string) => request<Job>(`/jobs/${id}`),

  // Logs
  getLogs: (params?: { level?: string; search?: string; limit?: number; offset?: number; since?: string }) => {
    const query = new URLSearchParams();
    if (params?.level) query.set('level', params.level);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.since) query.set('since', params.since);
    const qs = query.toString();
    return request<{ logs: AppLog[]; total: number }>(`/logs${qs ? `?${qs}` : ''}`);
  },

  getAssetUrl: (slug: string, assetType: string) => `${BASE_URL}/brands/${slug}/assets/${assetType}`,
  getDownloadUrl: (id: string) => `${BASE_URL}/documents/${id}/download`,
  getDocxDownloadUrl: (id: string) => `${BASE_URL}/documents/${id}/download/docx`,
};
