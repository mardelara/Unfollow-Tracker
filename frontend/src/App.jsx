import { useState, useCallback } from 'react'
import AnimatedCharacter from './components/AnimatedCharacter'
import ResultsList from './components/ResultsList'
import Shuffle from './components/Shuffle'
import BorderGlow from './components/BorderGlow'

// Base URL for API calls.
// In dev falls back to http://localhost:5000 (Flask running locally).
// In production set VITE_BACKEND_URL=https://your-app.railway.app in Vercel.
const API = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:5000'

// Detect whether a File object is a ZIP archive
const isZip = (file) =>
  file.type === 'application/zip' ||
  file.type === 'application/x-zip-compressed' ||
  file.name.toLowerCase().endsWith('.zip')

export default function App() {
  const [appState, setAppState] = useState('idle') // idle | hover | eating | spitting | results
  const [files, setFiles] = useState({ followers: null, following: null })
  const [zipFile, setZipFile] = useState(null)
  const [zipMode, setZipMode] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // ── Drag events ─────────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    if (appState === 'idle' || appState === 'results') setAppState('hover')
  }, [appState])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    if (e.currentTarget.contains(e.relatedTarget)) return
    if (appState === 'hover') setAppState('idle')
  }, [appState])

  // ── Shared animation wrapper ─────────────────────────────────────────────────

  const runWithAnimation = async (fetchFn) => {
    setAppState('eating')
    setError('')
    setResult(null)

    const minDelay = new Promise(resolve => setTimeout(resolve, 2500))
    let finalData = null
    let errorMsg = null

    try {
      finalData = await fetchFn()
    } catch (e) {
      errorMsg = e.message
    }

    await minDelay

    if (errorMsg) {
      setError(errorMsg)
      setAppState('idle')
      setFiles({ followers: null, following: null })
      setZipFile(null)
    } else {
      setAppState('spitting')
      setTimeout(() => {
        setResult(finalData)
        setAppState('results')
        setFiles({ followers: null, following: null })
        setZipFile(null)
      }, 600)
    }
  }

  // ── ZIP flow ─────────────────────────────────────────────────────────────────

  const processZip = useCallback(async (file) => {
    setZipMode(true)
    await runWithAnimation(async () => {
      const form = new FormData()
      form.append('zip', file)

      const res = await fetch(`${API}/upload-zip`, { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || `Error del servidor: ${res.status}`)
      if (data.following_count === 0) throw new Error('No se encontraron cuentas seguidas en el ZIP.')
      return data
    })
  }, [])

  // ── Two-JSON flow ────────────────────────────────────────────────────────────

  const processJsonFiles = useCallback(async (currentFiles) => {
    setZipMode(false)
    await runWithAnimation(async () => {
      const form = new FormData()
      form.append('followers', currentFiles.followers)
      form.append('following', currentFiles.following)

      const res = await fetch(`${API}/upload`, { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || `Error del servidor: ${res.status}`)
      if (data.followers_count === 0)
        throw new Error(`No se encontraron seguidores en "${currentFiles.followers.name}".`)
      if (data.following_count === 0)
        throw new Error(`No se encontraron cuentas seguidas en "${currentFiles.following.name}".`)
      return data
    })
  }, [])

  // ── Drop handler ─────────────────────────────────────────────────────────────

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    if (appState !== 'hover') return

    const dropped = Array.from(e.dataTransfer.files)

    // ZIP: single .zip file → ZIP flow
    if (dropped.length === 1 && isZip(dropped[0])) {
      setZipFile(dropped[0])
      processZip(dropped[0])
      return
    }

    // JSON: route by filename
    let newFollowers = files.followers
    let newFollowing = files.following

    dropped.forEach((f) => {
      if (isZip(f)) return
      const name = f.name.toLowerCase()
      if (name.includes('follower')) newFollowers = f
      else if (name.includes('following')) newFollowing = f
    })

    const updated = { followers: newFollowers, following: newFollowing }
    setFiles(updated)

    if (updated.followers && updated.following) {
      processJsonFiles(updated)
    } else {
      setAppState('idle')
      if (!updated.followers) setError('Falta followers.json (o followers_1.json)')
      else setError('Falta following.json')
    }
  }, [appState, files, processZip, processJsonFiles])

  // ── Status pills (only shown when a file is already loaded) ──────────────────

  const idleStatus = zipMode ? (
    zipFile && (
      <div className="px-4 py-2 rounded-full text-xs font-bold bg-violet-100 text-violet-600 border border-violet-200">
        📦 {zipFile.name}
      </div>
    )
  ) : (
    (files.followers || files.following) && (
      <div className="flex gap-3 items-center flex-wrap justify-center">
        {files.followers && (
          <div className="px-4 py-2 rounded-full text-xs font-bold bg-green-100 text-green-600 border border-green-200">
            ✅ {files.followers.name}
          </div>
        )}
        {files.following && (
          <div className="px-4 py-2 rounded-full text-xs font-bold bg-green-100 text-green-600 border border-green-200">
            ✅ {files.following.name}
          </div>
        )}
      </div>
    )
  )

  const eatingLabel = zipMode ? 'Procesando ZIP…' : 'Masticando datos…'

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-slate-50 text-zinc-700 flex flex-col items-center overflow-x-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-2xl w-full mx-auto px-4 flex flex-col items-center justify-center flex-1 z-10 py-12">

        {/* Header */}
        <header className={`text-center flex flex-col items-center gap-4 transition-all duration-700 ${appState === 'results' ? 'opacity-30 scale-95 mt-0' : 'mt-12'}`}>
          <Shuffle
            text="Unfollowtchi"
            tag="h1"
            shuffleDirection="right"
            duration={0.35}
            animationMode="evenodd"
            shuffleTimes={1}
            ease="power3.out"
            stagger={0.03}
            threshold={0.1}
            triggerOnce={true}
            triggerOnHover={true}
            respectReducedMotion={true}
            loop={false}
            loopDelay={0}
            className="text-violet-600 drop-shadow-sm"
            style={{ fontSize: 'clamp(1.8rem, 6vw, 3.5rem)' }}
          />
          <p className="text-zinc-500 max-w-md text-base md:text-lg font-medium">
            ¡Dale de comer tu archivo de Instagram y descubre quién no te sigue!
          </p>
        </header>

        {/* Character drop zone */}
        <BorderGlow
          className={`transition-all duration-700 ease-out w-full flex flex-col items-center justify-center rounded-2xl border bg-white/70
            ${appState === 'results' ? 'mt-6 mb-6 scale-75' : 'mt-10 scale-100'}
            ${appState === 'hover' ? 'border-pink-300 shadow-lg shadow-pink-100' : 'border-violet-100'}`}
          glowColor={appState === 'hover' ? 'rgba(244, 114, 182, 0.7)' : 'rgba(167, 139, 250, 0.65)'}
          borderRadius={16}
          proximity={100}
        >
          <AnimatedCharacter state={appState} />

          {/* Status */}
          <div className="pb-6 h-14 flex items-center justify-center px-4">
            {appState === 'idle' && idleStatus}

            {appState === 'hover' && (
              <span className="text-pink-400 font-bold animate-pulse text-lg">¡Suéltalos!</span>
            )}

            {appState === 'eating' && (
              <span className="text-violet-400 font-bold animate-pulse flex items-center gap-2 text-lg">
                {eatingLabel}
              </span>
            )}
          </div>

          {/* Hint — only when nothing has been dropped yet */}
          {appState === 'idle' && !files.followers && !files.following && !zipFile && (
            <p className="pb-6 text-xs text-zinc-500 text-center px-6">
              Arrastra el <span className="font-semibold text-violet-400">.zip</span> de Instagram
              {' '}o los archivos <span className="font-semibold text-zinc-400">followers_1.json</span> +{' '}
              <span className="font-semibold text-zinc-400">following.json</span> por separado
            </p>
          )}

          {error && (
            <div className="mb-6 mx-6 p-3 rounded-xl bg-rose-50 border border-rose-200">
              <p className="text-sm text-rose-500 font-medium">{error}</p>
            </div>
          )}
        </BorderGlow>

        {/* Results */}
        {appState === 'results' && result && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out pb-10">
            {result.followers_files_merged > 1 && (
              <p className="text-center text-xs text-violet-300 mb-4">
                {result.followers_files_merged} archivos de seguidores combinados
              </p>
            )}
            <ResultsList data={result} />
            <div className="mt-8 text-center">
              <button
                onClick={() => { setResult(null); setAppState('idle'); setZipMode(false) }}
                className="px-6 py-2 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-600 text-sm font-medium transition-colors border border-violet-200"
              >
                Analizar de nuevo
              </button>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <footer className="mt-10 mb-6 max-w-md text-center text-xs text-zinc-400 space-y-1 px-4">
          <p className="font-semibold text-zinc-500">⚠️ Sobre los resultados</p>
          <p>
            Puede que aparezcan <span className="font-medium text-zinc-500">cuentas desactivadas</span>.
            Si al visitar el perfil ves "Usuario no encontrado", la cuenta está temporalmente
            desactivada. Instagram no te permite dejar de seguirla hasta que la reactiven.
          </p>
        </footer>

      </div>
    </div>
  )
}
