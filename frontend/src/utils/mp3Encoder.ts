import { Mp3Encoder } from '@breezystack/lamejs'

/**
 * Converte um buffer Float32 (do Web Audio API) para Int16Array (esperado pelo LameJS).
 */
function convertFloat32ToInt16(float32Array: Float32Array): Int16Array {
  const l = float32Array.length
  const int16Array = new Int16Array(l)
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16Array
}

/**
 * Codifica um AudioBuffer decodificado em um Blob de áudio MP3 (MPEG-1 Audio Layer III).
 */
export function encodeAudioBufferToMp3(audioBuffer: AudioBuffer, kbps = 128): Blob {
  const channels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const isStereo = channels >= 2

  const mp3Encoder = new Mp3Encoder(isStereo ? 2 : 1, sampleRate, kbps)
  const mp3Chunks: Uint8Array[] = []
  const blockSize = 1152

  if (isStereo) {
    const leftF32 = audioBuffer.getChannelData(0)
    const rightF32 = audioBuffer.getChannelData(1)
    const leftInt16 = convertFloat32ToInt16(leftF32)
    const rightInt16 = convertFloat32ToInt16(rightF32)

    for (let i = 0; i < leftInt16.length; i += blockSize) {
      const leftChunk = leftInt16.subarray(i, i + blockSize)
      const rightChunk = rightInt16.subarray(i, i + blockSize)
      const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk)
      if (mp3buf.length > 0) {
        mp3Chunks.push(mp3buf)
      }
    }
  } else {
    const monoF32 = audioBuffer.getChannelData(0)
    const monoInt16 = convertFloat32ToInt16(monoF32)

    for (let i = 0; i < monoInt16.length; i += blockSize) {
      const chunk = monoInt16.subarray(i, i + blockSize)
      const mp3buf = mp3Encoder.encodeBuffer(chunk)
      if (mp3buf.length > 0) {
        mp3Chunks.push(mp3buf)
      }
    }
  }

  const mp3End = mp3Encoder.flush()
  if (mp3End.length > 0) {
    mp3Chunks.push(mp3End)
  }

  return new Blob(mp3Chunks as unknown as BlobPart[], { type: 'audio/mp3' })
}

/**
 * Recebe um Blob de áudio capturado (ex: WebM / OGG do MediaRecorder)
 * e o converte para um Blob MP3 padrão decodificando via Web Audio API.
 */
export async function convertBlobToMp3(blob: Blob, kbps = 128): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer()
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextClass) {
    throw new Error('Navegador não suporta Web Audio API.')
  }

  const audioCtx = new AudioContextClass()
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    return encodeAudioBufferToMp3(audioBuffer, kbps)
  } finally {
    try {
      await audioCtx.close()
    } catch {
      // Ignora erro ao fechar contexto
    }
  }
}

/**
 * Cria um objeto File com nome formatado contendo timestamp e extensão .mp3.
 */
export async function createMp3FileFromBlob(blob: Blob, prefixo = 'gravacao_pedido'): Promise<File> {
  let mp3Blob: Blob
  try {
    mp3Blob = await convertBlobToMp3(blob)
  } catch (err) {
    console.warn('Falha na conversão via LameJS, utilizando formato original com mimetype audio/mp3:', err)
    mp3Blob = new Blob([blob], { type: 'audio/mp3' })
  }

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  const fileName = `${prefixo}_${timestamp}.mp3`

  return new File([mp3Blob], fileName, {
    type: 'audio/mp3',
    lastModified: Date.now(),
  })
}
