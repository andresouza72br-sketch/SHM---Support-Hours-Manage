import { useState, useEffect, useRef } from 'react'
import { Sparkles, ShieldAlert, X, HelpCircle, Building2, UserCheck } from 'lucide-react'

declare global {
  interface Window {
    google?: any
  }
}

interface GoogleLoginButtonProps {
  onSuccess: (credential: string) => Promise<void> | void
  onError: (errorMsg: string) => void
  disabled?: boolean
}

export function GoogleLoginButton({ onSuccess, onError, disabled }: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showDevModal, setShowDevModal] = useState(false)
  const [customEmail, setCustomEmail] = useState('')
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  useEffect(() => {
    if (!googleClientId) return

    // Carregar o script do Google Identity Services dinamicamente
    const loadGsiScript = () => {
      if (window.google?.accounts?.id) {
        initializeGoogle()
        return
      }

      const existingScript = document.getElementById('google-gsi-script')
      if (!existingScript) {
        const script = document.createElement('script')
        script.id = 'google-gsi-script'
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = () => initializeGoogle()
        document.body.appendChild(script)
      }
    }

    const initializeGoogle = () => {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (response.credential) {
              setLoading(true)
              try {
                await onSuccess(response.credential)
              } catch (err: any) {
                const msg = err.response?.data?.detail || 'Falha ao autenticar com o Google.'
                onError(msg)
              } finally {
                setLoading(false)
              }
            } else {
              onError('Credencial não retornada pelo Google.')
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = ''
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            type: 'standard',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 380,
          })
        }
      } catch (e) {
        console.error('Erro ao inicializar Google Identity:', e)
      }
    }

    loadGsiScript()
  }, [googleClientId])

  const handleButtonClick = () => {
    if (!googleClientId) {
      // Se não há Client ID configurado no .env, abre modal de auxílio & teste rápido
      setShowDevModal(true)
      return
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
    } else {
      onError('O serviço de login do Google ainda está carregando. Tente novamente em instantes.')
    }
  }

  const handleSimulatedLogin = async (email: string) => {
    setLoading(true)
    setShowDevModal(false)
    try {
      await onSuccess(`dev_simulated_token:${email}`)
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Falha ao autenticar com a conta Google informada.'
      onError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="w-full">
        {/* Botão Oficial ou Customizado */}
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={disabled || loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-bold text-sm bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700/80 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer group relative overflow-hidden"
        >
          {/* Logo Oficial do Google */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27A7.054 7.054 0 0 1 4.9 12c0-.79.14-1.56.38-2.27V6.58H1.24C.45 8.16 0 9.98 0 12c0 2.02.45 3.84 1.24 5.42l4.04-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>

          <span>{loading ? 'Validando conta Google...' : 'Continuar com Google'}</span>

          {!googleClientId && (
            <span className="ml-auto text-[10px] uppercase font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Config / Test</span>
            </span>
          )}
        </button>

        {/* Container oculto para render nativo do GIS se configurado */}
        {googleClientId && <div ref={googleBtnRef} className="hidden" />}
      </div>

      {/* Modal de Configuração & Testes do Google OAuth */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-700/90 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-white relative">
            <button
              onClick={() => setShowDevModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27A7.054 7.054 0 0 1 4.9 12c0-.79.14-1.56.38-2.27V6.58H1.24C.45 8.16 0 9.98 0 12c0 2.02.45 3.84 1.24 5.42l4.04-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Autenticação Google OAuth2</h3>
                <p className="text-xs text-slate-400">Ambiente de Testes e Demonstração do SHM</p>
              </div>
            </div>

            <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/40 rounded-2xl space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-indigo-300">
                <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Integração Pronta para Produção</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                O backend do SHM valida o token oficial do Google e restringe o acesso exclusivamente a e-mails cadastrados. Para ativar o botão oficial de produção do Google, informe o <code className="text-indigo-200 font-mono bg-indigo-900/60 px-1 py-0.5 rounded">VITE_GOOGLE_CLIENT_ID</code> no seu arquivo <code className="text-indigo-200 font-mono bg-indigo-900/60 px-1 py-0.5 rounded">.env</code>.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Simular Login Google com E-mails de Teste:
              </div>

              <div className="grid grid-cols-1 gap-2">
                {/* Empresa Admin */}
                <button
                  type="button"
                  onClick={() => handleSimulatedLogin('andresouza72br@gmail.com')}
                  className="w-full text-left p-3 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-violet-500/60 rounded-xl transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-violet-400 group-hover:text-violet-300">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Empresa — Administrador</span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-mono">andresouza72br@gmail.com</div>
                  </div>
                  <span className="text-[10px] bg-violet-950/80 text-violet-300 border border-violet-800/60 px-2.5 py-1 rounded-full font-bold">
                    Autorizado (Admin)
                  </span>
                </button>

                {/* Cliente Gerente mkt-dnb */}
                <button
                  type="button"
                  onClick={() => handleSimulatedLogin('workspace.icb@gmail.com')}
                  className="w-full text-left p-3 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 rounded-xl transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Cliente mkt-dnb — Gerente (Aprovador)</span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-mono">workspace.icb@gmail.com</div>
                  </div>
                  <span className="text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 px-2.5 py-1 rounded-full font-bold">
                    Autorizado (Cliente)
                  </span>
                </button>

                {/* E-mail Não Autorizado (Bloqueio B2B) */}
                <button
                  type="button"
                  onClick={() => handleSimulatedLogin('desconhecido@exemplo.com')}
                  className="w-full text-left p-3 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 hover:border-rose-500/60 rounded-xl transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-400 group-hover:text-rose-300">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>E-mail Não Cadastrado (Bloqueio B2B)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">desconhecido@exemplo.com</div>
                  </div>
                  <span className="text-[10px] bg-rose-950/80 text-rose-300 border border-rose-800/60 px-2.5 py-1 rounded-full font-bold">
                    Deve Bloquear (403)
                  </span>
                </button>
              </div>
            </div>

            {/* Teste com outro e-mail digitado */}
            <div className="pt-2 border-t border-slate-800/80">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Testar Qualquer Outro E-mail:
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="exemplo@google.com"
                  className="flex-1 text-xs bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  disabled={!customEmail.trim()}
                  onClick={() => handleSimulatedLogin(customEmail.trim())}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Testar
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowDevModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
