import type { Screen, AppState, Question, Tag } from '../types';
import { LAYERS, TAG_LABELS } from '../constants/layers';

interface LayerExploreProps {
  state: AppState;
  navigate: (screen: Screen) => void;
  allQuestions: Question[];
}

const LAYER_BG: Record<number, { bg: string; torch: boolean; glow?: string }> = {
  1: { bg: '#5a7a40', torch: false },
  2: { bg: '#9a7448', torch: true },
  3: { bg: '#835638', torch: true },
  4: { bg: '#4c6f90', torch: false, glow: '#86B8D8' },
  5: { bg: '#5e3b77', torch: false, glow: '#A874CC' },
  6: { bg: '#303d52', torch: false, glow: '#5E769A' },
  7: { bg: '#4a1000', torch: false, glow: '#E55B2A' },
};

export default function LayerExplore({ state, navigate, allQuestions }: LayerExploreProps) {
  const totalByTag = {} as Record<Tag, number>;
  const solvedByTag = {} as Record<Tag, number>;

  for (const q of allQuestions) {
    totalByTag[q.tag] = (totalByTag[q.tag] ?? 0) + 1;
    if ((state.history[q.id]?.correct ?? 0) > 0) {
      solvedByTag[q.tag] = (solvedByTag[q.tag] ?? 0) + 1;
    }
  }

  return (
    <div className="fade-in" style={{ position: 'relative' }}>
      <button className="btn-ghost" onClick={() => navigate({ kind: 'home' })} style={{ marginBottom: 14 }}>
        ← ホーム
      </button>

      <h2 style={{ textAlign: 'center', marginBottom: 6, fontSize: '1.6rem' }}>
        <span style={{ fontSize: '1.8rem' }}>⛏</span> 地層探検
      </h2>

      <p style={{ fontSize: '1rem', color: 'var(--text-dim)', textAlign: 'center', marginBottom: 20 }}>
        現実の地質7層で探検。層の中に複数の漢字カテゴリーがあるよ。
      </p>

      <div style={{ position: 'relative', paddingLeft: 32 }}>
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: 0,
            bottom: 0,
            width: 4,
            borderRadius: 2,
            background:
              'linear-gradient(180deg, #6ABF4B 0%, #D39B59 18%, #B9854F 34%, #86B8D8 52%, #A874CC 70%, #5E769A 84%, #E55B2A 100%)',
            opacity: 0.6,
          }}
        />

        {LAYERS.map((layer, idx) => {
          const solved = layer.tags.reduce((sum, tag) => sum + (solvedByTag[tag] ?? 0), 0);
          const total = layer.tags.reduce((sum, tag) => sum + (totalByTag[tag] ?? 0), 0);
          const rate = total > 0 ? Math.round((solved / total) * 100) : 0;
          const cleared = rate >= layer.targetRate * 100;
          const bio = LAYER_BG[layer.depth];
          const glowStrength = bio.glow ? Math.min(8 + layer.depth * 3, 26) : 0;
          const categoryLabel = layer.tags.map(tag => TAG_LABELS[tag]).join(' / ');
          const isDeep = layer.depth >= 6;
          const isFinal = layer.depth === 7;

          return (
            <div key={layer.depth} style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: -24,
                  top: 22,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: cleared ? 'var(--success)' : layer.color,
                  border: `2px solid ${cleared ? 'var(--success)' : layer.color}`,
                  boxShadow: `0 0 ${cleared ? 12 : 8}px ${cleared ? 'var(--success)' : layer.color}88`,
                  zIndex: 1,
                }}
              />

              <div
                className="layer-card"
                style={{
                  borderLeft: `${isFinal ? 6 : isDeep ? 5 : 4}px solid ${layer.color}`,
                  background: `linear-gradient(135deg, ${bio.bg} 0%, ${bio.bg}cc 60%, ${bio.bg}88 100%)`,
                  boxShadow: `
                    inset 0 0 30px rgba(0,0,0,0.25)
                    ${bio.glow ? `, 0 0 ${glowStrength}px ${bio.glow}44` : ''}
                    ${bio.torch ? ', inset 20px 0 40px rgba(240,176,80,0.08)' : ''}
                  `,
                  marginBottom: idx < LAYERS.length - 1 ? 6 : 0,
                  ...(isFinal ? { animation: 'magma-pulse 2s ease-in-out infinite' } : {}),
                }}
                onClick={() => navigate({ kind: 'layerQuiz', depth: layer.depth })}
              >
                {bio.torch && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: 6,
                      fontSize: '0.9rem',
                      opacity: 0.5,
                      animation: 'pulse-glow-text 2s ease-in-out infinite',
                    }}
                  >
                    🔥
                  </div>
                )}

                <div
                  style={{
                    fontSize: `${1.7 + layer.depth * 0.08}rem`,
                    width: 50,
                    textAlign: 'center',
                    filter: isFinal
                      ? 'drop-shadow(0 0 10px rgba(255,85,0,0.7))'
                      : isDeep
                        ? 'drop-shadow(0 0 7px rgba(130,160,210,0.55))'
                        : undefined,
                  }}
                >
                  {layer.emoji}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: isDeep ? '1.1rem' : '1.05rem',
                        color: isFinal ? '#FFA040' : isDeep ? '#D8E4F7' : '#f5eedf',
                        textShadow: isFinal ? '0 0 12px rgba(255,85,0,0.5)' : undefined,
                      }}
                    >
                      第{layer.depth}層 {layer.name}
                    </span>
                    <span
                      style={{
                        fontSize: isFinal ? '1.1rem' : '0.95rem',
                        fontWeight: isDeep ? 700 : 500,
                        color: isFinal ? '#FF6A3D' : 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {layer.points}点
                    </span>
                  </div>

                  <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                    対象カテゴリ: {categoryLabel}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    {total > 0 ? (
                      <>
                        <div className="progress-bar" style={{ flex: 1, marginRight: 10, background: 'rgba(0,0,0,0.3)' }}>
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${rate}%`,
                              background: cleared ? 'var(--success)' : layer.color,
                              ...(cleared
                                ? {
                                    backgroundImage:
                                      'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)',
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 3s ease-in-out infinite',
                                  }
                                : {}),
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: cleared ? 700 : 400,
                            color: cleared ? 'var(--success)' : 'rgba(255,255,255,0.6)',
                          }}
                        >
                          {cleared ? '✓ ' : ''}
                          {rate}%
                        </span>
                      </>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.95rem',
                          color: 'rgba(255,255,255,0.4)',
                          fontStyle: 'italic',
                        }}
                      >
                        未踏…
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                    正答済み {solved} / {total}問
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: -4,
            bottom: -12,
            width: 36,
            height: 24,
            background: 'radial-gradient(ellipse, rgba(255,85,0,0.5) 0%, transparent 70%)',
            filter: 'blur(6px)',
          }}
        />
      </div>
    </div>
  );
}
