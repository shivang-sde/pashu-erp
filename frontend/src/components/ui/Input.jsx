import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function Input({ label, id, type='text', placeholder, value, onChange, error, icon:Icon, required, autoComplete, className='' }) {
  const [showPw, setShowPw] = useState(false)
  const isPw = type === 'password'

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700 font-body">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Icon size={16}/></span>}
        <input
          id={id} type={isPw ? (showPw ? 'text' : 'password') : type}
          placeholder={placeholder} value={value} onChange={onChange}
          autoComplete={autoComplete} required={required}
          className={['input-base', Icon?'pl-10':'', isPw?'pr-11':'', error?'input-error':''].filter(Boolean).join(' ')}
        />
        {isPw && (
          <button type="button" tabIndex={-1} onClick={() => setShowPw(p=>!p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
            {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0"/>{error}</p>}
    </div>
  )
}
