import { useState } from 'react';
import type { Screen, AppState, Tag, Question } from '../types';
import type { MineralDef, MineralScience } from '../constants/minerals';
import { MINERALS, GENESIS_LABELS, CRYSTAL_SYSTEM_LABELS, LUSTER_LABELS, getMineralTier } from '../constants/minerals';
import { LAYERS, LAYER_BY_DEPTH } from '../constants/layers';

interface MineralAtlasProps {
  state: AppState;
  navigate: (screen: Screen) => void;
  allQuestions: Question[];
  debug?: boolean;
  debugFlags?: { allTier3?: boolean };
}

export default function MineralAtlas({ state, navigate, allQuestions, debug, debugFlags }: MineralAtlasProps) {
  const { minerals, history } = state;
  const [selected, setSelected] = useState<MineralDef | null>(null);
  const totalByTag = {} as Record<Tag, number>;
  const solvedByTag = {} as Record<Tag, number>;

  for (const q of allQuestions) {
    totalByTag[q.tag] = (totalByTag[q.tag] ?? 0) + 1;
    if ((history[q.id]?.correct ?? 0) > 0) {
      solvedByTag[q.tag] = (solvedByTag[q.tag] ?? 0) + 1;
    }
  }

  // Fault count per tag
  const faultsByTag = new Map<Tag, number>();
  for (const [qid, h] of Object.entries(history)) {
    if (h.miss > 0 && h.consecutiveCorrect < 3) {
      const tag = inferTagFromId(qid);
      if (tag) faultsByTag.set(tag, (faultsByTag.get(tag) ?? 0) + 1);
    }
  }

  // Weak layers sorted by priority
  const weakLayers = LAYERS
    .map(layer => {
      const solved = layer.tags.reduce((sum, tag) => sum + (solvedByTag[tag] ?? 0), 0);
      const total = layer.tags.reduce((sum, tag) => sum + (totalByTag[tag] ?? 0), 0);
      const rate = total > 0 ? solved / total : 0;
      const faults = layer.tags.reduce((sum, tag) => sum + (faultsByTag.get(tag) ?? 0), 0);
      const gap = Math.max(0, layer.targetRate - rate);
      return { layer, rate, faults, solved, total, priority: gap * layer.points };
    })
    .filter(x => x.faults > 0 || (x.rate > 0 && x.rate < x.layer.targetRate))
    .sort((a, b) => b.priority - a.priority);

  return (
    <div className="fade-in">
      <button className="btn-ghost" onClick={() => navigate({ kind: 'home' })} style={{ marginBottom: 14 }}>
        ← ホーム
      </button>

      <h2 style={{ textAlign: 'center', marginBottom: 20, fontSize: '1.5rem' }}>📖 鉱物図鑑</h2>

      {debug && (
        <div style={{
          textAlign: 'center', marginBottom: 16, padding: '6px 16px',
          background: 'rgba(255, 60, 60, 0.15)', border: '1px solid rgba(255, 60, 60, 0.4)',
          borderRadius: 8, color: '#ff6b6b', fontWeight: 700, fontSize: '0.9rem',
        }}>
          DEBUG MODE — 全鉱物をフルカラー表示中
        </div>
      )}

      <div
        className="card"
        style={{
          marginBottom: 16,
          background: 'rgba(38, 30, 22, 0.82)',
          border: '1px solid rgba(240,176,80,0.2)',
        }}
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--warning)', marginBottom: 6, fontWeight: 700 }}>
          地学モード
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
          鉱物には「できた場所（生成層）」と「見つけた場所（発見層）」があります。深部で生まれた石が、
          地殻変動や風化で浅い層に運ばれることがあります。
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginTop: 8 }}>
          最深部（第7層）は「完成鉱物を大量に掘る層」ではなく、深部の
          <strong style={{ color: 'var(--warning)' }}> 結晶核サンプル </strong>
          を回収する層として扱います。
        </p>
      </div>

      {/* Mineral collection */}
      <h3 style={{ fontSize: '1.15rem', marginBottom: 12 }}>標本棚</h3>
      <div className="mineral-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        {MINERALS.map(m => {
          const count = minerals[m.type];
          const isCollected = debug || count > 0;
          const tierInfo = getMineralTier(count, debug);
          const formationLayer = LAYER_BY_DEPTH[m.formationDepth];
          const discoveryLayer = LAYER_BY_DEPTH[m.discoveryDepth];
          return (
            <div
              key={m.type}
              className={`card${isCollected ? ' anim-shimmer' : ''}`}
              onClick={() => setSelected(m)}
              style={{
                textAlign: 'left',
                opacity: isCollected ? 1 : 0.58,
                padding: 14,
                cursor: 'pointer',
                position: 'relative',
                ...(isCollected ? {
                  boxShadow: `0 0 20px ${m.color}33`,
                  border: `1px solid ${m.color}33`,
                } : {
                  filter: 'grayscale(0.5)',
                }),
              }}
            >
              {isCollected && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  padding: '2px 8px', borderRadius: 10,
                  fontSize: '0.72rem', fontWeight: 700,
                  background: tierInfo.tier === 3 ? 'rgba(212,175,55,0.25)' : tierInfo.tier === 2 ? 'rgba(70,130,230,0.25)' : 'rgba(255,255,255,0.1)',
                  color: tierInfo.tier === 3 ? '#D4AF37' : tierInfo.tier === 2 ? '#4682E6' : 'var(--text-dim)',
                  border: `1px solid ${tierInfo.tier === 3 ? 'rgba(212,175,55,0.4)' : tierInfo.tier === 2 ? 'rgba(70,130,230,0.4)' : 'rgba(255,255,255,0.15)'}`,
                }}>
                  Lv.{tierInfo.tier}
                </div>
              )}
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: isCollected ? `${m.color}33` : 'rgba(255,255,255,0.05)',
                border: `3px solid ${isCollected ? m.color : 'rgba(255,255,255,0.1)'}`,
                margin: '0 0 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem',
                ...(isCollected ? {
                  boxShadow: `0 0 14px ${m.color}44`,
                } : {}),
              }}>
                {m.imageFile ? (
                  <>
                    <img
                      src={`./images/minerals/${m.imageFile}`}
                      alt={`${m.name} specimen`}
                      onError={e => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = 'inline';
                      }}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        filter: isCollected ? 'none' : 'grayscale(1)',
                        opacity: isCollected ? 1 : 0.42,
                        boxShadow: isCollected ? `0 0 14px ${m.color}66` : 'none',
                      }}
                    />
                    <span style={{ color: isCollected ? m.color : 'rgba(255,255,255,0.2)', display: 'none' }}>
                      {'★'.repeat(Math.min(m.rank, 5))}
                    </span>
                  </>
                ) : (
                  <span style={{ color: isCollected ? m.color : 'rgba(255,255,255,0.2)' }}>
                    {'★'.repeat(Math.min(m.rank, 5))}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.98rem', fontWeight: 700 }}>{m.name}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{m.nameEn}</p>
              <p style={{
                fontSize: '1rem',
                fontWeight: 700,
                marginTop: 4,
                color: isCollected ? m.color : 'var(--text-dim)',
              }}>
                {isCollected ? `×${count}` : '—'}
              </p>
              <p style={{ fontSize: '0.84rem', marginTop: 8, color: 'var(--warning)' }}>
                成因: {GENESIS_LABELS[m.genesis]}
              </p>
              <p style={{ fontSize: '0.84rem', marginTop: 4, color: 'var(--text-dim)' }}>
                生成: {formationLayer.emoji} 第{formationLayer.depth}層 {formationLayer.name}
              </p>
              <p style={{ fontSize: '0.84rem', marginTop: 2, color: 'var(--text-dim)' }}>
                発見: {discoveryLayer.emoji} 第{discoveryLayer.depth}層 {discoveryLayer.name}
              </p>
              {m.transportReason && (
                <p style={{ fontSize: '0.84rem', marginTop: 4, color: 'var(--text-dim)', lineHeight: 1.45 }}>
                  🚚 配置理由: {m.transportReason}
                </p>
              )}
              <p style={{ fontSize: '0.84rem', marginTop: 8, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                🧪 {m.geoNote}
              </p>
            </div>
          );
        })}
      </div>

      {/* Hazard map */}
      <h3 style={{ fontSize: '1.15rem', marginBottom: 12, color: 'var(--danger)' }}>
        💥 断層マップ（ハザードマップ）
      </h3>
      {weakLayers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ fontSize: '1.3rem', marginBottom: 8 }}>✨</p>
          <p style={{ color: 'var(--success)', fontSize: '1.05rem', fontWeight: 600 }}>
            断層なし！ 全地層が安定しています。
          </p>
        </div>
      ) : (
        weakLayers.map(({ layer, rate, faults, solved, total }) => (
          <div
            key={layer.depth}
            className="card"
            style={{ marginBottom: 10, cursor: 'pointer' }}
            onClick={() => navigate({ kind: 'layerQuiz', depth: layer.depth })}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                {layer.emoji} 第{layer.depth}層 {layer.name}
              </span>
              <span style={{ fontSize: '0.95rem', color: 'var(--text-dim)' }}>
                {layer.points}点
              </span>
            </div>
            <div className="progress-bar" style={{ marginBottom: 8 }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.round(rate * 100)}%`,
                  background: 'var(--accent-warm)',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>
                達成 {Math.round(rate * 100)}% ({solved}/{total}問) → 目標 {Math.round(layer.targetRate * 100)}%
              </span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                断層 {faults}件 [補修する]
              </span>
            </div>
          </div>
        ))
      )}
      {/* Detail modal */}
      {selected && (
        <MineralDetail
          mineral={selected}
          isCollected={debug || minerals[selected.type] > 0}
          count={minerals[selected.type]}
          debug={debug}
          allTier3={debugFlags?.allTier3}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function MineralDetail({
  mineral: m,
  isCollected,
  count,
  debug,
  allTier3,
  onClose,
}: {
  mineral: MineralDef;
  isCollected: boolean;
  count: number;
  debug?: boolean;
  allTier3?: boolean;
  onClose: () => void;
}) {
  const science: MineralScience | undefined = m.science;
  const tierInfo = getMineralTier(count, debug || allTier3);
  const formationLayer = LAYER_BY_DEPTH[m.formationDepth];
  const discoveryLayer = LAYER_BY_DEPTH[m.discoveryDepth];

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
          width: '90vw',
          maxWidth: 400,
          maxHeight: '85vh',
          overflowY: 'auto',
          border: `1px solid ${isCollected ? m.color + '44' : 'rgba(255,255,255,0.1)'}`,
          boxShadow: isCollected
            ? `0 0 40px ${m.color}33, 0 8px 32px rgba(0,0,0,0.4)`
            : '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Large image */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            margin: '0 auto',
            background: isCollected ? `${m.color}22` : 'rgba(255,255,255,0.05)',
            border: `4px solid ${isCollected ? m.color : 'rgba(255,255,255,0.1)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...(isCollected ? { boxShadow: `0 0 30px ${m.color}44` } : {}),
          }}>
            {m.imageFile ? (
              <img
                src={`./images/minerals/${m.imageFile}`}
                alt={m.name}
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  filter: isCollected ? 'none' : 'grayscale(1)',
                  opacity: isCollected ? 1 : 0.42,
                }}
              />
            ) : (
              <span style={{
                fontSize: '2.5rem',
                color: isCollected ? m.color : 'rgba(255,255,255,0.2)',
              }}>
                {'★'.repeat(Math.min(m.rank, 5))}
              </span>
            )}
          </div>
        </div>

        {/* Name & count */}
        <h3 style={{ textAlign: 'center', fontSize: '1.3rem', marginBottom: 2 }}>{m.name}</h3>
        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-dim)' }}>{m.nameEn}</p>
        <p style={{
          textAlign: 'center',
          fontSize: '1.1rem',
          fontWeight: 700,
          marginTop: 6,
          color: isCollected ? m.color : 'var(--text-dim)',
        }}>
          {isCollected ? `×${count}` : '未収集'}
        </p>
        <TierProgressBar tier={tierInfo.tier} needed={tierInfo.needed} />

        {/* Description */}
        <p style={{
          fontSize: '0.92rem',
          color: 'var(--text)',
          lineHeight: 1.6,
          marginTop: 16,
          padding: '12px 14px',
          background: 'rgba(0,0,0,0.15)',
          borderRadius: 'var(--radius-sm)',
        }}>
          {m.description}
        </p>

        {/* Info rows */}
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <InfoRow label="成因" value={GENESIS_LABELS[m.genesis]} color="var(--warning)" />
          <InfoRow
            label="生成"
            value={`${formationLayer.emoji} 第${formationLayer.depth}層 ${formationLayer.name}`}
          />
          <InfoRow
            label="発見"
            value={`${discoveryLayer.emoji} 第${discoveryLayer.depth}層 ${discoveryLayer.name}`}
          />
          {m.transportReason && (
            <InfoRow label="配置理由" value={m.transportReason} />
          )}
          <InfoRow label="地学メモ" value={m.geoNote} />
          <InfoRow label="獲得条件" value={m.condition} color="var(--accent)" />
        </div>

        {/* Tier 2: 物性データ */}
        <SectionHeader title="物性データ" />
        {tierInfo.tier >= 2 && science ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {science.hardness !== null && <InfoRow label="モース硬度" value={String(science.hardness)} />}
            <InfoRow label="結晶系" value={CRYSTAL_SYSTEM_LABELS[science.crystalSystem]} />
            <InfoRow label="化学式" value={science.chemicalFormula} />
            <InfoRow label="光沢" value={LUSTER_LABELS[science.luster]} />
            <InfoRow label="条痕色" value={science.streakColor} />
          </div>
        ) : (
          <LockedMessage needed={tierInfo.needed} message="もっと採掘すると物性データが判明…" />
        )}

        {/* Tier 3: 研究ノート */}
        <SectionHeader title="研究ノート" />
        {tierInfo.tier >= 3 && science ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <InfoRow label="用途" value={science.uses} />
            <InfoRow label="豆知識" value={science.funFact} />
          </div>
        ) : (
          <LockedMessage needed={tierInfo.tier >= 2 ? tierInfo.needed : tierInfo.needed} message="もっと集めると研究ノートが完成…" />
        )}

        {/* Google search link */}
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(m.name + ' 鉱物')}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            textAlign: 'center',
            marginTop: 18,
            padding: '12px 0',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--accent)',
            background: 'rgba(240,176,80,0.08)',
            border: '1px solid rgba(240,176,80,0.25)',
            borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          🔍 Googleで調べる
        </a>

        {/* Close button */}
        <button
          onClick={onClose}
          className="btn-ghost"
          style={{
            width: '100%',
            marginTop: 10,
            padding: '12px 0',
            fontSize: '1rem',
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

function TierProgressBar({ tier, needed }: { tier: 1|2|3; needed: number }) {
  return (
    <div style={{ margin: '12px 0' }}>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 6, textAlign: 'center' }}>
        調査レベル <strong style={{ color: tier === 3 ? '#D4AF37' : tier === 2 ? '#4682E6' : 'var(--text-dim)' }}>Lv.{tier}</strong>/3
      </p>
      <div style={{ display: 'flex', gap: 3, height: 6, borderRadius: 3, overflow: 'hidden' }}>
        {[1,2,3].map(i => (
          <div key={i} style={{
            flex: 1,
            background: i <= tier ? (tier === 3 ? '#D4AF37' : '#4682E6') : 'rgba(255,255,255,0.1)',
            borderRadius: 3,
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      {tier < 3 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 6, textAlign: 'center' }}>
          次の開示まで あと {needed} 個
        </p>
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p style={{
      fontSize: '0.92rem', fontWeight: 700, marginTop: 16, marginBottom: 8,
      color: 'var(--warning)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4,
    }}>
      {title}
    </p>
  );
}

function LockedMessage({ needed, message }: { needed: number; message: string }) {
  return (
    <p style={{
      fontSize: '0.88rem', color: 'var(--text-dim)', padding: '10px 12px',
      background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)',
      textAlign: 'center',
    }}>
      🔒 {message}（あと {needed} 個）
    </p>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
      <span style={{ color: color ?? 'var(--text-dim)', fontWeight: 600 }}>{label}: </span>
      <span style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function inferTagFromId(id: string): Tag | null {
  const prefixMap: Record<string, Tag> = {
    w: 'writing', r: 'reading', cs: 'compound_structure',
    tc: 'three_char_compound', as: 'antonym_synonym', ok: 'on_kun',
    hp: 'homophone', jm: 'jukugo_making', og: 'okurigana',
    sc: 'stroke_count', rd: 'radical',
  };
  for (const [prefix, tag] of Object.entries(prefixMap)) {
    if (id.startsWith(prefix)) return tag;
  }
  return null;
}
