export type Role = 'aluno' | 'professor' | 'coordenador' | 'admin'
export type CourseStatus = 'draft' | 'pending' | 'published' | 'archived'
export type TrailType = 'linear' | 'nonlinear' | 'adaptive'
export type ContentType = 'video' | 'pdf' | 'audio' | 'scorm' | 'h5p' | 'quiz'
export type LessonStatus = 'not_started' | 'in_progress' | 'completed'
export type UnlockType = 'sequential' | 'free' | 'prerequisite'

export interface Profile {
  id: string
  name: string
  email: string
  role: Role
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  title: string
  description: string | null
  creator_id: string
  status: CourseStatus
  thumbnail_url: string | null
  accent_color: string
  trail_type: TrailType
  estimated_hours: number | null
  created_at: string
  updated_at: string
  // joined
  creator?: Profile
  enrollment?: Enrollment
  modules_count?: number
}

export interface Module {
  id: string
  course_id: string
  title: string
  description: string | null
  order: number
  unlock_type: UnlockType
  prerequisite_module_id: string | null
  created_at: string
  // joined
  lessons?: Lesson[]
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  order: number
  content_type: ContentType
  content_url: string | null
  duration_seconds: number | null
  is_free_preview: boolean
  created_at: string
  // joined
  progress?: Progress
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
  completed_at: string | null
}

export interface Progress {
  id: string
  user_id: string
  lesson_id: string
  status: LessonStatus
  score: number | null
  time_spent: number
  completed_at: string | null
}

export interface Quiz {
  id: string
  lesson_id: string
  questions: QuizQuestion[]
  passing_score: number
  max_attempts: number
  created_at: string
}

export interface QuizQuestion {
  id: string
  text: string
  options: { id: string; text: string }[]
  correct_option_id: string
  explanation: string | null
}

export interface QuizAttempt {
  id: string
  user_id: string
  quiz_id: string
  answers: Record<string, string>
  score: number
  passed: boolean
  attempted_at: string
}

export interface Certificate {
  id: string
  user_id: string
  course_id: string
  verification_code: string
  issued_at: string
  // joined
  course?: Course
  user?: Profile
}

export interface Badge {
  id: string
  course_id: string
  name: string
  description: string
  icon_url: string | null
  trigger_type: 'lesson_complete' | 'course_complete' | 'streak' | 'xp_reached' | 'quiz_perfect'
  trigger_value: number
  created_at: string
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  badge?: Badge
}

export interface UserXP {
  id: string
  user_id: string
  total_xp: number
  level: number
  streak_days: number
  last_activity_date: string | null
}

export interface XPTransaction {
  id: string
  user_id: string
  amount: number
  reason: string
  created_at: string
}
