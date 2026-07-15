import { useEffect, useMemo, useState } from 'react'
import BottomTabs from './components/BottomTabs'
import MapView from './components/MapView'
import { Feed } from './components/Feeds'
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
      {tab === 'map' && <MapView posts={livePosts} onOpenPostForm={() => openComposer('offer')} />}
      {tab === 'offers' && <Feed type="offer" posts={livePosts} onPost={openComposer} />}
      {tab === 'jobs' && <Feed type="job" posts={livePosts} onPost={openComposer} />}
      {tab === 'community' && <Feed type="community-group" posts={livePosts} onPost={openComposer} />}
      {tab === 'profile' && <Profile />}
      {composerOpen && <PostComposer initialType={composerType} onClose={() => setComposerOpen(false)} onSubmitted={() => { setComposerOpen(false); setRefreshFlag(v => v + 1) }} />}
      <BottomTabs active={tab} onChange={setTab} />
    </main>
  )
}
