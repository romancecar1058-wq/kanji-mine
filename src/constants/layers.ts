import type { Tag } from '../types';

export interface Layer {
  depth: number;
  name: string;
  tags: Tag[];
  points: number;
  percent: number;
  targetRate: number;
  color: string;
  emoji: string;
}

export interface LayerScene {
  bgGradient: string;
  bannerGradient: string;
  sceneryEmojis: [string, string, string, string, string];
  btnTint: string;
  cardAccent: string;
  timerColor: string;
  emojiFilter: string;
  atmosphere: string;
  readabilityMask?: string;
  textColor?: string;
  mutedTextColor?: string;
  ambientAnimation?: 'mystic-pulse' | 'lava-pulse';
}

export const TAG_LABELS: Record<Tag, string> = {
  radical: '部首',
  stroke_count: '画数',
  okurigana: '送りがな',
  jukugo_making: '熟語作り',
  homophone: '同音異義語',
  reading: '読み',
  on_kun: '音訓',
  antonym_synonym: '対義語・類義語',
  compound_structure: '熟語の構成',
  three_char_compound: '三字熟語',
  writing: '書き取り',
};

export const TAG_TO_LAYER_DEPTH: Record<Tag, number> = {
  radical: 1,
  stroke_count: 1,
  okurigana: 2,
  jukugo_making: 2,
  homophone: 3,
  reading: 4,
  on_kun: 4,
  antonym_synonym: 5,
  compound_structure: 6,
  three_char_compound: 6,
  writing: 7,
};

export const LAYERS: Layer[] = [
  {
    depth: 1,
    name: '表土・腐植層',
    tags: ['radical', 'stroke_count'],
    points: 20,
    percent: 10,
    targetRate: 0.94,
    color: '#6ABF4B',
    emoji: '🌿',
  },
  {
    depth: 2,
    name: '未固結堆積層',
    tags: ['okurigana', 'jukugo_making'],
    points: 22,
    percent: 11,
    targetRate: 0.90,
    color: '#D39B59',
    emoji: '🪨',
  },
  {
    depth: 3,
    name: '固結堆積岩層',
    tags: ['homophone'],
    points: 18,
    percent: 9,
    targetRate: 0.90,
    color: '#B9854F',
    emoji: '🏛️',
  },
  {
    depth: 4,
    name: '炭酸塩・水成層',
    tags: ['reading', 'on_kun'],
    points: 40,
    percent: 20,
    targetRate: 0.83,
    color: '#86B8D8',
    emoji: '💧',
  },
  {
    depth: 5,
    name: '熱水鉱床帯',
    tags: ['antonym_synonym'],
    points: 20,
    percent: 10,
    targetRate: 0.85,
    color: '#A874CC',
    emoji: '♨️',
  },
  {
    depth: 6,
    name: '変成・火成岩帯',
    tags: ['compound_structure', 'three_char_compound'],
    points: 40,
    percent: 20,
    targetRate: 0.89,
    color: '#5E769A',
    emoji: '🧩',
  },
  {
    depth: 7,
    name: '深成岩・マグマ帯',
    tags: ['writing'],
    points: 40,
    percent: 20,
    targetRate: 0.85,
    color: '#E55B2A',
    emoji: '🌋',
  },
];

export const MAX_LAYER_DEPTH = LAYERS[LAYERS.length - 1]?.depth ?? 7;

const CANONICAL_LAYER_BY_DEPTH: Record<number, Layer> = Object.fromEntries(
  LAYERS.map(l => [l.depth, l])
) as Record<number, Layer>;

// Legacy depths used by existing mineral data (1..11) are normalized to the 7-layer model.
const LEGACY_DEPTH_TO_CANONICAL: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 2,
  5: 3,
  6: 5,
  7: 4,
  8: 6,
  9: 6,
  10: 7,
  11: 7,
};

export const LAYER_BY_DEPTH: Record<number, Layer> = {
  ...Object.fromEntries(
    Object.entries(LEGACY_DEPTH_TO_CANONICAL).map(([legacyDepth, canonicalDepth]) => {
      return [Number(legacyDepth), CANONICAL_LAYER_BY_DEPTH[canonicalDepth]];
    })
  ),
  ...CANONICAL_LAYER_BY_DEPTH,
} as Record<number, Layer>;

