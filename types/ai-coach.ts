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
  report_status: 'pending' | 'processing' | 'completed' | 'failed' | 'plan_limit_reached'
  summary?: string | null
  good_points?: string | null
  problems?: string | null
  improvements?: string | null
  igl_call_examples?: string | null
  checklist?: unknown
  team_trends?: string | null
  raw_ai_response?: AiCoachRawAnalysis | unknown
  map?: string | null
  landmark?: string | null
  scene_type?: string | null
  confidence?: 'high' | 'medium' | 'low' | null
  requires_human_review?: boolean | null
  created_at?: string
  updated_at?: string
}

export type AiCoachRawAnalysis = {
  summary?: string
  good_points?: string
  problems?: string
  improvements?: string
  igl_call_examples?: string | string[]
  checklist?: string[]
  team_trends?: string
  map?: string
  landmark?: string
  scene_type?: string
  video_reviewed?: boolean
  used_sources?: {
    video?: boolean
    screenshot?: boolean
    ai_video_memo?: boolean
    admin_memo?: boolean
    user_description?: boolean
    map_knowledge?: boolean
  }
  fight_decision_type?: string
  macro_decision_type?: string
  main_issue?: string
  main_recommendation?: string
  confidence?: 'high' | 'medium' | 'low'
  requires_human_review?: boolean
  missing_info?: string[]
  discord_summary?: string
  old_landmark_corrected?: boolean
  old_landmark_name?: string
  corrected_landmark_name?: string
  gpts_reference_url?: string
}

export type AiCoachFeedbackPayload = {
  report: AiCoachAnalysisReport
  submission: Record<string, unknown>
  team: Record<string, unknown>
  shareUrl: string
}
