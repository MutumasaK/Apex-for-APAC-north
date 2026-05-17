export type AiCoachSubmissionInput = {
  teamName: string
  submitterName: string
  email: string
  discordId?: string
  rankTier: string
  mapName: string
  teamComp: string
  sceneType: string
  focusPoints: string
  description: string
  timestamps: string
  videoUrl?: string
  videoFileUrl?: string
  shareWithTeammates: boolean
}

export type AiCoachAnalysisReport = {
  id: string
  submission_id: string
  team_id: string
  report_status: 'pending' | 'processing' | 'completed' | 'failed'
  summary?: string | null
  good_points?: string | null
  problems?: string | null
  improvements?: string | null
  igl_call_examples?: string | null
  checklist?: unknown
  team_trends?: string | null
  raw_ai_response?: unknown
  created_at?: string
  updated_at?: string
}

export type AiCoachFeedbackPayload = {
  report: AiCoachAnalysisReport
  submission: Record<string, unknown>
  team: Record<string, unknown>
  shareUrl: string
}
