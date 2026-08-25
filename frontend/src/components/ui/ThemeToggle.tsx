import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

interface ThemeToggleProps {
  variant?: 'switch' | 'button'
  size?: 'sm' | 'md'
  className?: string
}

export function ThemeToggle({
  variant = 'switch',
  size = 'sm',
  className = '',
}: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
        title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
        className={`relative p-2 rounded-xl transition-all duration-300 cursor-pointer ${
          isDark
            ? 'text-amber-300 hover:text-amber-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 shadow-xs'
            : 'text-slate-600 hover:text-indigo-600 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/80 shadow-2xs'
        } ${className}`}
      >
        <div className="relative w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
          <Sun
            className={`w-full h-full transform transition-all duration-300 ${
              isDark ? 'scale-0 rotate-90 opacity-0 absolute' : 'scale-100 rotate-0 opacity-100'
            }`}
          />
          <Moon
            className={`w-full h-full transform transition-all duration-300 ${
              isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0 absolute'
            }`}
          />
        </div>
      </button>
    )
  }

  // Switch pill variant
  const isSmall = size === 'sm'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      onClick={toggleTheme}
      title={isDark ? 'Modo Escuro ativo (Clique para Modo Claro)' : 'Modo Claro ativo (Clique para Modo Escuro)'}
      className={`group relative inline-flex items-center shrink-0 cursor-pointer rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 select-none ${
        isDark
          ? 'bg-slate-800/90 border border-slate-700/90 shadow-inner'
          : 'bg-slate-200/90 border border-slate-300/80 shadow-inner'
      } ${
        isSmall
          ? 'h-7 w-14 p-0.5'
          : 'h-8 w-16 p-1'
      } ${className}`}
    >
      {/* Background Icons */}
      <div className="w-full flex items-center justify-between px-1 pointer-events-none">
        <Sun
          className={`transition-all duration-300 ${
            isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'
          } ${
            !isDark ? 'text-amber-500 opacity-100 scale-100' : 'text-slate-500 opacity-40 scale-75'
          }`}
        />
        <Moon
          className={`transition-all duration-300 ${
            isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'
          } ${
            isDark ? 'text-indigo-400 opacity-100 scale-100' : 'text-slate-400 opacity-40 scale-75'
          }`}
        />
      </div>

      {/* Sliding Knob */}
      <span
        className={`absolute rounded-full transition-all duration-300 ease-out flex items-center justify-center shadow-md ${
          isSmall ? 'w-5 h-5' : 'w-6 h-6'
        } ${
          isDark
            ? isSmall
              ? 'left-[calc(100%-1.4rem)] bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white shadow-indigo-500/25 ring-1 ring-indigo-400/30'
              : 'left-[calc(100%-1.65rem)] bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white shadow-indigo-500/25 ring-1 ring-indigo-400/30'
            : 'left-0.5 sm:left-1 bg-white text-amber-500 ring-1 ring-slate-900/5'
        }`}
      >
        {isDark ? (
          <Moon className={`${isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-white`} />
        ) : (
          <Sun className={`${isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-amber-500`} />
        )}
      </span>
    </button>
  )
}
