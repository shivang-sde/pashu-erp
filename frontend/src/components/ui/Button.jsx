import { Loader2 } from 'lucide-react'

const V = { primary:'bg-primary-700 hover:bg-primary-800 text-white shadow-btn', secondary:'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700', ghost:'hover:bg-slate-100 text-slate-600', danger:'bg-red-600 hover:bg-red-700 text-white', outline:'border-2 border-primary-700 text-primary-700 hover:bg-primary-50' }
const S = { sm:'h-8 px-3 text-xs rounded-lg gap-1.5', md:'h-10 px-4 text-sm rounded-xl gap-2', lg:'h-11 px-5 text-sm rounded-xl gap-2', xl:'h-12 px-6 text-base rounded-xl gap-2' }

export function Button({ children, variant='primary', size='md', loading=false, disabled, icon:Icon, fullWidth, onClick, type='button', className='' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled||loading}
      className={['inline-flex items-center justify-center font-medium font-body transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/40 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]', V[variant]||V.primary, S[size]||S.md, fullWidth?'w-full':'', className].filter(Boolean).join(' ')}>
      {loading ? <Loader2 size={16} className="animate-spin flex-shrink-0"/> : Icon ? <Icon size={16} className="flex-shrink-0"/> : null}
      {children}
    </button>
  )
}