export const LAYER_BY_TAG: Record<Tag, Layer> = Object.fromEntries(
  (Object.entries(TAG_TO_LAYER_DEPTH) as [Tag, number][]).map(([tag, depth]) => [tag, CANONICAL_LAYER_BY_DEPTH[depth]])
) as Record<Tag, Layer>;

const LAYER_SCENES_BY_DEPTH: Record<number, LayerScene> = {
  1: {
    bgGradient: 'linear-gradient(180deg, #89d7ff 0%, #b9f1ff 22%, #6ac46a 50%, #56773f 100%)',
    bannerGradient: 'linear-gradient(135deg, rgba(137, 215, 255, 0.95) 0%, rgba(106, 196, 106, 0.9) 100%)',
    sceneryEmojis: ['☀️', '🦋', '🌸', '🐛', '🌿'],
    btnTint: 'linear-gradient(135deg, rgba(140, 220, 125, 0.35) 0%, rgba(86, 160, 70, 0.28) 100%)',
    cardAccent: '#66c05f',
    timerColor: '#5ccf79',
    emojiFilter: 'drop-shadow(0 0 10px rgba(97, 198, 114, 0.65))',
    atmosphere: '表土と腐植が混ざる浅部。基本の観察力を育てる層。',
    readabilityMask: 'linear-gradient(180deg, rgba(10, 24, 20, 0.54) 0%, rgba(10, 19, 16, 0.66) 100%)',
    textColor: '#f8fcfa',
    mutedTextColor: 'rgba(236, 245, 240, 0.95)',
  },
  2: {
    bgGradient: 'linear-gradient(180deg, #f0d089 0%, #d9ae67 28%, #b4824e 62%, #7b5938 100%)',
    bannerGradient: 'linear-gradient(135deg, rgba(245, 208, 125, 0.96) 0%, rgba(196, 129, 66, 0.92) 100%)',
    sceneryEmojis: ['🏜️', '⛏️', '🪨', '🧱', '🔗'],
    btnTint: 'linear-gradient(135deg, rgba(250, 216, 134, 0.35) 0%, rgba(188, 124, 67, 0.32) 100%)',
    cardAccent: '#e1aa65',
    timerColor: '#efbf67',
    emojiFilter: 'drop-shadow(0 0 10px rgba(236, 183, 98, 0.62))',
    atmosphere: '砂とれきが重なる未固結層。語のつなぎ方を鍛える層。',
    readabilityMask: 'linear-gradient(180deg, rgba(28, 18, 10, 0.54) 0%, rgba(22, 14, 8, 0.64) 100%)',
    textColor: '#fff7ed',
    mutedTextColor: 'rgba(255, 242, 224, 0.95)',
  },
  3: {
    bgGradient: 'linear-gradient(180deg, #d7b07b 0%, #bf8f58 30%, #97683f 62%, #5b3e29 100%)',
    bannerGradient: 'linear-gradient(135deg, rgba(225, 168, 106, 0.95) 0%, rgba(156, 103, 61, 0.92) 100%)',
    sceneryEmojis: ['🏛️', '🪙', '📜', '🗿', '🔍'],
    btnTint: 'linear-gradient(135deg, rgba(231, 178, 118, 0.36) 0%, rgba(153, 99, 58, 0.32) 100%)',
    cardAccent: '#d89b58',
    timerColor: '#e7af67',
    emojiFilter: 'drop-shadow(0 0 10px rgba(218, 153, 88, 0.58))',
    atmosphere: '固まった堆積岩層。似た音の違いを見抜く探査ゾーン。',
    readabilityMask: 'linear-gradient(180deg, rgba(24, 15, 9, 0.52) 0%, rgba(18, 12, 8, 0.64) 100%)',
    textColor: '#fff6eb',
    mutedTextColor: 'rgba(252, 235, 212, 0.94)',
  },
  4: {
    bgGradient: 'linear-gradient(180deg, #e8f2ff 0%, #cce0f4 24%, #8cb7d8 56%, #4d769a 100%)',
    bannerGradient: 'linear-gradient(135deg, rgba(228, 242, 255, 0.96) 0%, rgba(133, 183, 218, 0.9) 100%)',
    sceneryEmojis: ['💧', '🫧', '🐚', '💎', '📖'],
    btnTint: 'linear-gradient(135deg, rgba(208, 232, 250, 0.36) 0%, rgba(109, 165, 206, 0.32) 100%)',
    cardAccent: '#8fc0e3',
    timerColor: '#7db8df',
    emojiFilter: 'drop-shadow(0 0 12px rgba(144, 195, 230, 0.66))',
    atmosphere: '炭酸塩と水成の層。読みと音訓の基礎を安定させる。',
    readabilityMask: 'linear-gradient(180deg, rgba(10, 20, 30, 0.58) 0%, rgba(8, 16, 25, 0.7) 100%)',
    textColor: '#f4fbff',
    mutedTextColor: 'rgba(228, 241, 252, 0.95)',
  },
  5: {
    bgGradient: 'linear-gradient(180deg, #6f4b92 0%, #563777 28%, #43275f 60%, #2a173c 100%)',
    bannerGradient: 'linear-gradient(135deg, rgba(174, 124, 221, 0.95) 0%, rgba(89, 57, 132, 0.92) 100%)',
    sceneryEmojis: ['♨️', '🧪', '💜', '🔮', '✨'],
    btnTint: 'linear-gradient(135deg, rgba(181, 127, 226, 0.34) 0%, rgba(101, 62, 150, 0.32) 100%)',
    cardAccent: '#b584ec',
    timerColor: '#c18df8',
    emojiFilter: 'drop-shadow(0 0 14px rgba(193, 142, 250, 0.78))',
    atmosphere: '熱水鉱床帯。意味の対比を見抜く中深部の分析層。',
    mutedTextColor: 'rgba(228, 220, 244, 0.92)',
    ambientAnimation: 'mystic-pulse',
  },
  6: {
    bgGradient: 'linear-gradient(180deg, #465974 0%, #37465c 24%, #2a3446 56%, #1b2332 100%)',
    bannerGradient: 'linear-gradient(135deg, rgba(105, 130, 165, 0.94) 0%, rgba(50, 66, 93, 0.92) 100%)',
    sceneryEmojis: ['🪨', '⚙️', '🧩', '⛓️', '🔥'],
    btnTint: 'linear-gradient(135deg, rgba(116, 142, 178, 0.34) 0%, rgba(61, 82, 117, 0.31) 100%)',
    cardAccent: '#7f9bc1',
    timerColor: '#90aed6',
    emojiFilter: 'drop-shadow(0 0 10px rgba(127, 155, 193, 0.64))',
    atmosphere: '変成岩と火成岩が交差する帯。構成力と三字熟語を鍛える。',
    mutedTextColor: 'rgba(219, 230, 243, 0.92)',
  },
  7: {
    bgGradient: 'linear-gradient(180deg, #77290f 0%, #992e0f 26%, #bf3f12 56%, #e55b1e 100%)',
    bannerGradient: 'linear-gradient(135deg, rgba(215, 91, 28, 0.94) 0%, rgba(152, 45, 13, 0.92) 100%)',
    sceneryEmojis: ['🔥', '💎', '⚡', '🫠', '🌋'],
    btnTint: 'linear-gradient(135deg, rgba(249, 124, 52, 0.38) 0%, rgba(198, 66, 22, 0.34) 100%)',
    cardAccent: '#f68a4e',
    timerColor: '#f58f52',
    emojiFilter: 'drop-shadow(0 0 12px rgba(247, 139, 78, 0.68))',
    atmosphere: '深成岩・マグマ帯で結晶核を回収。書いて標本を完成させる最深部。',
    readabilityMask: 'linear-gradient(180deg, rgba(26, 10, 6, 0.34) 0%, rgba(18, 8, 6, 0.48) 100%)',
    textColor: '#fff3ea',
    mutedTextColor: 'rgba(255, 227, 208, 0.94)',
    ambientAnimation: 'lava-pulse',
  },
};

export const LAYER_SCENES: Record<Tag, LayerScene> = Object.fromEntries(
  (Object.entries(TAG_TO_LAYER_DEPTH) as [Tag, number][]).map(([tag, depth]) => [tag, LAYER_SCENES_BY_DEPTH[depth]])
) as Record<Tag, LayerScene>;

export const TOTAL_POINTS = 200;
export const PASSING_SCORE = 140;
