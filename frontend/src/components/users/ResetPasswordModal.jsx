import { useState, useEffect } from 'react'
import { X, KeyRound, Eye, EyeOff } from 'lucide-react'
import { userApi } from '../../api/users.js'
import { Button } from '../ui/Button.jsx'

export function ResetPasswordModal({ open, onClose, user }) {
  const [password,  setPassword]  = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [apiErr,    setApiErr]    = useState('')
  const [success,   setSuccess]   = useState(false)

  useEffect(() => {
    if (open) { setPassword(''); setApiErr(''); setSuccess(false); setShowPw(false) }
  }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!password || password.length < 6) { setApiErr('Minimum 6 characters required'); return }
    setSaving(true)
    try {
      await userApi.resetPassword(user.id, { new_password: password })
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch (err) {
      setApiErr(err?.response?.data?.message || 'Failed to reset password')
    } finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center"><KeyRound size={18} className="text-amber-600"/></div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-800">Reset Password</h2>
              <p className="text-xs text-slate-400">{user?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {success && <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 text-center">✓ Password reset successfully!</div>}
          {apiErr  && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{apiErr}</div>}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">New Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} placeholder="Min. 6 characters"
                value={password} onChange={e => { setPassword(e.target.value); setApiErr('') }}
                className="input-base pr-11" autoFocus/>
              <button type="button" tabIndex={-1} onClick={() => setShowPw(p=>!p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>Reset Password</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
