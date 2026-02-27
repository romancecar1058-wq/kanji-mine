export interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  condition: string; // 取得条件の説明テキスト
}

export const ALL_BADGES: BadgeDef[] = [
  { id: 'first_correct', name: '初めての正解', icon: '🌱', condition: '1問正解する' },
  { id: 'streak_3', name: '3連続正解', icon: '🔥', condition: '3問連続で正解する' },
  { id: 'streak_10', name: '10連続正解', icon: '💥', condition: '10問連続で正解する' },
  { id: 'writing_master', name: '書道家', icon: '✍️', condition: '書き取りを30問正解する' },
  { id: 'layer_clear_1', name: '表土突破', icon: '⛏️', condition: '第1層をクリアする' },
  { id: 'layer_clear_7', name: 'マグマ到達', icon: '🌋', condition: '第7層をクリアする' },
  { id: 'all_tags', name: '全地層踏破', icon: '🗺️', condition: '全11タグで1問以上正解する' },
  { id: 'exam_pass', name: '耐震認定', icon: '🏆', condition: '模試で70%以上とる' },
  { id: 'specimen_50', name: '標本収集家', icon: '🔬', condition: '漢字標本を50文字完成する' },
  { id: 'daily_7', name: '1週間継続', icon: '📅', condition: '7日連続でフィールドワークする' },
];

export const BADGE_BY_ID = Object.fromEntries(ALL_BADGES.map(b => [b.id, b])) as Record<string, BadgeDef>;
