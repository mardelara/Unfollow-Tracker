import { useState, useCallback } from 'react'
import AnimatedCharacter from './components/AnimatedCharacter'
import ResultsList from './components/ResultsList'
import Shuffle from './components/Shuffle'

// Detect whether a File object is a ZIP archive
const isZip = (file) =>
  file.type === 'application/zip' ||
  file.type === 'application/x-zip-compressed' ||
  file.name.toLowerCase().endsWith('.zip')

export default function App() {
  const [appState, setAppState] = useState('idle') // idle | hover | eating | spitting | results
  const [files, setFiles] = useState({ followers: null, following: null })
  const [zipFile, setZipFile] = useState(null)          // ZIP mode
  const [zipMode, setZipMode] = useState(false)         // true when a ZIP was dropped
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
  // Runs the fetch, waits for the minimum chew animation, then transitions.

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

      const res = await fetch('/upload-zip', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || `Server error: ${res.status}`)
      if (data.following_count === 0) throw new Error('No following accounts found in the ZIP.')
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

      const res = await fetch('/upload', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || `Server error: ${res.status}`)
      if (data.followers_count === 0)
        throw new Error(`No followers found in "${currentFiles.followers.name}".`)
      if (data.following_count === 0)
        throw new Error(`No accounts found in "${currentFiles.following.name}".`)
      return data
    })
  }, [])

  // ── Drop handler — routes to ZIP or JSON flow ────────────────────────────────

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    if (appState !== 'hover') return

    const dropped = Array.from(e.dataTransfer.files)

    // ── ZIP: single .zip file → ZIP flow
    if (dropped.length === 1 && isZip(dropped[0])) {
      setZipFile(dropped[0])
      processZip(dropped[0])
      return
    }

    // ── JSON: route by filename
    let newFollowers = files.followers
    let newFollowing = files.following

    dropped.forEach((f) => {
      if (isZip(f)) return // ignore stray ZIPs when mixing files
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

  // ── Status labels ────────────────────────────────────────────────────────────

  const idleStatus = zipMode ? (
    <div className="px-4 py-2 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
      {zipFile ? `📦 ${zipFile.name}` : 'Suelta tu ZIP de Instagram'}
    </div>
  ) : (
    <div className="flex gap-4 items-center">
      <div className={`px-4 py-2 rounded-full text-xs font-bold ${files.followers ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'}`}>
        {files.followers ? `✅ ${files.followers.name}` : 'Esperando followers...'}
      </div>
      <div className={`px-4 py-2 rounded-full text-xs font-bold ${files.following ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'}`}>
        {files.following ? `✅ ${files.following.name}` : 'Esperando following...'}
      </div>
    </div>
  )

  const eatingLabel = zipMode
    ? 'Procesando ZIP…'
    : 'Masticando datos…'

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-white text-zinc-800 flex flex-col items-center overflow-x-hidden"
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
            className="text-purple-600 drop-shadow-sm"
            style={{ fontSize: 'clamp(1.8rem, 6vw, 3.5rem)' }}
          />
          <p className="text-zinc-500 max-w-md text-base md:text-lg font-medium">
            ¡Dale de comer tu archivo de Instagram y descubre quién no te sigue!
          </p>
        </header>

        {/* Character */}
        <div className={`transition-all duration-700 ease-out flex flex-col items-center justify-center ${appState === 'results' ? 'mt-8 mb-8 scale-75' : 'mt-12 scale-100'}`}>
          <AnimatedCharacter state={appState} />

          {/* Status pills */}
          <div className="mt-8 h-12 flex items-center justify-center">
            {appState === 'idle' && idleStatus}

            {appState === 'hover' && (
              <span className="text-pink-500 font-bold animate-pulse text-lg">¡Suéltalos!</span>
            )}

            {appState === 'eating' && (
              <span className="text-purple-600 font-bold animate-pulse flex items-center gap-2 text-lg">
                {eatingLabel}
              </span>
            )}
          </div>

          {/* Hint shown in idle — tells user both ZIP and JSON are accepted */}
          {appState === 'idle' && !files.followers && !files.following && !zipFile && (
            <p className="mt-3 text-xs text-zinc-400 text-center">
              Arrastra el <span className="font-semibold text-purple-500">.zip</span> de Instagram
              {' '}o los archivos <span className="font-semibold">followers_1.json</span> +{' '}
              <span className="font-semibold">following.json</span> por separado
            </p>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Results */}
        {appState === 'results' && result && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out pb-24">
            {result.followers_files_merged > 1 && (
              <p className="text-center text-xs text-zinc-400 mb-4">
                {result.followers_files_merged} archivos de seguidores combinados
              </p>
            )}
            <ResultsList data={result} />
            <div className="mt-8 text-center">
              <button
                onClick={() => { setResult(null); setAppState('idle'); setZipMode(false) }}
                className="px-6 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
              >
                Analizar de nuevo
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
