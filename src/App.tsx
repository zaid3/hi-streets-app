import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import BottomTabs from './components/BottomTabs'
import { loadPosts } from './lib/data'
import type { Post, PostType, TabKey } from './types'

const Feed = lazy(() => import('./components/Feeds').then(module => ({ default: module.Feed })))
const HiPulse = lazy(() => import('./components/HiPulse'))
const MapView = lazy(() => import('./components/MapView'))
const SmartMapSearch = lazy(() => import('./components/SmartMapSearch'))
const LocalParkingComingSoon = lazy(() => import('./components/LocalParkingComingSoon'))
const Profile = lazy(() => import('./components/Profile'))
const PostComposer = lazy(() => import('./components/PostComposer'))

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
  const [postsError, setPostsError] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerType, setComposerType] = useState<PostType>('offer')
  const [refreshFlag, setRefreshFlag] = useState(0)

  useEffect(() => {
    setPostsError('')
    loadPosts()
      .then(setPosts)
      .catch(() => setPostsError('Live posts could not be loaded. Please try again shortly.'))
      .finally(() => setLoading(false))
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
      {postsError && <div className="global-error" role="alert">{postsError}</div>}
      <Suspense fallback={<div className="boot-loader">Opening HiStreets…</div>}>
        {tab === 'map' && <>
          <Suspense fallback={<div className="boot-loader">Loading Newham map…</div>}><MapView posts={livePosts} /></Suspense>
          <Suspense fallback={null}><SmartMapSearch onNavigate={changeTab} /></Suspense>
          <Suspense fallback={null}><HiPulse posts={livePosts} onNavigate={changeTab} /></Suspense>
        </>}
        {tab === 'offers' && <Feed type="offer" posts={livePosts} />}
        {tab === 'jobs' && <Feed type="job" posts={livePosts} />}
        {tab === 'community' && <Feed type="community-group" posts={livePosts} />}
        {tab === 'parking' && <LocalParkingComingSoon />}
        {tab === 'profile' && <Profile onPost={openComposer} />}
        {composerOpen && <PostComposer initialType={composerType} onClose={() => setComposerOpen(false)} onSubmitted={() => { setComposerOpen(false); setRefreshFlag(v => v + 1) }} />}
      </Suspense>
      <BottomTabs active={tab} onChange={changeTab} />
    </main>
  )
}
