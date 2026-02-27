import { useEffect, useMemo, useState } from 'react';
import type { AppState, Screen, Question } from '../types';
import type { DebugFlags } from '../App';
import { TITLE_LABELS } from '../constants/messages';
import { MINERAL_BY_TYPE } from '../constants/minerals';
import { BADGE_BY_ID } from '../constants/badges';
import { buildKanjiSpecimens } from '../utils/kanjiSpecimens';

interface HomeProps {
  state: AppState;
  navigate: (screen: Screen) => void;
  debugFlags: DebugFlags;
  onSetDebugFlags: (flags: DebugFlags) => void;
  allQuestions: Question[];
  onExport?: () => void;
  onImport?: () => void;
  onResetData?: () => void;
  onSetProfileName?: (name: string) => void;
}

export default function Home({ state, navigate, debugFlags, onSetDebugFlags, allQuestions, onExport, onImport, onResetData, onSetProfileName }: HomeProps) {
  const { profile, minerals } = state;
  const totalMinerals = Object.values(minerals).reduce((s, n) => s + n, 0);
  const weakQuestionCount = useMemo(
    () => allQuestions.filter(q => (state.history[q.id]?.miss ?? 0) > 0).length,
    [allQuestions, state.history],
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showNameModal, setShowNameModal] = useState(() => !profile.name.trim());
  const [nameInput, setNameInput] = useState(profile.name);
  const displayName = profile.name.trim() || '探検家';

  const isHotStreak = profile.streak >= 7;
  const streakColor = isHotStreak ? '#c084fc' : '#ff9050';
  const exploreTileStyle = {
    padding: '16px 12px',
    minHeight: 150,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center' as const,
  };

  useEffect(() => {
    if (!profile.name.trim()) setShowNameModal(true);
    setNameInput(profile.name);
  }, [profile.name]);

  const saveProfileName = (name: string) => {
    const normalized = name.trim().slice(0, 12);
    onSetProfileName?.(normalized);
    setShowNameModal(false);
  };

  return (
    <div
      className="fade-in"
      style={{
        /* Outdoor scene: sky → sunset → mountain → earth */
        margin: '-20px -24px',
        padding: '0 24px 24px',
        minHeight: '100vh',
        background: `
          linear-gradient(180deg,
            #5b8ec9 0%,
            #88b4d8 8%,
            #c8dce8 14%,
            #f0dcc0 20%,
            #e0c8a0 26%,
            #7a9a60 30%,
            #5a7848 34%,
            #4a6840 36%,
            #3d5530 40%,
            #352820 50%,
            #352820 100%
          )
        `,
      }}
    >
      {/* Sky area — title floats here */}
      <div style={{
        textAlign: 'center',
        padding: '28px 0 12px',
      }}>
        {/* CSS mountain silhouette */}
        <div style={{
          position: 'relative',
          marginBottom: -8,
        }}>
          {/* Sun */}
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #ffd080 0%, #f0b050 60%, transparent 100%)',
            boxShadow: '0 0 30px rgba(240,176,80,0.4), 0 0 60px rgba(240,176,80,0.15)',
            margin: '0 auto 8px',
          }} />

          {/* Birds */}
          <div style={{
            fontSize: '0.7rem',
            color: '#5b8ec9',
            letterSpacing: 12,
            opacity: 0.5,
            marginBottom: 4,
          }}>
            〜 〜 〜
          </div>
        </div>

        <h1 style={{ fontSize: '2rem', margin: '0 0 4px', color: '#3d2810' }}>
          <span className="anim-float" style={{ display: 'inline-block', fontSize: '2.4rem' }}>⛏</span>
          {' '}
          <span style={{
            textShadow: '0 2px 8px rgba(240,176,80,0.3)',
            color: '#5a3a18',
          }}>
            漢字鉱山
          </span>
        </h1>

        <p style={{
          fontSize: '0.85rem',
          color: '#7a6a50',
          marginTop: 2,
        }}>
          フィールドワークに出かけよう
        </p>
      </div>

      {/* Profile card — semi-transparent to show bg through */}
      <div style={{
        background: 'rgba(53, 40, 32, 0.88)',
        borderRadius: 'var(--radius)',
        padding: 18,
        border: '1px solid rgba(240,176,80,0.12)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        marginBottom: 20,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>調査員</span>
            <p style={{ fontSize: '1rem', marginBottom: 4, fontWeight: 700 }}>{displayName}</p>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-dim)' }}>称号</span>
            <p style={{ fontWeight: 700, fontSize: '1.15rem' }}>{TITLE_LABELS[profile.title]}</p>
            {state.badges.length > 0 && (
              <>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>獲得バッジ</span>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'nowrap',
                    overflowX: 'auto',
                    marginTop: 8,
                    paddingBottom: 2,
                  }}
                >
                  {state.badges.map(id => {
                    const badge = BADGE_BY_ID[id];
                    return badge ? (
                      <span
                        key={id}
                        title={`${badge.name}: ${badge.condition}`}
                        style={{ fontSize: '1.4rem', lineHeight: 1, flex: '0 0 auto' }}
                      >
                        {badge.icon}
                      </span>
                    ) : null;
                  })}
                </div>
              </>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-dim)' }}>連続調査</span>
            <p style={{ fontWeight: 700, fontSize: '1.5rem' }}>
              {profile.streak > 0 ? (
                <>
                  {profile.streak}日目{' '}
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '1.6rem',
                      animation: 'pulse-glow-text 1.5s ease-in-out infinite',
                      color: streakColor,
                      textShadow: `0 0 12px ${streakColor}`,
                    }}
                  >
                    🔥
                  </span>
                  {isHotStreak && (
                    <span style={{ fontSize: '0.8rem', color: '#c084fc', display: 'block' }}>
                      超熱波！
                    </span>
                  )}
                </>
              ) : (
                <span style={{ color: 'var(--text-dim)' }}>—</span>
              )}
            </p>
          </div>
        </div>

        {/* Mineral counts */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          {totalMinerals > 0 ? (
            Object.entries(minerals).map(([type, count]) => {
              if (count === 0) return null;
              const m = MINERAL_BY_TYPE[type as keyof typeof MINERAL_BY_TYPE];
              const badgeStyle = getReadableMineralBadgeStyle(m.color);
              return (
                <span
                  key={type}
                  className="mineral-badge"
                  style={{
                    background: badgeStyle.background,
                    color: badgeStyle.color,
                    border: badgeStyle.border,
                    textShadow: badgeStyle.textShadow,
                  }}
                >
                  {'★'.repeat(m.rank > 5 ? 5 : m.rank)} {m.name} ×{count}
                </span>
              );
            })
          ) : (
            <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>
              まだ標本がありません。掘りに行こう！
            </span>
          )}
        </div>
      </div>

      {/* Kanji Specimen summary card */}
      <KanjiSpecimenSummary allQuestions={allQuestions} history={state.history} navigate={navigate} allSpecimensGold={debugFlags.allSpecimensGold} />

      {/* Main CTA */}
      <button
        className="btn-primary"
        style={{ marginBottom: 14 }}
        onClick={() => navigate({ kind: 'quiz', mode: 'daily' })}
      >
        <span className="anim-float" style={{ display: 'inline-block', marginRight: 6 }}>⛏</span>
        今日のフィールドワーク（7問）
      </button>

      {/* Trial */}
      <button
        className="btn-ghost"
        style={{ width: '100%', marginBottom: 24, fontSize: '1.05rem', color: 'var(--text-dim)' }}
        onClick={() => navigate({ kind: 'quiz', mode: 'trial' })}
      >
        今日はムリ…（3問だけ）
      </button>

      {/* Secondary buttons — "where to explore" */}
      <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: 10, fontWeight: 600 }}>
        探検に行く
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, alignItems: 'stretch' }}>
        <button
          className="btn-secondary"
          style={exploreTileStyle}
          onClick={() => navigate({ kind: 'layerExplore' })}
        >
          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 4 }}>🏔️</span>
          地層探検
          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 2 }}>地質7層</span>
        </button>
        <button
          className="btn-secondary"
          style={exploreTileStyle}
          onClick={() => navigate({ kind: 'quiz', mode: 'exam_short' })}
        >
          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 4 }}>🌋</span>
          耐震試験
          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 2 }}>模試20問</span>
        </button>
        <button
          className="btn-secondary"
          style={exploreTileStyle}
          onClick={() => navigate({ kind: 'quiz', mode: 'exam_full' })}
        >
          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 4 }}>🏔️</span>
          本番模試
          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 2 }}>50問フル</span>
        </button>
        <button
          className="btn-secondary"
          style={exploreTileStyle}
          onClick={() => navigate({ kind: 'mineralAtlas' })}
        >
          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 4 }}>💎</span>
          鉱物図鑑
          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 2 }}>
            標本棚
          </span>
        </button>
        <button
          className="btn-secondary"
          style={exploreTileStyle}
          onClick={() => navigate({ kind: 'fieldReport' })}
        >
          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 4 }}>📋</span>
          調査レポート
          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 2 }}>
            復習ノート
          </span>
        </button>
        <button
          className="btn-secondary"
          style={{ ...exploreTileStyle, opacity: weakQuestionCount > 0 ? 1 : 0.55, cursor: weakQuestionCount > 0 ? 'pointer' : 'not-allowed' }}
          onClick={() => navigate({ kind: 'quiz', mode: 'repair' })}
          disabled={weakQuestionCount === 0}
        >
          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 4 }}>🔧</span>
          断層補修
          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 2 }}>
            {weakQuestionCount > 0 ? '弱点復習' : '弱点なし'}
          </span>
        </button>
        <button
          className="btn-secondary"
          style={exploreTileStyle}
          onClick={() => navigate({ kind: 'kanjiSpecimens' })}
        >
          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 4 }}>✍️</span>
          漢字標本
          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 2 }}>
            209文字
          </span>
        </button>
        <button
          className="btn-secondary"
          style={exploreTileStyle}
          onClick={() => setSettingsOpen(prev => !prev)}
        >
          <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 4 }}>⚙️</span>
          設定
          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 2 }}>
            {settingsOpen ? '閉じる' : '開く'}
          </span>
        </button>
      </div>

      {settingsOpen && (
        <div
          onClick={() => setSettingsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560 }}>
            <SettingsSection
              debugFlags={debugFlags}
              onSetDebugFlags={onSetDebugFlags}
              onExport={onExport}
              onImport={onImport}
              onResetData={onResetData}
              profileName={profile.name}
              onSetProfileName={onSetProfileName}
              onClose={() => setSettingsOpen(false)}
            />
          </div>
        </div>
      )}

      {showNameModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
          }}
        >
          <div
            className="card fade-in"
            style={{
              width: '100%',
              maxWidth: 460,
              background: 'rgba(53, 40, 32, 0.95)',
              border: '1px solid rgba(240,176,80,0.2)',
            }}
          >
            <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>👋 はじめにニックネームを設定</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: 12 }}>
              あとで設定からいつでも変更できます（12文字まで）
            </p>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value.slice(0, 12))}
              placeholder="ニックネーム"
              style={{
                width: '100%',
                height: 44,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--text)',
                padding: '0 12px',
                fontSize: '1rem',
                marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" style={{ flex: 1, fontSize: '1rem', padding: '12px 0' }} onClick={() => saveProfileName(nameInput)}>
                はじめる
              </button>
              <button className="btn-ghost" style={{ flex: 1, fontSize: '0.95rem' }} onClick={() => saveProfileName('探検家')}>
                スキップ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KanjiSpecimenSummary({
  allQuestions,
  history,
  navigate,
  allSpecimensGold,
}: {
  allQuestions: Question[];
  history: Record<string, import('../types').QuestionHistory>;
  navigate: (screen: Screen) => void;
  allSpecimensGold?: boolean;
}) {
  const specimens = useMemo(
    () => buildKanjiSpecimens(allQuestions, history),
    [allQuestions, history],
  );
  if (specimens.length === 0) return null;

  const goldCount = allSpecimensGold ? specimens.length : specimens.filter(s => s.status === 'gold').length;
  const pct = Math.round((goldCount / specimens.length) * 100);

  return (
    <div
      onClick={() => navigate({ kind: 'kanjiSpecimens' })}
      style={{
        background: 'rgba(53, 40, 32, 0.88)',
        borderRadius: 'var(--radius)',
        padding: '14px 18px',
        border: '1px solid rgba(212,175,55,0.18)',
        marginBottom: 20,
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
          ✍️ 漢字標本{'  '}
          <span style={{ color: 'var(--accent)' }}>{goldCount}</span>
          <span style={{ color: 'var(--text-dim)' }}> / {specimens.length} 完成</span>
        </span>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>→</span>
      </div>
      <div
        className="progress-bar"
        style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="progress-bar-fill"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #D4AF37, #f0d060)',
            borderRadius: 4,
            transition: 'width 0.4s',
          }}
        />
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 6, textAlign: 'right' }}>
        ({pct}%)
      </p>
    </div>
  );
}

