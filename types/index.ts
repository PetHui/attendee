export type UserRole = 'owner' | 'admin' | 'staff'
export type EventStatus = 'draft' | 'published' | 'closed' | 'archived'
export type FieldType = 'text' | 'select' | 'checkbox'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
}

export interface UserProfile {
  id: string
  organization_id: string
  role: UserRole
  email: string
  name: string
  created_at: string
  organization?: Organization
}

export interface Event {
  id: string
  organization_id: string
  title: string
  description: string | null
  location: string | null
  starts_at: string | null
  ends_at: string | null
  max_participants: number | null
  status: EventStatus
  created_at: string
}

export interface RegistrationField {
  id: string
  event_id: string
  label: string
  field_type: FieldType
  required: boolean
  options: string[] | null
  sort_order: number
  created_at: string
}

export interface Participant {
  id: string
  event_id: string
  qr_code: string
  checked_in_at: string | null
  checked_in_by: string | null
  created_at: string
}

export interface ParticipantFieldValue {
  id: string
  participant_id: string
  field_id: string
  value: string | null
}

export interface ParticipantWithValues extends Participant {
  field_values: (ParticipantFieldValue & { field?: RegistrationField })[]
}
