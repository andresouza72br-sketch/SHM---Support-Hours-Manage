import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Pause, Play, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { createMp3FileFromBlob } from '../../utils/mp3Encoder'

interface GravadorAudioProps {
  onAudioGravado: (arquivoMp3: File) => void
  desabilitado?: boolean
  limiteAtingido?: boolean
  maxDuracaoSegundos?: number
}

export function GravadorAudio({
  onAudioGravado,
  desabilitado = false,
  limiteAtingido = false,
  maxDuracaoSegundos = 600, // 10 minutos
}: GravadorAudioProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isEncoding, setIsEncoding] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const [erroMicrofone, setErroMicrofone] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<any>(null)

  // Limpa recursos ao desmontar componente
  useEffect(() => {
    return () => {
      limparRecursos()
    }
  }, [])

  // Timer de gravação
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setSegundos((prev) => {
          if (prev + 1 >= maxDuracaoSegundos) {
            finalizarGravação()
            return maxDuracaoSegundos
          }
          return prev + 1
        })
      }, 1000)
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [isRecording, isPaused, maxDuracaoSegundos])

  const limparRecursos = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // Ignora erro
      }
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close()
      } catch {
        // Ignora erro
      }
      audioContextRef.current = null
    }
    mediaRecorderRef.current = null
    analyserRef.current = null
    audioChunksRef.current = []
  }

  const iniciarGravacao = async () => {
    if (desabilitado || limiteAtingido) return
    setErroMicrofone(null)

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErroMicrofone('Seu navegador não possui suporte para captura de áudio via microfone.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      audioStreamRef.current = stream

      // Configura AnalyserNode para medir o volume e animar as barras sonoras
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const audioCtx = new AudioCtx()
        audioContextRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 64
        source.connect(analyser)
        analyserRef.current = analyser

        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        const updateVolume = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          const avg = sum / dataArray.length
          setVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)))
          animationFrameRef.current = requestAnimationFrame(updateVolume)
        }
        updateVolume()
      }

      // Escolhe o mimeType mais adequado suportado pelo navegador
      let options: MediaRecorderOptions = {}
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' }
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' }
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        options = { mimeType: 'audio/ogg;codecs=opus' }
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' }
      }

      const recorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.start(100) // Coleta pedaços a cada 100ms
      setIsRecording(true)
      setIsPaused(false)
      setSegundos(0)
    } catch (err: any) {
      console.error('Erro ao acessar microfone:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErroMicrofone('Permissão para uso do microfone foi negada. Permita o microfone nas configurações do navegador.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErroMicrofone('Nenhum microfone foi detectado no computador.')
      } else {
        setErroMicrofone('Não foi possível iniciar a gravação do microfone: ' + (err.message || 'Erro desconhecido'))
      }
      limparRecursos()
    }
  }

  const alternarPausa = () => {
    if (!mediaRecorderRef.current || !isRecording) return
    if (isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
    } else {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
    }
  }

  const cancelarGravacao = () => {
    limparRecursos()
    setIsRecording(false)
    setIsPaused(false)
    setSegundos(0)
    setVolumeLevel(0)
  }

  const finalizarGravação = async () => {
    if (!mediaRecorderRef.current || !isRecording) return

    const recorder = mediaRecorderRef.current

    // Para o stream de áudio do microfone para desligar a luz do microfone
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    setIsRecording(false)
    setIsPaused(false)
    setIsEncoding(true)

    // Aguarda o último evento de dados do MediaRecorder
    recorder.onstop = async () => {
      try {
        const mimeType = recorder.mimeType || 'audio/webm'
        const rawBlob = new Blob(audioChunksRef.current, { type: mimeType })

        // Converte para MP3 padrão e gera o arquivo File
        const mp3File = await createMp3FileFromBlob(rawBlob, 'audio_pedido')

        onAudioGravado(mp3File)
      } catch (err) {
        console.error('Erro ao processar e converter áudio MP3:', err)
        setErroMicrofone('Erro ao codificar arquivo MP3. Tente novamente.')
      } finally {
        setIsEncoding(false)
        setSegundos(0)
        setVolumeLevel(0)
        limparRecursos()
      }
    }

    try {
      recorder.stop()
    } catch {
      setIsEncoding(false)
      limparRecursos()
    }
  }

  const formatarTempo = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Barra de nível sonora dinâmica (5 barras animadas)
  const renderSoundWave = () => {
    const bars = [0.4, 0.7, 1.0, 0.6, 0.8]
    return (
      <div className="flex items-center gap-1 h-5 px-1">
        {bars.map((factor, i) => {
          const height = isPaused
            ? 4
            : Math.max(4, Math.min(20, Math.round((volumeLevel / 100) * 20 * factor + 4)))
          return (
            <span
              key={i}
              style={{ height: `${height}px` }}
              className={`w-1 rounded-full transition-all duration-75 ${
                isPaused
                  ? 'bg-slate-300 dark:bg-slate-700'
                  : 'bg-rose-500 dark:bg-rose-400'
              }`}
            />
          )
        })}
      </div>
    )
  }

  if (isEncoding) {
    return (
      <div className="flex items-center justify-center gap-3 p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
        <span className="text-xs font-bold">Processando e gerando arquivo de áudio MP3...</span>
      </div>
    )
  }

  if (isRecording) {
    return (
      <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800/80 shadow-xs transition-all space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Indicador de gravação e cronômetro */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3.5 w-3.5">
              {!isPaused && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                  isPaused ? 'bg-amber-500' : 'bg-rose-600'
                }`}
              />
            </span>

            <div className="flex items-baseline gap-2">
              <span className="font-mono text-base font-black text-rose-700 dark:text-rose-400 tracking-wider">
                {formatarTempo(segundos)}
              </span>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                {isPaused ? 'Em pausa' : 'Gravando áudio...'}
              </span>
            </div>

            {/* Onda sonora */}
            {renderSoundWave()}
          </div>

          {/* Botões de Ação durante a gravação */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Pausar / Retomar */}
            <button
              type="button"
              onClick={alternarPausa}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title={isPaused ? 'Retomar gravação' : 'Pausar gravação'}
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
            </button>

            {/* Cancelar / Descartar */}
            <button
              type="button"
              onClick={cancelarGravacao}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
              title="Descartar gravação"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Concluir e Anexar */}
            <button
              type="button"
              onClick={finalizarGravação}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 transition cursor-pointer"
              title="Concluir gravação e anexar áudio MP3"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Concluir e Anexar</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-slate-50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900/40 border border-indigo-200/80 dark:border-indigo-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                Gravar Instrução por Áudio
              </h4>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono">
                MP3
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Fale pelo microfone do computador para gravar detalhes ou orientações de voz.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={desabilitado || limiteAtingido}
          onClick={iniciarGravacao}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          title={limiteAtingido ? 'Limite de anexos atingido' : 'Gravar áudio do microfone'}
        >
          <Mic className="w-4 h-4" />
          <span>Gravar Áudio</span>
        </button>
      </div>

      {erroMicrofone && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">{erroMicrofone}</p>
          </div>
          <button
            type="button"
            onClick={() => setErroMicrofone(null)}
            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 text-xs font-bold cursor-pointer"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
