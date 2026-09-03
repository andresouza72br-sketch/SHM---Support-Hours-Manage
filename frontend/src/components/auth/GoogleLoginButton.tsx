import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'

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
  const tokenClientRef = useRef<any>(null)

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  useEffect(() => {
    if (!googleClientId) return

    let isMounted = true

    const initGoogleAuth = () => {
      if (!window.google?.accounts) return

      try {
        // Inicializar Token Client para acionar popup via botão customizado
        if (window.google.accounts.oauth2) {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: 'openid email profile',
            callback: async (response: any) => {
              if (response.error) {
                if (response.error !== 'access_denied') {
                  onError(`Erro Google: ${response.error_description || response.error}`)
                }
                if (isMounted) setLoading(false)
                return
              }

              if (response.access_token) {
                if (isMounted) setLoading(true)
                try {
                  await onSuccess(response.access_token)
                } catch (err: any) {
                  const msg = err.response?.data?.detail || 'Falha ao autenticar com a conta Google.'
                  onError(msg)
                } finally {
                  if (isMounted) setLoading(false)
                }
              }
            },
          })
        }

        // Inicializar também o Identity Services para compatibilidade com ID Tokens
        if (window.google.accounts.id) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
              if (response.credential) {
                if (isMounted) setLoading(true)
                try {
                  await onSuccess(response.credential)
                } catch (err: any) {
                  const msg = err.response?.data?.detail || 'Falha ao autenticar com a conta Google.'
                  onError(msg)
                } finally {
                  if (isMounted) setLoading(false)
                }
              }
            },
            auto_select: false,
          })
        }
      } catch (e) {
        console.error('Erro ao inicializar clientes do Google OAuth:', e)
      }
    }

    const loadGsiScript = () => {
      if (window.google?.accounts) {
        initGoogleAuth()
        return
      }

      const existingScript = document.getElementById('google-gsi-script')
      if (!existingScript) {
        const script = document.createElement('script')
        script.id = 'google-gsi-script'
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = () => {
          if (isMounted) initGoogleAuth()
        }
        script.onerror = () => {
          console.warn('Não foi possível carregar o script do Google Identity Services.')
        }
        document.body.appendChild(script)
      } else {
        existingScript.addEventListener('load', initGoogleAuth)
      }
    }

    loadGsiScript()

    return () => {
      isMounted = false
    }
  }, [googleClientId])

  const handleButtonClick = () => {
    if (!googleClientId) {
      onError('VITE_GOOGLE_CLIENT_ID não configurado no arquivo .env.')
      return
    }

    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' })
    } else if (window.google?.accounts?.oauth2) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'openid email profile',
        callback: async (response: any) => {
          if (response.access_token) {
            setLoading(true)
            try {
              await onSuccess(response.access_token)
            } catch (err: any) {
              onError(err.response?.data?.detail || 'Falha ao autenticar com o Google.')
            } finally {
              setLoading(false)
            }
          }
        },
      })
      tokenClientRef.current = client
      client.requestAccessToken({ prompt: 'select_account' })
    } else if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
    } else {
      onError('O serviço de login do Google ainda está carregando. Tente novamente em instantes.')
    }
  }

  return (
    <div className="w-full">
      {/* Botão Customizado com Padrão de Mercado */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled || loading}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-bold text-sm bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700/80 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer group relative overflow-hidden active:scale-[0.99]"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>Validando conta Google...</span>
          </>
        ) : (
          <>
            {/* Logo Oficial Multicolorida do Google */}
            <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
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

            <span>Continuar com Google</span>
          </>
        )}
      </button>
    </div>
  )
}
