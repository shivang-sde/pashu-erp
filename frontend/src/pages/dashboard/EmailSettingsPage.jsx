import { useState, useEffect } from 'react'
import {
  Mail, CheckCircle2, XCircle, Send,
  RefreshCw, Eye, EyeOff, AlertTriangle,
} from 'lucide-react'
import { emailApi } from '../../api/email.js'
import { Button } from '../../components/ui/Button.jsx'

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
          <Icon size={16} className="text-blue-600"/>
        </div>
        <h3 className="font-display text-sm font-bold text-slate-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function EmailSettingsPage() {
  const [status,     setStatus]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [testEmail,  setTestEmail]  = useState('')
  const [testing,    setTesting]    = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [toast,      setToast]      = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function loadStatus() {
    setLoading(true)
    try {
      const r = await emailApi.status()
      setStatus(r.data.data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { loadStatus() }, [])

  async function handleTest(e) {
    e.preventDefault()
    if (!testEmail) return
    setTesting(true)
    setTestResult(null)
    try {
      const r = await emailApi.test({ to: testEmail })
      setTestResult({ success: true, message: r.data.message })
      showToast(r.data.message)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send test email'
      setTestResult({ success: false, message: msg })
      showToast(msg, 'error')
    } finally { setTesting(false) }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Email Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure Gmail SMTP for sending emails</p>
      </div>

      {/* Status card */}
      <Section title="Gmail Connection Status" icon={Mail}>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <RefreshCw size={16} className="animate-spin"/> Checking status…
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${status?.configured ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {status?.configured
                ? <CheckCircle2 size={20} className="text-green-600 flex-shrink-0"/>
                : <XCircle size={20} className="text-red-500 flex-shrink-0"/>
              }
              <div>
                <p className={`font-semibold text-sm ${status?.configured ? 'text-green-800' : 'text-red-700'}`}>
                  {status?.configured ? '✅ Gmail configured' : '❌ Gmail not configured'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {status?.configured ? `Sending from: ${status.gmail_user}` : status?.message}
                </p>
              </div>
            </div>

            {!status?.configured && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <AlertTriangle size={15}/> Setup Instructions
                </p>
                <ol className="text-xs text-amber-700 space-y-2 list-decimal ml-4">
                  <li>Go to your Google Account → Security → 2-Step Verification (enable it)</li>
                  <li>Go to Security → App Passwords</li>
                  <li>Select app: <strong>Mail</strong>, device: <strong>Other</strong> → Generate</li>
                  <li>Copy the 16-character App Password</li>
                  <li>Add to your <code className="bg-amber-100 px-1 rounded">backend/.env</code> file:</li>
                </ol>
                <pre className="mt-3 bg-slate-800 text-green-400 text-xs p-3 rounded-lg overflow-x-auto">
{`GMAIL_USER=your.email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx`}
                </pre>
                <p className="text-xs text-amber-700 mt-2">Restart the backend server after updating .env</p>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Test email */}
      <Section title="Send Test Email" icon={Send}>
        <form onSubmit={handleTest} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Recipient Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              className="input-base"
              required
            />
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${testResult.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {testResult.success ? <CheckCircle2 size={15}/> : <XCircle size={15}/>}
              {testResult.message}
            </div>
          )}

          <Button type="submit" loading={testing} icon={Send}
            disabled={!status?.configured}>
            {status?.configured ? 'Send Test Email' : 'Configure Gmail First'}
          </Button>
        </form>
      </Section>

      {/* Email types info */}
      <Section title="Automated Emails" icon={Mail}>
        <div className="space-y-3">
          {[
            { icon:'🔐', label:'Password Reset OTP',          when:'When user requests password reset',          auto: true },
            { icon:'👋', label:'Welcome / Account Created',   when:'When admin creates a new user account',      auto: true },
            { icon:'🧾', label:'Bill Receipt',                when:'When a bill is marked as PAID',              auto: true },
            { icon:'📅', label:'Appointment Confirmation',    when:'Sent manually from appointment details',     auto: false },
            { icon:'⚠️', label:'Low Stock Alert',             when:'Sent manually from Print Center or Admin',  auto: false },
            { icon:'💉', label:'Vaccination Reminder',        when:'Sent manually to animal owner',             auto: false },
          ].map(e => (
            <div key={e.label} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
              <span className="text-xl flex-shrink-0">{e.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{e.label}</p>
                <p className="text-xs text-slate-400">{e.when}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${e.auto ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                {e.auto ? '⚡ Auto' : '🖱 Manual'}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
          <strong>Note:</strong> Owner email addresses need to be stored in the system for automatic emails to work.
          You can add email when registering an animal owner.
        </div>
      </Section>
    </div>
  )
}
