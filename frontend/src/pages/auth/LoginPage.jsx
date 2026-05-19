import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { RoleSelector } from '../../components/ui/RoleSelector.jsx'
import { ROLE_ICONS, ROLE_LABELS } from '../../types/auth.js'

const CREDS = [
  { role:'STATE_ADMIN',    email:'admin@pashu.gov.in',      label:'State Admin' },
  { role:'DISTRICT_ADMIN', email:'district@ahmedabad.gov.in',label:'District Admin' },
  { role:'HOSPITAL_ADMIN', email:'hospital@ahmedabad.gov.in',label:'Hospital Admin' },
  { role:'DOCTOR',         email:'doctor@ahmedabad.gov.in', label:'Doctor' },
  { role:'PHARMACIST',     email:'pharma@ahmedabad.gov.in', label:'Pharmacist' },
  { role:'RECEPTIONIST',   email:'reception@ahmedabad.gov.in',label:'Receptionist' },
]

function PashuLogo({ size=40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="12" fill="#1d4ed8"/>
      <path d="M10 28C10 22 14 17 20 17C26 17 30 22 30 28" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      <circle cx="20" cy="13" r="4" fill="white" opacity="0.9"/>
      <path d="M14 17C12 15 9 14 8 16"  stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M26 17C28 15 31 14 32 16" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

export default function LoginPage() {
  const { login, isLoading, error, setError } = useAuth()
  const [form, setForm]     = useState({ email:'', password:'', role:'' })
  const [errors, setErrors] = useState({})

  function set(field) {
    return eOrVal => {
      const val = typeof eOrVal === 'string' ? eOrVal : eOrVal.target.value
      setForm(p => ({ ...p, [field]: val }))
      setErrors(p => ({ ...p, [field]:'' }))
      setError(null)
    }
  }

  function validate() {
    const e = {}
    if (!form.role)     e.role     = 'Please select your role'
    if (!form.email)    e.email    = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Minimum 6 characters'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    await login(form)
  }

  function fill(c) {
    setForm({ email: c.email, password: 'Admin@123', role: c.role })
    setErrors({}); setError(null)
  }

  return (
    <div className="min-h-screen bg-pashu-bg font-body flex flex-col lg:flex-row">

      {/* ─── Left branding ─── */}
      <aside className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-between
                        bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700
                        relative overflow-hidden p-10 xl:p-14">
        <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full bg-white/5 pointer-events-none"/>
        <div className="absolute top-1/3 -left-36 w-72 h-72 rounded-full bg-white/5 pointer-events-none"/>
        <div className="absolute -bottom-24 right-8 w-80 h-80 rounded-full bg-white/5 pointer-events-none"/>

        <div className="relative z-10 animate-fade-in flex items-center gap-3">
          <div className="bg-white/15 rounded-2xl p-2"><PashuLogo size={36}/></div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">PashuCare</h1>
            <p className="text-primary-200 text-xs">ERP Platform</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6 animate-fade-up animate-delay-100 animate-fill-both">
          <div>
            <h2 className="font-display text-4xl xl:text-5xl font-bold text-white leading-[1.15]">
              Veterinary Care,<br/><span className="text-primary-200">Centralized.</span>
            </h2>
            <p className="mt-4 text-primary-200 text-sm leading-relaxed max-w-md">
              State-level management for all veterinary hospitals — tracking animals, medicines, doctors and billing from one unified platform.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['9','Modules'],['6','Roles'],['∞','Hospitals']].map(([v,l]) => (
              <div key={l} className="bg-white/10 rounded-2xl p-4 border border-white/10">
                <div className="font-display text-3xl font-bold text-white">{v}</div>
                <div className="text-primary-200 text-xs mt-1">{l}</div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {['Real-time medicine tracking state-wide','Complete animal patient records','Government-grade audit trail'].map(t => (
              <div key={t} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400"/>
                </div>
                <span className="text-primary-100 text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 animate-fade-in animate-delay-200 animate-fill-both">
          <div className="flex items-center gap-2 bg-white/10 w-fit rounded-full px-4 py-2 border border-white/10">
            <ShieldCheck size={14} className="text-green-400 flex-shrink-0"/>
            <span className="text-primary-100 text-xs">SHA-512 Encrypted · JWT Secured · RBAC Protected</span>
          </div>
        </div>
      </aside>

      {/* ─── Right form ─── */}
      <main className="flex-1 flex flex-col justify-center items-center px-5 sm:px-8 py-10 relative">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8 animate-fade-in">
          <PashuLogo size={40}/>
          <div>
            <h1 className="font-display text-xl font-bold text-slate-800">PashuCare ERP</h1>
            <p className="text-slate-500 text-xs">Veterinary Management System</p>
          </div>
        </div>

        <div className="w-full max-w-sm xl:max-w-md animate-fade-up animate-delay-100 animate-fill-both">

          <div className="mb-7">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-800">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-1.5">Sign in to your account to continue</p>
          </div>

          {/* API error */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 animate-slide-in">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5"/>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <RoleSelector value={form.role} onChange={set('role')} error={errors.role}/>
            <Input label="Email address" id="email" type="email" placeholder="you@pashu.gov.in"
              value={form.email} onChange={set('email')} error={errors.email} icon={Mail} required autoComplete="email"/>
            <Input label="Password" id="password" type="password" placeholder="Enter your password"
              value={form.password} onChange={set('password')} error={errors.password} icon={Lock} required autoComplete="current-password"/>

            <div className="flex justify-end">
              <Link to="/auth/forgot-password" className="text-xs text-primary-700 hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" fullWidth size="lg" loading={isLoading} className="mt-1">
              {isLoading ? 'Signing in…' : <><span>Sign in</span><ArrowRight size={15}/></>}
            </Button>
          </form>

          {/* Credentials hint */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200"/>
            <span className="text-xs text-slate-400 whitespace-nowrap">Seeded accounts</span>
            <div className="flex-1 h-px bg-slate-200"/>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CREDS.map(c => (
              <button key={c.role} type="button" onClick={() => fill(c)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200
                           bg-white hover:bg-slate-50 hover:border-primary-200 hover:shadow-card
                           transition-all duration-200 text-left group">
                <span className="text-lg flex-shrink-0">{ROLE_ICONS[c.role]}</span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-700 truncate group-hover:text-primary-700 transition-colors">{c.label}</div>
                  <div className="text-xs text-slate-400 truncate">{c.email}</div>
                </div>
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">
            All seeded accounts use password:{' '}
            <code className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-xs">Admin@123</code>
          </p>
        </div>

        <p className="absolute bottom-4 text-xs text-slate-400 text-center px-4">
          © 2025 PashuCare ERP · Government Veterinary Management Platform
        </p>
      </main>
    </div>
  )
}
