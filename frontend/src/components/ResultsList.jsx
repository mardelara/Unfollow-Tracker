import { useState, useMemo } from 'react'

function StatCard({ label, value, accent }) {
  return (
    <div className={[
      'flex flex-col items-center justify-center rounded-xl p-4 gap-1',
      accent
        ? 'bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-400/30 dark:border-pink-500/30'
        : 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700',
    ].join(' ')}>
      <span className={[
        'text-2xl font-bold',
        accent ? 'text-pink-500 dark:text-pink-400' : 'text-zinc-700 dark:text-zinc-200',
      ].join(' ')}>
        {value}
      </span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center">{label}</span>
    </div>
  )
}

export default function ResultsList({ data }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return data.non_followers
    return data.non_followers.filter((u) => u.toLowerCase().includes(q))
  }, [search, data.non_followers])

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Following" value={data.following_count} />
        <StatCard label="Followers" value={data.followers_count} />
        <StatCard label="Not following back" value={data.non_followers_count} accent />
      </div>

      {/* Search + list */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search usernames…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400 dark:focus:border-pink-500 transition"
          />
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-zinc-400 dark:text-zinc-500 py-10">
              {search ? 'No users match your search.' : 'Everyone follows you back! 🎉'}
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {filtered.map((username, i) => (
                <li
                  key={username}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors"
                >
                  <span className="text-xs text-zinc-300 dark:text-zinc-600 w-6 text-right shrink-0">
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {username[0].toUpperCase()}
                  </div>
                  <a
                    href={`https://www.instagram.com/${username}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:text-pink-500 dark:hover:text-pink-400 transition-colors"
                  >
                    @{username}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-center text-zinc-400 dark:text-zinc-500">
            Mostrando {filtered.length} de {data.non_followers_count} usuarios
          </p>
        )}
      </div>
    </div>
  )
}
