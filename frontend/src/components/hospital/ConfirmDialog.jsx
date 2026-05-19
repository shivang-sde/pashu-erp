import { AlertTriangle, Loader2, X } from 'lucide-react'
import { Button } from '../ui/Button.jsx'

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.35)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-fade-up">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-red-500"/>
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-slate-800">{title}</h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button>
            <Button variant="danger" onClick={onConfirm} loading={loading}>Delete</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
