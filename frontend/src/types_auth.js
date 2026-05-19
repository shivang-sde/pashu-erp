export const ROLES = {
  STATE_ADMIN:'STATE_ADMIN', DISTRICT_ADMIN:'DISTRICT_ADMIN',
  HOSPITAL_ADMIN:'HOSPITAL_ADMIN', DOCTOR:'DOCTOR',
  PHARMACIST:'PHARMACIST', RECEPTIONIST:'RECEPTIONIST',
}

export const ROLE_LABELS = {
  STATE_ADMIN:'State Admin', DISTRICT_ADMIN:'District Admin',
  HOSPITAL_ADMIN:'Hospital Admin', DOCTOR:'Doctor',
  PHARMACIST:'Pharmacist', RECEPTIONIST:'Receptionist',
}

export const ROLE_ICONS = {
  STATE_ADMIN:'🏛️', DISTRICT_ADMIN:'🏢', HOSPITAL_ADMIN:'🏥',
  DOCTOR:'🩺', PHARMACIST:'💊', RECEPTIONIST:'📋',
}

export const ROLE_COLORS = {
  STATE_ADMIN:    { text:'#1d4ed8', bg:'#dbeafe', border:'#bfdbfe' },
  DISTRICT_ADMIN: { text:'#4338ca', bg:'#eef2ff', border:'#c7d2fe' },
  HOSPITAL_ADMIN: { text:'#0f766e', bg:'#f0fdfa', border:'#99f6e4' },
  DOCTOR:         { text:'#15803d', bg:'#f0fdf4', border:'#bbf7d0' },
  PHARMACIST:     { text:'#b45309', bg:'#fffbeb', border:'#fde68a' },
  RECEPTIONIST:   { text:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe' },
}

export const ROLE_DASHBOARD = {
  STATE_ADMIN:    '/dashboard/state',
  DISTRICT_ADMIN: '/dashboard/district',
  HOSPITAL_ADMIN: '/dashboard/hospital',
  DOCTOR:         '/dashboard/doctor',
  PHARMACIST:     '/dashboard/pharmacy',
  RECEPTIONIST:   '/dashboard/reception',
}
