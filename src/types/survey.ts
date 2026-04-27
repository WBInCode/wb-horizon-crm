// ─── Unified Survey Question Types ───────────────────────────────
// Single source of truth for all survey systems:
// - Admin SurveyTemplate builder
// - Product survey schema
// - Case SurveyTab
// - Client panel survey form
// - Case creation wizard

export type QuestionType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multi_select"
  | "boolean"
  | "email"
  | "phone"
  | "nip"
  | "scale"
  | "file"
  | "address"
  | "heading"

export interface SurveyQuestion {
  id: string
  label: string
  type: QuestionType
  description?: string
  placeholder?: string
  required?: boolean
  options?: string[]
  // Validation
  validation?: {
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    pattern?: string
    patternMessage?: string
  }
  // Scale type
  scaleMin?: number
  scaleMax?: number
  scaleMinLabel?: string
  scaleMaxLabel?: string
  // Conditional logic
  condition?: {
    questionId: string
    operator: "equals" | "not_equals" | "contains" | "not_empty"
    value?: string
  }
  // Section/group
  section?: string
}

export interface SurveySection {
  id: string
  title: string
  description?: string
}

export interface SurveySchema {
  version: number
  sections: SurveySection[]
  questions: SurveyQuestion[]
}

export interface SurveyAnswers {
  [questionId: string]: string | string[] | boolean | number | null
}

export interface SurveyProgress {
  total: number
  answered: number
  required: number
  requiredAnswered: number
  percentage: number
  isComplete: boolean
}

export function calculateProgress(schema: SurveySchema, answers: SurveyAnswers): SurveyProgress {
  const visibleQuestions = schema.questions.filter(q => {
    if (q.type === "heading") return false
    if (!q.condition) return true
    return isConditionMet(q.condition, answers)
  })

  const total = visibleQuestions.length
  const required = visibleQuestions.filter(q => q.required).length

  const answered = visibleQuestions.filter(q => {
    const val = answers[q.id]
    return val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)
  }).length

  const requiredAnswered = visibleQuestions.filter(q => {
    if (!q.required) return true
    const val = answers[q.id]
    return val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)
  }).length - (total - required)

  const percentage = total > 0 ? Math.round((answered / total) * 100) : 100

  return { total, answered, required, requiredAnswered, percentage, isComplete: requiredAnswered >= required }
}

export function isConditionMet(condition: SurveyQuestion["condition"], answers: SurveyAnswers): boolean {
  if (!condition) return true
  const answer = answers[condition.questionId]
  const answerStr = answer !== null && answer !== undefined ? String(answer) : ""

  switch (condition.operator) {
    case "equals":
      return answerStr === condition.value
    case "not_equals":
      return answerStr !== condition.value
    case "contains":
      return answerStr.toLowerCase().includes((condition.value || "").toLowerCase())
    case "not_empty":
      return answerStr !== ""
    default:
      return true
  }
}

export function validateAnswer(question: SurveyQuestion, value: any): string | null {
  if (question.required) {
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      return "To pole jest wymagane"
    }
  }

  if (value === undefined || value === null || value === "") return null

  const v = question.validation
  if (!v) return null

  if (question.type === "number" || question.type === "scale") {
    const num = Number(value)
    if (isNaN(num)) return "Podaj poprawną liczbę"
    if (v.min !== undefined && num < v.min) return `Minimalna wartość to ${v.min}`
    if (v.max !== undefined && num > v.max) return `Maksymalna wartość to ${v.max}`
  }

  if (question.type === "text" || question.type === "textarea") {
    const str = String(value)
    if (v.minLength !== undefined && str.length < v.minLength) return `Minimum ${v.minLength} znaków`
    if (v.maxLength !== undefined && str.length > v.maxLength) return `Maksimum ${v.maxLength} znaków`
    if (v.pattern) {
      const regex = new RegExp(v.pattern)
      if (!regex.test(str)) return v.patternMessage || "Nieprawidłowy format"
    }
  }

  if (question.type === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) return "Podaj poprawny adres email"
  }

  if (question.type === "phone") {
    const cleaned = String(value).replace(/[\s\-\(\)]/g, "")
    if (!/^\+?\d{9,15}$/.test(cleaned)) return "Podaj poprawny numer telefonu"
  }

  if (question.type === "nip") {
    const nip = String(value).replace(/[\s\-]/g, "")
    if (!/^\d{10}$/.test(nip)) return "NIP musi mieć 10 cyfr"
  }

  return null
}

export function createEmptySchema(): SurveySchema {
  return { version: 1, sections: [], questions: [] }
}

export function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: "Tekst (krótki)",
  textarea: "Tekst (długi)",
  number: "Liczba",
  date: "Data",
  select: "Lista wyboru",
  multi_select: "Wielokrotny wybór",
  boolean: "Tak / Nie",
  email: "Email",
  phone: "Telefon",
  nip: "NIP",
  scale: "Skala / Ocena",
  file: "Plik",
  address: "Adres",
  heading: "Nagłówek sekcji",
}

export const QUESTION_TYPE_ICONS: Record<QuestionType, string> = {
  text: "Type",
  textarea: "AlignLeft",
  number: "Hash",
  date: "Calendar",
  select: "ChevronDown",
  multi_select: "CheckSquare",
  boolean: "ToggleLeft",
  email: "Mail",
  phone: "Phone",
  nip: "Building2",
  scale: "Star",
  file: "Paperclip",
  address: "MapPin",
  heading: "Heading",
}

/** Migrate legacy flat question arrays to unified SurveySchema */
export function migrateToSchema(legacy: any[]): SurveySchema {
  const questions: SurveyQuestion[] = legacy.map((q, i) => {
    // Handle admin format { label, type, required }
    if (q.label) {
      return {
        id: q.id || `q_legacy_${i}`,
        label: q.label,
        type: normalizeType(q.type),
        required: q.required || false,
        options: q.options,
      }
    }
    // Handle product format { question, type, options }
    if (q.question) {
      return {
        id: q.id || `q_legacy_${i}`,
        label: q.question,
        type: normalizeType(q.type),
        required: false,
        options: q.options,
      }
    }
    return {
      id: `q_legacy_${i}`,
      label: `Pytanie ${i + 1}`,
      type: "text" as QuestionType,
    }
  })

  return { version: 1, sections: [], questions }
}

function normalizeType(type: string): QuestionType {
  const map: Record<string, QuestionType> = {
    TEXT: "text", SINGLE: "select", MULTI: "multi_select",
    NUMBER: "number", DATE: "date", FILE: "file",
    text: "text", number: "number", date: "date",
    select: "select", boolean: "boolean", textarea: "textarea",
    checkbox: "boolean", file: "file",
  }
  return map[type] || "text"
}
