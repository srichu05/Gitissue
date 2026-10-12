// Core domain types for GitIssue

export interface Repository {
  id: string
  owner: string
  name: string
  full_name: string
  description?: string | null
  stars: number
  forks?: number
  open_issues?: number
  open_issues_count?: number
  language?: string | null
  url?: string
  html_url?: string
}

export type AnalysisStatus =
  | "queued"
  | "fetching"
  | "preprocessing"
  | "training"
  | "analyzing"
  | "completed"
  | "failed"
  | "QUEUED"
  | "FETCHING"
  | "PREPROCESSING"
  | "TRAINING"
  | "ANALYZING"
  | "COMPLETED"
  | "FAILED"

export interface WarningItem {
  code: string
  message: string
}

export interface Analysis {
  id: string
  repository_full_name: string
  repository_url?: string
  status: AnalysisStatus
  progress?: number
  progress_percent?: number
  current_stage_message?: string
  status_message?: string
  k?: number
  num_topics?: number
  issue_count?: number
  num_documents?: number
  num_issues_fetched?: number
  num_dropped?: number
  vocabulary_size?: number
  vocab_size?: number
  coherence_cv?: number
  perplexity?: number
  created_at: string
  completed_at?: string | null
  started_at?: string | null
  error?: string | null
  error_code?: string | null
  error_message?: string | null
  warnings?: WarningItem[]
  repository?: Repository
  config?: Record<string, any>
}

export interface TopicWord {
  rank?: number
  word: string
  probability: number
}

export interface Topic {
  id: string
  analysis_id: string
  topic_index: number
  label?: string | null
  human_label?: string | null
  auto_label: string
  display_label?: string
  label_source?: "auto" | "human"
  prevalence: number
  dominant_issue_count: number
  top_words: TopicWord[]
}

export interface IssueLabel {
  name: string
  color?: string
}

export interface Issue {
  id: string
  analysis_id?: string
  github_number?: number
  number?: number
  title: string
  state?: string
  labels?: string[] | IssueLabel[]
  author?: string | null
  comments_count?: number
  created_at?: string
  created_at_github?: string
  updated_at_github?: string
  closed_at_github?: string | null
  github_url?: string
  html_url?: string
  topic_distribution?: TopicDistributionItem[]
  distribution?: IssueDistributionItem[]
  dominant_topic_index?: number
  probability?: number
}

export interface TopicDistributionItem {
  topic_id?: string
  topic_index: number
  auto_label?: string
  display_label?: string
  probability: number
}

export interface IssueDistributionItem {
  topic_id: string
  topic_index: number
  display_label: string
  probability: number
}

export interface MonthlyTrendTopic {
  topic_id: string
  prevalence: number
}

export interface MonthlyTrendSeries {
  month: string
  issue_count: number
  topics: MonthlyTrendTopic[]
}

export interface TrendsResponse {
  method: string
  granularity: string
  sufficient: boolean
  series: MonthlyTrendSeries[]
}

export interface TrendDataPoint {
  month: string
  [topicKey: string]: number | string
}

export interface EvaluationResultItem {
  k: number
  coherence_cv: number
  log_perplexity_bound: number
  perplexity: number
}

export interface EvaluationResponse {
  k_mode: string
  selected_k: number
  best_k_by_coherence: number
  criterion: string
  results: EvaluationResultItem[]
  note?: string
}

export interface EvaluationDataPoint {
  k: number
  coherence: number
  perplexity: number
}

export interface TermFrequencyItem {
  term: string
  document_frequency: number
  total_count: number
}

export interface PreprocessingSample {
  issue_number: number
  raw: string
  cleaned: string
  tokenized: string[]
  stopword_filtered: string[]
  lemmatized: string[]
  bow: Record<string, any>[]
}

export interface DTMPreviewRow {
  issue_number: number
  counts: number[]
}

export interface DTMPreview {
  terms: string[]
  rows: DTMPreviewRow[]
}

export interface CorpusStatsResponse {
  num_issues_fetched: number
  num_documents: number
  num_dropped: number
  vocab_size: number
  total_tokens: number
  avg_tokens_per_doc: number
  min_tokens_per_doc: number
  max_tokens_per_doc: number
  top_terms: TermFrequencyItem[]
  samples: PreprocessingSample[]
  document_term_matrix_preview: DTMPreview
}

export interface CorpusStats {
  raw_issue_count: number
  retained_document_count: number
  dropped_document_count: number
  vocabulary_size: number
  avg_tokens_per_document: number
  min_tokens: number
  max_tokens: number
  total_tokens: number
  preprocessing_steps?: string[]
}

export interface AnalysisResult {
  analysis: Analysis
  topics: Topic[]
  corpus_stats: CorpusStatsResponse | CorpusStats
  evaluation: EvaluationResultItem[] | EvaluationDataPoint[]
  selected_k: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page?: number
  page_size?: number
  limit?: number
  offset?: number
}
