import { useNavigate } from 'react-router-dom'
import { LogOut, Construction, User, Building2, MapPin } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { ROLE_LABELS, ROLE_ICONS } from '../../types/auth.js'

export default function DashboardPlaceholder() {
  const { getUser, logout } = useAuth()
  const user = getUser()

  return (
    <div className="min-h-screen bg-pashu-bg font-body flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-card border border-pashu-border p-8 max-w-md w-full text-center space-y-5 animate-fade-up">

        <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto">
          <Construction size={28} className="text-primary-700"/>
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">
            {ROLE_ICONS[user?.role]} Dashboard
          </h2>
          <p className="text-slate-500 text-sm mt-1.5">
            Welcome, <strong className="text-slate-700">{user?.name}</strong>
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 text-left space-y-3 border border-slate-100">
          {[
            [User, 'Role',       ROLE_LABELS[user?.role]],
            [User, 'Email',      user?.email],
            user?.hospitalId && [Building2, 'Hospital ID', user.hospitalId],
            user?.districtId && [MapPin,    'District ID', user.districtId],
          ].filter(Boolean).map(([Icon, label, val]) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Icon size={13} className="text-primary-600"/>
              </div>
              <span className="text-slate-500 text-sm min-w-[80px]">{label}</span>
              <span className="font-medium text-slate-700 text-sm truncate">{val}</span>
            </div>
          ))}
        </div>

        <div className="bg-green-50 rounded-xl p-3 border border-green-100">
          <p className="text-xs text-green-700 font-medium">
            ✅ Connected to MySQL · JWT authenticated · SHA-512 signed
          </p>
        </div>

        <p className="text-xs text-slate-400">
          Full dashboard coming in the next phase.
        </p>

        <Button variant="secondary" onClick={logout} icon={LogOut} fullWidth>Sign out</Button>
      </div>
    </div>
  )
}
