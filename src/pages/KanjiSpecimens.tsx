import { useMemo, useState } from 'react';
import type { AppState, Question, Screen } from '../types';
import { buildKanjiSpecimens } from '../utils/kanjiSpecimens';
import type { KanjiSpecimen } from '../utils/kanjiSpecimens';

interface KanjiSpecimensProps {
  state: AppState;
  navigate: (screen: Screen) => void;
  allQuestions: Question[];
  debugFlags?: { allSpecimensGold?: boolean };
}

export default function KanjiSpecimens({ state, navigate, allQuestions, debugFlags }: KanjiSpecimensProps) {
  const [selected, setSelected] = useState<KanjiSpecimen | null>(null);
  const rawSpecimens = useMemo(
    () => buildKanjiSpecimens(allQuestions, state.history),
    [allQuestions, state.history],
  );
  const specimens = useMemo(
    () => (debugFlags?.allSpecimensGold
      ? rawSpecimens.map(s => ({ ...s, status: 'gold' as const }))
      : rawSpecimens),
    [debugFlags?.allSpecimensGold, rawSpecimens],
  );
  const goldCount = specimens.filter(s => s.status === 'gold').length;
  const pct = specimens.length > 0 ? Math.round((goldCount / specimens.length) * 100) : 0;

  return (
    <div className="fade-in">
      <button className="btn-ghost" onClick={() => navigate({ kind: 'home' })} style={{ marginBottom: 14 }}>
        ← ホーム
      </button>

      <h2 style={{ textAlign: 'center', marginBottom: 8, fontSize: '1.5rem' }}>✍️ 漢字標本</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-dim)', marginBottom: 16 }}>
        209文字の標本コレクション
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>
            完成数 <span style={{ color: 'var(--accent)' }}>{goldCount}</span>
            <span style={{ color: 'var(--text-dim)' }}> / {specimens.length}</span>
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>{pct}%</span>
        </div>
        <div className="progress-bar" style={{ height: 8, borderRadius: 4 }}>
          <div
            className="progress-bar-fill"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #D4AF37, #f0d060)',
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      <KanjiSpecimenGrid specimens={specimens} onSelect={setSelected} />

      {selected && (
        <KanjiSpecimenModal
          specimen={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function KanjiSpecimenGrid({
  specimens,
  onSelect,
}: {
  specimens: KanjiSpecimen[];
  onSelect: (s: KanjiSpecimen) => void;
}) {
  const borderColor = (status: KanjiSpecimen['status']) =>
    status === 'gold' ? '#D4AF37' : status === 'silver' ? '#A0A0A0' : 'rgba(255,255,255,0.15)';
  const bgColor = (status: KanjiSpecimen['status']) =>
    status === 'gold' ? 'rgba(212,175,55,0.12)' : status === 'silver' ? 'rgba(160,160,160,0.10)' : 'rgba(255,255,255,0.03)';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
        gap: 6,
      }}
    >
      {specimens.map(s => (
        <div
          key={s.kanji}
          onClick={() => onSelect(s)}
          style={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${borderColor(s.status)}`,
            borderRadius: 6,
            background: bgColor(s.status),
            cursor: 'pointer',
            fontSize: s.status === 'gray' ? '0.85rem' : '1.1rem',
            fontWeight: 700,
            color: s.status === 'gold' ? '#D4AF37' : s.status === 'silver' ? '#C0C0C0' : 'rgba(255,255,255,0.25)',
            boxShadow: s.status === 'gold' ? '0 0 8px rgba(212,175,55,0.3)' : 'none',
            transition: 'transform 0.15s',
          }}
        >
          {s.kanji}
        </div>
      ))}
    </div>
  );
}

function KanjiSpecimenModal({
  specimen,
  onClose,
}: {
  specimen: KanjiSpecimen;
  onClose: () => void;
}) {
  const statusLabel = specimen.status === 'gold' ? '◎ 完成' : specimen.status === 'silver' ? '△ 挑戦済み' : '未挑戦';
  const statusColor = specimen.status === 'gold' ? '#D4AF37' : specimen.status === 'silver' ? '#A0A0A0' : 'var(--text-dim)';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="anim-pop-in"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius)',
          padding: 24,
          maxWidth: 320,
          width: '100%',
          border: `1px solid ${statusColor}44`,
          boxShadow: `0 0 30px ${statusColor}22, 0 8px 32px rgba(0,0,0,0.4)`,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            fontSize: '4rem',
            fontWeight: 700,
            color: statusColor,
            lineHeight: 1.2,
            marginBottom: 8,
          }}
        >
          {specimen.kanji}
        </div>
        <p
          style={{
            textAlign: 'center',
            fontSize: '0.95rem',
            fontWeight: 700,
            color: statusColor,
            marginBottom: 12,
          }}
        >
          {statusLabel}
        </p>
        <div
          style={{
            fontSize: '0.92rem',
            color: 'var(--text)',
            lineHeight: 1.6,
            padding: '10px 12px',
            background: 'rgba(0,0,0,0.15)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 12,
          }}
        >
          {specimen.example}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: '0.92rem' }}>
          <span style={{ color: 'var(--success)' }}>正答 {specimen.correct}</span>
          <span style={{ color: 'var(--danger)' }}>ミス {specimen.miss}</span>
        </div>
        <button
          onClick={onClose}
          className="btn-ghost"
          style={{
            width: '100%',
            marginTop: 16,
            padding: '10px 0',
            fontSize: '0.95rem',
            color: 'var(--text-dim)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
