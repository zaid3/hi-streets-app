import { useEffect, useMemo, useState } from 'react'
import BottomTabs from './components/BottomTabs'
import HiPulse from './components/HiPulse'
import MapView from './components/MapView'
import SmartMapSearch from './components/SmartMapSearch'
import { Feed } from './components/Feeds'
import LocalParkingComingSoon from './components/LocalParkingComingSoon'
import Profile from './components/Profile'
import PostComposer from './components/PostComposer'
import { loadPosts } from './lib/data'
import type { Post, PostType, TabKey } from './types'

const tabPaths: Record<TabKey, string> = {
  map: '/map',
  offers: '/offers',
  jobs: '/jobs',
  community: '/community',
  parking: '/parking',
  profile: '/business',
}

function tabFromPath(pathname: string): TabKey {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/offers') return 'offers'
  if (path === '/jobs') return 'jobs'
  if (path === '/community') return 'community'
  if (path === '/parking') return 'parking'
  if (path === '/business' || path === '/profile') return 'profile'
  return 'map'
}

export default function App() {
  const [tab, setTab] = useState<TabKey>(() => tabFromPath(window.location.pathname))
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerType, setComposerType] = useState<PostType>('offer')
  const [refreshFlag, setRefreshFlag] = useState(0)

  useEffect(() => {
    loadPosts().then(setPosts).finally(() => setLoading(false))
  }, [refreshFlag])

  useEffect(() => {
    const onPopState = () => {
      setComposerOpen(false)
      setTab(tabFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (window.location.pathname === '/' || !Object.values(tabPaths).includes(window.location.pathname)) {
      const target = tabPaths[tab]
      window.history.replaceState({}, '', `${target}${window.location.search}${window.location.hash}`)
    }
  }, [])

  const livePosts = useMemo(() => posts.filter(p => p.status === 'live'), [posts])

  function changeTab(nextTab: TabKey) {
    setComposerOpen(false)
    setTab(nextTab)
    const target = tabPaths[nextTab]
    if (window.location.pathname !== target) window.history.pushState({}, '', target)
  }

  function openComposer(type: PostType = 'offer') {
    setComposerType(type)
    setComposerOpen(true)
  }

  return (
    <main className="app-shell">
      {loading && <div className="boot-loader">Loading HiStreets…</div>}
      {tab === 'map' && <><MapView posts={livePosts} /><SmartMapSearch onNavigate={changeTab} /><HiPulse posts={livePosts} onNavigate={changeTab} /></>}
      {tab === 'offers' && <Feed type="offer" posts={livePosts} />}
      {tab === 'jobs' && <Feed type="job" posts={livePosts} />}
      {tab === 'community' && <Feed type="community-group" posts={livePosts} />}
      {tab === 'parking' && <LocalParkingComingSoon />}
      {tab === 'profile' && <Profile onPost={openComposer} />}
      {composerOpen && <PostComposer initialType={composerType} onClose={() => setComposerOpen(false)} onSubmitted={() => { setComposerOpen(false); setRefreshFlag(v => v + 1) }} />}
      <BottomTabs active={tab} onChange={changeTab} />
    </main>
  )
}