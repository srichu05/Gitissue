// Centralized API client for GitIssue Phase 2 / Phase 3 integration
import type {
  Analysis,
  CorpusStatsResponse,
  EvaluationResponse,
  Issue,
  PaginatedResponse,
  Repository,
  Topic,
  TrendsResponse,
} from "@/types"

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000"

export async function getAuthToken(): Promise<string | null> {
  // 1. Check if Clerk is loaded on window
  try {
    const clerk = (window as any).Clerk
    if (clerk?.session) {
      const token = await clerk.session.getToken()
      if (token) return token
    }
  } catch (err) {
    console.warn("Failed to retrieve Clerk token:", err)
  }

  // 2. In dev/testing when Clerk JWKS is unconfigured, provide stub token
  return "test_token_dev_user"
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAuthToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string>),
  }

  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let errorDetail = "An unexpected error occurred."
    try {
      const errorJson = await res.json()
      if (errorJson?.error?.message) {
        errorDetail = errorJson.error.message
      } else if (errorJson?.detail) {
        errorDetail =
          typeof errorJson.detail === "string"
            ? errorJson.detail
            : JSON.stringify(errorJson.detail)
      }
    } catch {
      errorDetail = await res.text().catch(() => `HTTP ${res.status}`)
    }
    throw new Error(errorDetail || `HTTP ${res.status}`)
  }

  if (res.status === 204) {
    return undefined as unknown as T
  }

  return res.json() as Promise<T>
}

export async function downloadFile(
  path: string,
  filenameFallback: string
): Promise<void> {
  const token = await getAuthToken()
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const res = await fetch(`${API_BASE}${path}`, { headers })
  if (!res.ok) {
    throw new Error(`Export download failed: ${res.statusText}`)
  }

  // Try reading filename from Content-Disposition header
  const disposition = res.headers.get("Content-Disposition")
  let filename = filenameFallback
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^"]+)"?/)
    if (match?.[1]) filename = match[1]
  }

  const blob = await res.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = downloadUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(downloadUrl)
}

export const api = {
  // Repository Validation (PRD §11.1)
  validateRepository: (url: string) =>
    apiFetch<Repository>("/api/repositories/validate", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  // Start Analysis (PRD §11.2)
  createAnalysis: (body: {
    repository_url: string
    k?: number | "auto"
    k_mode?: "auto" | "manual"
    num_topics?: number
    issue_state?: "open" | "closed" | "all"
    max_issues?: number
    min_doc_length?: number
  }) => {
    const kMode = body.k_mode ?? (body.k === "auto" || !body.k ? "auto" : "manual")
    const numTopics =
      kMode === "manual"
        ? (typeof body.k === "number" ? body.k : body.num_topics ?? 5)
        : null

    const payload = {
      url: body.repository_url,
      config: {
        k_mode: kMode,
        num_topics: numTopics,
        issue_state: body.issue_state ?? "all",
        max_issues: body.max_issues ?? 500,
        min_doc_length: body.min_doc_length ?? 8,
      },
    }

    return apiFetch<{ analysis_id: string; status: string }>(
      "/api/repositories/analyze",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  },

  // Analyses CRUD (PRD §11.3)
  listAnalyses: (page = 1, pageSize = 20) => {
    const offset = (page - 1) * pageSize
    return apiFetch<PaginatedResponse<Analysis>>(
      `/api/analyses?limit=${pageSize}&offset=${offset}`
    )
  },

  getAnalysis: (id: string) => apiFetch<Analysis>(`/api/analyses/${id}`),

  deleteAnalysis: (id: string) =>
    apiFetch<void>(`/api/analyses/${id}`, { method: "DELETE" }),

  // Topics (PRD §11.4, §11.5, §11.6)
  getTopics: (analysisId: string): Promise<Topic[]> =>
    apiFetch<{ topics: Topic[] } | Topic[]>(`/api/analyses/${analysisId}/topics`).then(
      (res): Topic[] => (Array.isArray(res) ? res : (res as any)?.topics || [])
    ),

  getTopic: (analysisId: string, topicId: string) =>
    apiFetch<Topic>(`/api/analyses/${analysisId}/topics/${topicId}`),

  updateTopicLabel: (topicId: string, label: string | null) =>
    apiFetch<Topic>(`/api/topics/${topicId}`, {
      method: "PATCH",
      body: JSON.stringify({ human_label: label }),
    }),

  getTopicRepresentativeIssues: (
    topicId: string,
    analysisId?: string,
    limit = 10,
    offset = 0
  ) => {
    const path = analysisId
      ? `/api/analyses/${analysisId}/topics/${topicId}/issues?limit=${limit}&offset=${offset}`
      : `/api/topics/${topicId}/issues?limit=${limit}&offset=${offset}`
    return apiFetch<PaginatedResponse<Issue>>(path)
  },

  // Issues (PRD §11.8)
  getIssue: (analysisId: string, issueId: string) =>
    apiFetch<Issue>(`/api/analyses/${analysisId}/issues/${issueId}`),

  // Trends (PRD §11.7)
  getTrends: (analysisId: string) =>
    apiFetch<TrendsResponse>(`/api/analyses/${analysisId}/trends`),

  // Evaluation (PRD §11.9)
  getEvaluation: (analysisId: string) =>
    apiFetch<EvaluationResponse>(`/api/analyses/${analysisId}/evaluation`),

  // Corpus Statistics (PRD §11.10)
  getCorpusStats: (analysisId: string) =>
    apiFetch<CorpusStatsResponse>(`/api/analyses/${analysisId}/corpus-stats`),

  // Exports (PRD §11.11)
  exportFile: (
    analysisId: string,
    type: "report_md" | "report_json" | "topic_words_csv" | "doc_topics_csv"
  ) => {
    const extMap: Record<string, string> = {
      report_md: "report.md",
      report_json: "report.json",
      topic_words_csv: "topic_words.csv",
      doc_topics_csv: "doc_topics.csv",
    }
    return downloadFile(
      `/api/analyses/${analysisId}/export?type=${type}`,
      `gitissue-${analysisId.slice(0, 8)}-${extMap[type]}`
    )
  },
}
