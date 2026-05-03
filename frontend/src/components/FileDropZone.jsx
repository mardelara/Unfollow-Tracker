import { useState, useRef, useCallback } from 'react'

function FileSlot({ label, file, onFile, isDragOver, onDragOver, onDragLeave, onDrop }) {
  const inputRef = useRef(null)

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed',
        'cursor-pointer select-none transition-all duration-200 p-8 min-h-44',
        isDragOver
          ? 'border-pink-400 bg-pink-50 dark:bg-pink-950/30 scale-[1.02]'
          : file
          ? 'border-green-400 bg-green-50 dark:bg-green-950/20'
          : 'border-zinc-300 dark:border-zinc-600 hover:border-pink-300 dark:hover:border-pink-500 bg-white dark:bg-zinc-800/50',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />

      {file ? (
        <>
          <span className="text-3xl">✅</span>
          <p className="text-sm font-semibold text-green-600 dark:text-green-400 truncate max-w-full px-2">
            {file.name}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Click to replace
          </p>
        </>
      ) : (
        <>
          <span className="text-3xl opacity-50">{label === 'Followers' ? '👥' : '➡️'}</span>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Drop <code className="bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-pink-500 dark:text-pink-400 text-xs">{label}</code> here
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {label === 'Followers'
              ? 'followers.json or followers_1.json'
              : 'following.json or following_1.json'}
          </p>
        </>
      )}
    </div>
  )
}

export default function FileDropZone({ onSubmit, loading }) {
  const [followers, setFollowers] = useState(null)
  const [following, setFollowing] = useState(null)
  const [dragOver, setDragOver] = useState({ followers: false, following: false })
  const [error, setError] = useState('')

  const makeDropHandlers = useCallback((slot) => ({
    onDragOver: (e) => {
      e.preventDefault()
      setDragOver((prev) => ({ ...prev, [slot]: true }))
    },
    onDragLeave: () => setDragOver((prev) => ({ ...prev, [slot]: false })),
    onDrop: (e) => {
      e.preventDefault()
      setDragOver((prev) => ({ ...prev, [slot]: false }))
      const file = e.dataTransfer.files[0]
      if (file) {
        if (slot === 'followers') setFollowers(file)
        else setFollowing(file)
      }
    },
  }), [])

  // Global drop: auto-assign based on filename
  const handleGlobalDrop = useCallback((e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    files.forEach((f) => {
      if (f.name.toLowerCase().includes('follower')) setFollowers(f)
      else if (f.name.toLowerCase().includes('following')) setFollowing(f)
    })
  }, [])

  const handleSubmit = () => {
    if (!followers || !following) {
      setError('Please provide both files before analyzing.')
      return
    }
    setError('')
    onSubmit(followers, following)
  }

  const bothReady = followers && following

  return (
    <div
      className="w-full flex flex-col gap-6"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleGlobalDrop}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FileSlot
          label="Followers"
          file={followers}
          onFile={setFollowers}
          isDragOver={dragOver.followers}
          {...makeDropHandlers('followers')}
        />
        <FileSlot
          label="Following"
          file={following}
          onFile={setFollowing}
          isDragOver={dragOver.following}
          {...makeDropHandlers('following')}
        />
      </div>

      {error && (
        <p className="text-center text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!bothReady || loading}
        className={[
          'w-full py-3 px-6 rounded-xl font-semibold text-white text-sm transition-all duration-200',
          bothReady && !loading
            ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 shadow-lg hover:shadow-pink-500/25 hover:scale-[1.01]'
            : 'bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed text-zinc-400 dark:text-zinc-500',
        ].join(' ')}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Analyzing…
          </span>
        ) : (
          'Analyze'
        )}
      </button>
    </div>
  )
}
