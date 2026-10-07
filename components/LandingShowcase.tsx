'use client';

import { useEffect, useState } from 'react';
import { CONCEPTS, MOOL_MANTAR, withCounts, type CountedWord } from '@/lib/landing';

// Shown before any search, in place of the old faded ੴ. The words are fixed,
// so they render immediately; counts arrive from /api/landing and fill in.

const HEADING: React.CSSProperties = {
  fontFamily: '"Inter", sans-serif',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  margin: '0 0 0.75rem',
};

function WordChip({ word }: { word: CountedWord }) {
  return (
    <a
      href={`/word/${encodeURIComponent(word.gurmukhi)}`}
      title={word.frequency === null ? undefined : `${word.frequency.toLocaleString()} occurrences`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.15rem',
        padding: '0.45rem 0.8rem',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        background: 'white',
        color: 'var(--text-primary)',
        textDecoration: 'none',
        minWidth: '3.5rem',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--accent-light)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
    >
      <span className="gurmukhi" style={{ fontSize: '1.3rem', lineHeight: 1.3 }}>{word.gurmukhi}</span>
      <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.7rem', color: 'var(--text-secondary)', minHeight: '1em' }}>
        {word.frequency === null ? ' ' : `${word.frequency.toLocaleString()}×`}
      </span>
    </a>
  );
}

export function LandingShowcase({ hint }: { hint: React.ReactNode }) {
  const [moolMantar, setMoolMantar] = useState<CountedWord[]>(() => withCounts(MOOL_MANTAR, []));
  const [concepts, setConcepts] = useState<CountedWord[]>(() => withCounts(CONCEPTS, []));

  useEffect(() => {
    let cancelled = false;
    fetch('/api/landing')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data) return;
        setMoolMantar(data.moolMantar);
        setConcepts(data.concepts);
      })
      .catch(() => {}); // counts are decoration; the words still work without them
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ padding: '2.5rem 0 1rem' }}>
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={HEADING}>
          <span className="gurmukhi" style={{ textTransform: 'none', letterSpacing: 0, fontSize: '0.9rem' }}>ਮੂਲ ਮੰਤਰ</span>
          {' · '}Mool Mantar, word by word
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {moolMantar.map(w => <WordChip key={w.gurmukhi} word={w} />)}
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={HEADING}>Key concepts in Gurbani</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {concepts.map(w => <WordChip key={w.gurmukhi} word={w} />)}
        </div>
      </section>

      <p style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
        {hint}
      </p>
    </div>
  );
}