function SettingsSection({
  debugFlags,
  onSetDebugFlags,
  onExport,
  onImport,
  onResetData,
  profileName,
  onSetProfileName,
  onClose,
}: {
  debugFlags: DebugFlags;
  onSetDebugFlags: (flags: DebugFlags) => void;
  onExport?: () => void;
  onImport?: () => void;
  onResetData?: () => void;
  profileName?: string;
  onSetProfileName?: (name: string) => void;
  onClose?: () => void;
}) {
  const [debugOpen, setDebugOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(profileName ?? '');
  const [nameSaved, setNameSaved] = useState(false);

  const toggleFlag = (key: keyof DebugFlags) => {
    onSetDebugFlags({ ...debugFlags, [key]: !debugFlags[key] });
  };

  useEffect(() => {
    setNameDraft(profileName ?? '');
    setNameSaved(false);
  }, [profileName]);

  return (
    <div
      className="fade-in"
      style={{
        background: 'rgba(53, 40, 32, 0.88)',
        borderRadius: 'var(--radius)',
        padding: 16,
        border: '1px solid rgba(240,176,80,0.12)',
        boxShadow: '0 12px 34px rgba(0,0,0,0.45)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p style={{ fontSize: '1rem', fontWeight: 700 }}>⚙ 設定</p>
        <button
          onClick={onClose}
          className="btn-ghost"
          style={{ minHeight: 36, padding: '6px 10px', color: 'var(--text-dim)' }}
        >
          閉じる
        </button>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 8, fontWeight: 600 }}>
        プロフィール
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          value={nameDraft}
          onChange={e => setNameDraft(e.target.value.slice(0, 12))}
          placeholder="ニックネーム"
          style={{
            flex: 1,
            height: 42,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(255,255,255,0.16)',
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text)',
            padding: '0 10px',
            fontSize: '0.95rem',
          }}
        />
        <button
          className="btn-ghost"
          style={{
            minHeight: 42,
            padding: '0 12px',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text)',
          }}
          onClick={() => {
            const normalized = nameDraft.trim().slice(0, 12);
            onSetProfileName?.(normalized);
            setNameSaved(true);
            setTimeout(() => setNameSaved(false), 1500);
          }}
        >
          {nameSaved ? '保存済み' : '保存'}
        </button>
      </div>
      {nameSaved && (
        <p style={{ fontSize: '0.82rem', color: 'var(--success)', marginBottom: 10 }}>
          プロフィールを保存しました
        </p>
      )}

      <button
        className="btn-ghost"
        onClick={() => setDebugOpen(prev => !prev)}
        style={{
          width: '100%',
          textAlign: 'left',
          fontSize: '0.9rem',
          color: 'var(--text-dim)',
          padding: '8px 2px',
          marginBottom: debugOpen ? 8 : 14,
          minHeight: 36,
        }}
      >
        デバッグ {debugOpen ? '▲' : '▼'}
      </button>

      {debugOpen && (
        <div style={{ marginBottom: 14 }}>
          <ToggleRow
            label="鉱物図鑑フルカラー"
            description="全鉱物をフルカラー表示"
            value={debugFlags.mineralFullColor}
            onChange={() => toggleFlag('mineralFullColor')}
          />
          <ToggleRow
            label="全漢字標本を完成扱い"
            description="漢字標本を全てゴールド表示"
            value={debugFlags.allSpecimensGold}
            onChange={() => toggleFlag('allSpecimensGold')}
          />
          <ToggleRow
            label="全鉱物Tier3開放"
            description="全鉱物の研究ノートを開放"
            value={debugFlags.allTier3}
            onChange={() => toggleFlag('allTier3')}
          />
        </div>
      )}

      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        marginTop: 16,
        paddingTop: 16,
      }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 10, fontWeight: 600 }}>
          データ管理
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onExport}
            className="btn-ghost"
            style={{
              flex: 1,
              padding: '10px 0',
              fontSize: '0.9rem',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            📤 バックアップ保存
          </button>
          <button
            onClick={onImport}
            className="btn-ghost"
            style={{
              flex: 1,
              padding: '10px 0',
              fontSize: '0.9rem',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            📥 データ復元
          </button>
        </div>
        <button
          onClick={() => {
            if (!onResetData) return;
            const ok = confirm('学習データをすべてリセットします。よろしいですか？');
            if (ok) onResetData();
          }}
          className="btn-ghost"
          style={{
            width: '100%',
            marginTop: 10,
            padding: '12px 0',
            fontSize: '0.95rem',
            color: '#ffc0c0',
            border: '1px solid rgba(255,107,107,0.45)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,107,107,0.08)',
          }}
        >
          🗑 学習データをリセット
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}
    >
      <div>
        <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>{label}</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 2 }}>{description}</p>
      </div>
      <button
        onClick={onChange}
        style={{
          width: 52,
          height: 30,
          borderRadius: 15,
          border: 'none',
          background: value ? 'var(--success)' : 'rgba(255,255,255,0.15)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background 0.2s',
          flexShrink: 0,
          marginLeft: 12,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: 3,
            left: value ? 25 : 3,
            transition: 'left 0.2s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        />
      </button>
    </div>
  );
}

function getReadableMineralBadgeStyle(colorHex: string): {
  background: string;
  color: string;
  border: string;
  textShadow: string;
} {
  const cardBg: [number, number, number] = [53, 40, 32];
  const mineralRgb = hexToRgb(colorHex);
  if (!mineralRgb) {
    return {
      background: `${colorHex}33`,
      color: colorHex,
      border: `1px solid ${colorHex}55`,
      textShadow: `0 0 8px ${colorHex}44`,
    };
  }

  const badgeBg = blendRgb(mineralRgb, cardBg, 0.2);
  const cr = contrastRatio(mineralRgb, badgeBg);
  if (cr >= 3) {
    return {
      background: `${colorHex}33`,
      color: colorHex,
      border: `1px solid ${colorHex}55`,
      textShadow: `0 0 8px ${colorHex}44`,
    };
  }

  return {
    background: 'rgba(255,255,255,0.08)',
    color: '#f6efe2',
    border: `1px solid ${colorHex}99`,
    textShadow: '0 1px 3px rgba(0,0,0,0.45)',
  };
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return null;
  const s = m[1];
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

function blendRgb(fg: [number, number, number], bg: [number, number, number], alpha: number): [number, number, number] {
  return [
    Math.round(fg[0] * alpha + bg[0] * (1 - alpha)),
    Math.round(fg[1] * alpha + bg[1] * (1 - alpha)),
    Math.round(fg[2] * alpha + bg[2] * (1 - alpha)),
  ];
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}
