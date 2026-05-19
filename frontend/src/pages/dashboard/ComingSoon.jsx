import { Construction } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { ROLE_LABELS, ROLE_ICONS } from '../../types/auth.js'

export default function ComingSoon({ module }) {
  const { getUser } = useAuth()
  const user = getUser()
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Construction size={28} className="text-primary-400"/>
      </div>
      <h2 className="font-display text-xl font-bold text-slate-700">{module || 'Module'} Coming Soon</h2>
      <p className="text-slate-400 text-sm mt-2 max-w-xs">
        This module is being built. Logged in as {ROLE_ICONS[user?.role]} {ROLE_LABELS[user?.role]}.
      </p>
    </div>
  )
}
