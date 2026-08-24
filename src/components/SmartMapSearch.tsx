import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, BriefcaseBusiness, LocateFixed, MapPin, Search, Sparkles, Store, Tag, X } from 'lucide-react'
import { askHiStreets, type AskHiStreetsResponse } from '../lib/ai'
import { loadBusinessesGeoJson } from '../lib/data'
import { buildSmartSearchSuggestions, type SmartSearchBusiness, type SmartSearchSuggestion, type SmartSearchTab } from '../lib/smartSearch'

type Props = {
  onNavigate: (tab: SmartSearchTab) => void
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  if (setter) setter.call(input, value)
  else input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function submitMapSearch(value: string) {
  const form = document.querySelector<HTMLFormElement>('.map-screen > .map-search')
  const input = form?.querySelector<HTMLInputElement>('input')
  if (!form || !input) return false
  setReactInputValue(input, value)
  window.setTimeout(() => form.requestSubmit(), 0)
  return true
}

function suggestionIcon(suggestion: SmartSearchSuggestion) {
  if (suggestion.kind === 'postcode') return <MapPin size={19} />
  if (suggestion.kind === 'business') return <Store size={19} />
  if (suggestion.kind === 'location') return <LocateFixed size={19} />
  if (suggestion.kind === 'navigate' && suggestion.tab === 'jobs') return <BriefcaseBusiness size={19} />
  if (suggestion.kind === 'navigate' && suggestion.tab === 'offers') return <Tag size={19} />
  return <Sparkles size={19} />
}

function tabForPostType(type: string): SmartSearchTab {
  if (type === 'job') return 'jobs'
  if (type === 'offer') return 'offers'
  return 'community'
}

export default function SmartMapSearch({ onNavigate }: Props) {
  const [query, setQuery] = useState('')
  const [businesses, setBusinesses] = useState<SmartSearchBusiness[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [bridgeStatus, setBridgeStatus] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiResult, setAiResult] = useState<AskHiStreetsResponse | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false
    loadBusinessesGeoJson().then(data => {
      if (cancelled) return
      const next = (data.features || []).map((feature: any) => ({
        id: String(feature?.properties?.id || feature?.id || ''),
        name: String(feature?.properties?.name || '').trim(),
        category: String(feature?.properties?.category || '').trim(),
        address: String(feature?.properties?.address || '').trim(),
      })).filter((business: SmartSearchBusiness) => business.id && business.name)
      setBusinesses(next)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const viewport = window.visualViewport
    const updateKeyboardState = () => {
      const keyboardOpen = Boolean(viewport && window.innerHeight - viewport.height > 120)
      document.documentElement.classList.toggle('histreets-keyboard-open', keyboardOpen)
    }
    viewport?.addEventListener('resize', updateKeyboardState)
    viewport?.addEventListener('scroll', updateKeyboardState)
    window.addEventListener('orientationchange', updateKeyboardState)
    return () => {
      viewport?.removeEventListener('resize', updateKeyboardState)
      viewport?.removeEventListener('scroll', updateKeyboardState)
      window.removeEventListener('orientationchange', updateKeyboardState)
      document.documentElement.classList.remove('histreets-keyboard-open')
    }
  }, [])

  const suggestions = useMemo(() => buildSmartSearchSuggestions(query, businesses), [query, businesses])

  function closeSuggestions() {
    setOpen(false)
    setActiveIndex(-1)
  }

  function runMapQuery(value: string) {
    const ok = submitMapSearch(value)
    if (!ok) {
      setBridgeStatus('Map search is still loading. Try again in a moment.')
      return
    }
    setBridgeStatus('')
    closeSuggestions()
  }

  function activateSuggestion(suggestion: SmartSearchSuggestion) {
    if (suggestion.kind === 'navigate' && suggestion.tab) {
      closeSuggestions()
      onNavigate(suggestion.tab)
      return
    }

    if (suggestion.kind === 'location') {
      closeSuggestions()
      document.querySelector<HTMLButtonElement>('.map-screen .locate-button')?.click()
      return
    }

    const value = suggestion.query || suggestion.title
    setQuery(suggestion.kind === 'category' ? suggestion.title : value)
    runMapQuery(value)
  }

  async function runAi() {
    const trimmed = query.trim()
    if (!trimmed) {
      inputRef.current?.focus()
      setOpen(true)
      return
    }
    inputRef.current?.blur()
    closeSuggestions()
    setAiOpen(true)
    setAiLoading(true)
    setAiError('')
    setAiResult(null)
    try {
      setAiResult(await askHiStreets(trimmed))
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'HiStreets AI is temporarily unavailable.')
    } finally {
      setAiLoading(false)
    }
  }

  function submit() {
    const trimmed = query.trim()
    if (!trimmed) {
      setOpen(true)
      inputRef.current?.focus()
      return
    }

    if (activeIndex >= 0 && suggestions[activeIndex]) {
      activateSuggestion(suggestions[activeIndex])
      return
    }

    const intent = suggestions.find(item => item.kind === 'postcode' || item.kind === 'navigate' || item.kind === 'location' || item.kind === 'category')
    if (intent) {
      activateSuggestion(intent)
      return
    }

    runMapQuery(trimmed)
  }

  return (
    <form
      className="smart-map-search"
      role="search"
      aria-label="Smart search HiStreets"
      onSubmit={event => { event.preventDefault(); submit() }}
      onBlur={event => {
        const next = event.relatedTarget as Node | null
        if (!next || !event.currentTarget.contains(next)) closeSuggestions()
      }}
    >
      <div className={open ? 'smart-search-field open' : 'smart-search-field'}>
        <div className="smart-search-brand" aria-hidden="true"><Sparkles size={18} /></div>
        <input
          ref={inputRef}
          value={query}
          type="search"
          role="combobox"
          aria-label="Search businesses, services, offers, jobs or postcode"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="smart-search-list"
          aria-activedescendant={activeIndex >= 0 ? `smart-search-option-${activeIndex}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Ask HiStreets… what do you need nearby?"
          onFocus={() => setOpen(true)}
          onChange={event => { setQuery(event.target.value); setOpen(true); setActiveIndex(-1); setBridgeStatus('') }}
          onKeyDown={event => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setOpen(true)
              setActiveIndex(index => Math.min(index + 1, suggestions.length - 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex(index => Math.max(index - 1, 0))
            } else if (event.key === 'Escape') {
              event.preventDefault()
              closeSuggestions()
            } else if (event.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
              event.preventDefault()
              activateSuggestion(suggestions[activeIndex])
            }
          }}
        />
        {query && <button type="button" className="smart-search-clear" aria-label="Clear search" onClick={() => { setQuery(''); setBridgeStatus(''); setOpen(true); inputRef.current?.focus(); runMapQuery('') }}><X size={17} /></button>}
        <button type="submit" className="smart-search-submit" aria-label="Search HiStreets"><Search size={19} /></button>
      </div>

      {open && (
        <div className="smart-search-panel" id="smart-search-list" role="listbox" aria-label={query.trim() ? 'Smart search suggestions' : 'Popular searches'}>
          <div className="smart-search-panel-head"><Sparkles size={14} /><span>{query.trim() ? 'Smart suggestions' : 'Explore Newham'}</span><small>Verified local data</small></div>
          {query.trim().length >= 3 && (
            <button type="button" className="ask-histreets-option" onMouseDown={event => event.preventDefault()} onClick={() => void runAi()}>
              <span className="smart-search-option-icon ai"><Bot size={19} /></span>
              <span className="smart-search-option-copy"><strong>Ask HiStreets AI</strong><small>Understand my need and find verified local actions</small></span>
            </button>
          )}
          <div className="smart-search-options">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                id={`smart-search-option-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                className={activeIndex === index ? 'smart-search-option active' : 'smart-search-option'}
                onMouseDown={event => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => activateSuggestion(suggestion)}
              >
                <span className={`smart-search-option-icon ${suggestion.kind}`}>{suggestionIcon(suggestion)}</span>
                <span className="smart-search-option-copy"><strong>{suggestion.title}</strong><small>{suggestion.subtitle}</small></span>
              </button>
            ))}
          </div>
        </div>
      )}
      {bridgeStatus && <div className="smart-search-status" role="status">{bridgeStatus}</div>}

      {aiOpen && (
        <div className="ask-ai-layer" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setAiOpen(false) }}>
          <section className="ask-ai-sheet" role="dialog" aria-modal="true" aria-labelledby="ask-ai-title">
            <div className="ask-ai-handle" />
            <header className="ask-ai-header">
              <span className="ask-ai-mark"><Bot size={20} /></span>
              <div><small>Verified local intelligence</small><h2 id="ask-ai-title">Ask HiStreets</h2></div>
              <button type="button" aria-label="Close Ask HiStreets" onClick={() => setAiOpen(false)}><X size={20} /></button>
            </header>
            <div className="ask-ai-question">“{query.trim()}”</div>
            {aiLoading && <div className="ask-ai-loading"><Sparkles size={20} /><strong>Understanding your need…</strong><span>Checking verified HiStreets businesses and live local posts.</span></div>}
            {aiError && <div className="ask-ai-error" role="status"><strong>AI unavailable</strong><span>{aiError}</span><button type="button" onClick={() => void runAi()}>Try again</button></div>}
            {aiResult && <>
              <div className="ask-ai-answer"><Sparkles size={18} /><p>{aiResult.answer}</p></div>
              {aiResult.posts.length > 0 && <div className="ask-ai-results"><h3>Live local actions</h3>{aiResult.posts.slice(0, 5).map(post => <button key={post.id} type="button" onClick={() => { setAiOpen(false); onNavigate(tabForPostType(post.type)) }}><span>{post.type === 'job' ? <BriefcaseBusiness size={18} /> : post.type === 'offer' ? <Tag size={18} /> : <Sparkles size={18} />}</span><div><strong>{post.title}</strong><small>{post.business?.name || post.category || 'HiStreets'}</small></div></button>)}</div>}
              {aiResult.businesses.length > 0 && <div className="ask-ai-results"><h3>Approved businesses</h3>{aiResult.businesses.slice(0, 4).map(business => <button key={business.id} type="button" onClick={() => { setAiOpen(false); setQuery(business.name); runMapQuery(business.name) }}><span><Store size={18} /></span><div><strong>{business.name}</strong><small>{business.category || business.address || 'Newham business'}</small></div></button>)}</div>}
              <p className="ask-ai-trust">AI interprets your request. Results come from verified HiStreets data; it does not invent local listings.</p>
            </>}
          </section>
        </div>
      )}
    </form>
  )
}
