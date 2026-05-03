import { useState, useMemo } from 'react'
import BorderGlow from './BorderGlow'

function StatCard({ label, value, accent }) {
  return (
    <BorderGlow
      className={[
        'flex flex-col items-center justify-center rounded-xl p-4 gap-1',
        accent
          ? 'bg-pink-50 border border-pink-200'
          : 'bg-violet-50 border border-violet-100',
      ].join(' ')}
      glowColor={accent ? 'rgba(244, 114, 182, 0.65)' : 'rgba(167, 139, 250, 0.65)'}
      borderRadius={12}
    >
      <span className={[
        'text-2xl font-bold',
        accent ? 'text-pink-500' : 'text-violet-500',
      ].join(' ')}>
        {value}
      </span>
      <span className="text-xs text-zinc-500 text-center">{label}</span>
    </BorderGlow>
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
        <StatCard label="Siguiendo" value={data.following_count} />
        <StatCard label="Seguidores" value={data.followers_count} />
        <StatCard label="No te siguen" value={data.non_followers_count} accent />
      </div>

      {/* Search + list */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-300"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar usuarios…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-violet-50 border border-violet-200 text-zinc-700 placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300/50 focus:border-violet-300 transition"
          />
        </div>

        <BorderGlow
          className="rounded-xl border border-violet-100 bg-white overflow-hidden"
          glowColor="rgba(167, 139, 250, 0.55)"
          borderRadius={12}
        >
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-zinc-400 py-10">
              {search ? 'Ningún usuario coincide con tu búsqueda.' : '¡Todos te siguen de vuelta! 🎉'}
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-violet-50">
              {filtered.map((username, i) => (
                <li
                  key={username}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-violet-50/60 transition-colors"
                >
                  <span className="text-xs text-violet-200 w-6 text-right shrink-0">
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-300 to-violet-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {username[0].toUpperCase()}
                  </div>
                  <a
                    href={`https://www.instagram.com/${username}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-zinc-600 hover:text-pink-500 transition-colors"
                  >
                    @{username}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </BorderGlow>

        {filtered.length > 0 && (
          <p className="text-xs text-center text-violet-300">
            Mostrando {filtered.length} de {data.non_followers_count} usuarios
          </p>
        )}
      </div>
    </div>
  )
}
