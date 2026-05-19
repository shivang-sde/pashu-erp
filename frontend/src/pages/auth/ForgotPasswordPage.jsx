import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { authApi } from '../../api/auth.js'
import { Input } from '../../components/ui/Input.jsx'
import { Button } from '../../components/ui/Button.jsx'

export default function ForgotPasswordPage() {
  const [email,  setEmail]  = useState('')
  const [status, setStatus] = useState('idle')
  const [msg,    setMsg]    = useState('')
  const [touched,setTouched]= useState(false)
  const emailErr = touched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function handleSubmit(e) {
    e.preventDefault(); setTouched(true)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    setStatus('loading')
    try {
      await authApi.forgotPassword(email)
      setStatus('success')
      setMsg(`If ${email} is registered, a reset link has been sent.`)
    } catch {
      setStatus('success') // always show success (anti-enumeration)
      setMsg(`If ${email} is registered, a reset link has been sent.`)
    }
  }

  return (
    <div className="min-h-screen bg-pashu-bg flex flex-col items-center justify-center px-4 py-12 font-body">
      <div className="w-full max-w-sm animate-fade-up">
        <Link to="/auth/login" className="flex items-center gap-2 mb-10 w-fit group">
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill="#1d4ed8"/><path d="M10 28C10 22 14 17 20 17C26 17 30 22 30 28" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/><circle cx="20" cy="13" r="4" fill="white" opacity="0.9"/></svg>
          <span className="font-display font-bold text-lg text-slate-800 group-hover:text-primary-700 transition-colors">PashuCare ERP</span>
        </Link>
        <div className="card p-7 sm:p-8">
          {status === 'success' ? (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto"><CheckCircle2 size={28} className="text-green-600"/></div>
              <div><h2 className="font-display font-bold text-xl text-slate-800">Check your email</h2><p className="text-sm text-slate-500 mt-2">{msg}</p></div>
              <Link to="/auth/login"><Button fullWidth icon={ArrowLeft}>Back to login</Button></Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="font-display font-bold text-2xl text-slate-800">Reset password</h2>
                <p className="text-sm text-slate-500 mt-1.5">Enter your registered email and we'll send a reset link.</p>
              </div>
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <Input label="Email address" id="fp-email" type="email" placeholder="your@email.com"
                  value={email} onChange={e=>{setEmail(e.target.value);setTouched(false)}}
                  error={emailErr?'Enter a valid email':''} icon={Mail} required/>
                <Button type="submit" fullWidth loading={status==='loading'}>Send reset link</Button>
              </form>
              <div className="mt-5 text-center">
                <Link to="/auth/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-700 transition-colors font-medium">
                  <ArrowLeft size={14}/> Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
