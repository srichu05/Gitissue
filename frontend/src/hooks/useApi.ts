import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/services/api"
import type { Topic } from "@/types"

export const queryKeys = {
  analyses: ["analyses"] as const,
  analysis: (id: string) => ["analyses", id] as const,
  topics: (analysisId: string) => ["analyses", analysisId, "topics"] as const,
  topic: (analysisId: string, topicIdentifier: string | number) =>
    ["analyses", analysisId, "topics", String(topicIdentifier)] as const,
  issues: (analysisId: string, topicIndex?: number) =>
    topicIndex !== undefined
      ? (["analyses", analysisId, "issues", topicIndex] as const)
      : (["analyses", analysisId, "issues"] as const),
  representativeIssues: (topicId: string) =>
    ["topics", topicId, "issues"] as const,
  issue: (analysisId: string, issueId: string) =>
    ["analyses", analysisId, "issues", issueId] as const,
  trends: (analysisId: string) => ["analyses", analysisId, "trends"] as const,
  evaluation: (analysisId: string) =>
    ["analyses", analysisId, "evaluation"] as const,
  corpusStats: (analysisId: string) =>
    ["analyses", analysisId, "corpus-stats"] as const,
}

export function useAnalyses(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...queryKeys.analyses, page, pageSize],
    queryFn: () => api.listAnalyses(page, pageSize),
  })
}

export function useAnalysis(id: string, pollWhileRunning = true) {
  return useQuery({
    queryKey: queryKeys.analysis(id),
    queryFn: () => api.getAnalysis(id),
    refetchInterval: (query) => {
      if (!pollWhileRunning) return false
      const status = String(query.state.data?.status || "").toLowerCase()
      if (status === "completed" || status === "failed") return false
      return 2500
    },
  })
}

export function useTopics(analysisId: string) {
  return useQuery({
    queryKey: queryKeys.topics(analysisId),
    queryFn: () => api.getTopics(analysisId),
  })
}

export function useTopic(analysisId: string, topicIdentifier: string | number) {
  return useQuery({
    queryKey: queryKeys.topic(analysisId, topicIdentifier),
    queryFn: async (): Promise<Topic> => {
      // If topicIdentifier is a UUID, fetch directly
      const idStr = String(topicIdentifier)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idStr)
      if (isUuid) {
        return api.getTopic(analysisId, idStr)
      }
      // If it's a topic index number, fetch all topics and find matching topic_index
      const topics = await api.getTopics(analysisId)
      const idx = Number(topicIdentifier)
      const found = topics.find((t) => t.topic_index === idx)
      if (found) return found
      throw new Error(`Topic #${topicIdentifier} not found in analysis ${analysisId}`)
    },
  })
}

export function useRepresentativeIssues(topicId: string, analysisId?: string, limit = 10, offset = 0) {
  return useQuery({
    queryKey: [...queryKeys.representativeIssues(topicId), analysisId, limit, offset],
    queryFn: () => api.getTopicRepresentativeIssues(topicId, analysisId, limit, offset),
    enabled: Boolean(topicId),
  })
}

export function useIssue(analysisId: string, issueId: string) {
  return useQuery({
    queryKey: queryKeys.issue(analysisId, issueId),
    queryFn: () => api.getIssue(analysisId, issueId),
    enabled: Boolean(analysisId && issueId),
  })
}

export function useTrends(analysisId: string) {
  return useQuery({
    queryKey: queryKeys.trends(analysisId),
    queryFn: () => api.getTrends(analysisId),
  })
}

export function useEvaluation(analysisId: string) {
  return useQuery({
    queryKey: queryKeys.evaluation(analysisId),
    queryFn: () => api.getEvaluation(analysisId),
  })
}

export function useCorpusStats(analysisId: string) {
  return useQuery({
    queryKey: queryKeys.corpusStats(analysisId),
    queryFn: () => api.getCorpusStats(analysisId),
  })
}

export function useUpdateTopicLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      topicId,
      label,
    }: {
      analysisId?: string
      topicId: string
      label: string | null
    }) => api.updateTopicLabel(topicId, label),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.topics(updated.analysis_id) })
      qc.invalidateQueries({
        queryKey: queryKeys.topic(updated.analysis_id, updated.id),
      })
      qc.invalidateQueries({
        queryKey: queryKeys.topic(updated.analysis_id, updated.topic_index),
      })
    },
  })
}

export function useCreateAnalysis() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      repository_url: string
      k?: number | "auto"
      k_mode?: "auto" | "manual"
      num_topics?: number
      issue_state?: "open" | "closed" | "all"
      max_issues?: number
      min_doc_length?: number
    }) => api.createAnalysis(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.analyses })
    },
  })
}

export function useDeleteAnalysis() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteAnalysis(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.analyses })
    },
  })
}
