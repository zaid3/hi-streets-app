import { useEffect, useMemo, useState } from 'react'
import BottomTabs from './components/BottomTabs'
import MapView from './components/MapView'
import { Feed } from './components/Feeds'
import LocalParkingComingSoon from './components/LocalParkingComingSoon'
import Profile from './components/Profile'
import PostComposer from './components/PostComposer'
import { loadPosts } from './lib/data'
import type { Post, PostType, TabKey } from './types'

export default function App() {
  const [tab, setTab] = useState<TabKey>('map')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerType, setComposerType] = useState<PostType>('offer')
  const [refreshFlag, setRefreshFlag] = useState(0)

  useEffect(() => {
    loadPosts().then(setPosts).finally(() => setLoading(false))
  }, [refreshFlag])

  const livePosts = useMemo(() => posts.filter(p => p.status === 'live'), [posts])

  function openComposer(type: PostType = 'offer') {
    setComposerType(type)
    setComposerOpen(true)
  }

  return (
    <main className="app-shell">
      {loading && <div className="boot-loader">Loading HiStreets…</div>}
      {tab === 'map' && <MapView posts={livePosts} />}
      {tab === 'offers' && <Feed type="offer" posts={livePosts} />}
      {tab === 'jobs' && <Feed type="job" posts={livePosts} />}
      {tab === 'community' && <Feed type="community-group" posts={livePosts} />}
      {tab === 'parking' && <LocalParkingComingSoon />}
      {tab === 'profile' && <Profile onPost={openComposer} />}
      {composerOpen && <PostComposer initialType={composerType} onClose={() => setComposerOpen(false)} onSubmitted={() => { setComposerOpen(false); setRefreshFlag(v => v + 1) }} />}
      <BottomTabs active={tab} onChange={setTab} />
    </main>
  )
}
