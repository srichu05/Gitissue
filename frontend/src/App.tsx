import { BrowserRouter, Routes, Route } from "react-router-dom"

import { LandingPage } from "@/pages/Landing/LandingPage"
import { SignInPage } from "@/pages/Auth/SignInPage"
import { SignUpPage } from "@/pages/Auth/SignUpPage"
import { AppLayout } from "@/pages/Layout/AppLayout"
import { DashboardPage } from "@/pages/Dashboard/DashboardPage"
import { AnalyzePage } from "@/pages/Analyze/AnalyzePage"
import { AnalysisProgressPage } from "@/pages/Analysis/AnalysisProgressPage"
import { TopicDashboardPage } from "@/pages/Analysis/TopicDashboardPage"
import { TopicDetailPage } from "@/pages/Topic/TopicDetailPage"
import { IssueDetailPage } from "@/pages/Issue/IssueDetailPage"
import { TrendsPage } from "@/pages/Analysis/TrendsPage"
import { EvaluationPage } from "@/pages/Analysis/EvaluationPage"
import { CorpusStatsPage } from "@/pages/Analysis/CorpusStatsPage"
import { ExportsPage } from "@/pages/Analysis/ExportsPage"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />

        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="history" element={<DashboardPage />} />
          <Route path="analyze" element={<AnalyzePage />} />
          <Route path="analyses/:analysisId" element={<AnalysisProgressPage />} />
          <Route path="analyses/:analysisId/topics" element={<TopicDashboardPage />} />
          <Route path="analyses/:analysisId/topics/:topicIndex" element={<TopicDetailPage />} />
          <Route path="analyses/:analysisId/issues/:issueId" element={<IssueDetailPage />} />
          <Route path="analyses/:analysisId/trends" element={<TrendsPage />} />
          <Route path="analyses/:analysisId/evaluation" element={<EvaluationPage />} />
          <Route path="analyses/:analysisId/corpus" element={<CorpusStatsPage />} />
          <Route path="analyses/:analysisId/exports" element={<ExportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
