import { useEffect, useMemo, useState } from 'react'
import BottomTabs from './components/BottomTabs'
import MapView from './components/MapView'
import { Feed } from './components/Feeds'
import Profile from './components/Profile'
import { loadPosts } from './lib/data'
import type { Post, TabKey } from './types'

export default function App() {
  const [tab, setTab] = useState<TabKey>('map')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPosts().then(setPosts).finally(() => setLoading(false))
  }, [])

  const livePosts = useMemo(() => posts.filter(p => p.status === 'live'), [posts])

  return (
    <main className="app-shell">
      {loading && <div className="boot-loader">Loading HiStreets…</div>}
      {tab === 'map' && <MapView posts={livePosts} />}
      {tab === 'offers' && <Feed type="offer" posts={livePosts} />}
      {tab === 'jobs' && <Feed type="job" posts={livePosts} />}
      {tab === 'community' && <Feed type="community-group" posts={livePosts} />}
      {tab === 'profile' && <Profile />}
      <BottomTabs active={tab} onChange={setTab} />
    </main>
  )
}
