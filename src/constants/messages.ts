export const MESSAGES = {
  correct: [
    '標本採取成功。いいサンプルが取れた、記録しておこう。',
    'この標本、結晶の形がきれいだ。',
    '調査ログに記録完了。順調だよ。',
    'いい標本！研究室に持ち帰ろう。',
  ],
  miss: [
    '断層を発見。原因を調査ログに記録しておくね。',
    'この層にはまだ調査が必要みたい。',
    '調査ログに記録。次はきっと採取できるよ。',
  ],
  streak: [
    '調査が順調。このペースならもっと深い層に進めそう。',
    '連続採取成功！研究が加速しているね。',
    'すばらしいフィールドワーク。記録更新中！',
  ],
  repairComplete: [
    '調査完了。弱点って、調べ直した瞬間に強みに変わるんだよね。',
    '断層修復完了！この地層はもう安全だ。',
  ],
  examPass: [
    '耐震基準認定！この研究成果なら、どんな揺れにも耐えられる。',
    '合格おめでとう！博士論文提出レベルの成果だよ。',
  ],
  examFail: [
    '調査報告を確認。次はどの地層を重点調査するか決めよう。',
    'まだ補強が必要な層がある。ハザードマップを確認しよう。',
  ],
  dailyStart: [
    '今日のフィールドワークを始めよう。',
    'さあ、今日はどんな標本が見つかるかな。',
  ],
  trialStart: [
    '短めの調査でも大丈夫。3つだけサンプルを採取しよう。',
    'ちょっとだけ。連続記録は途切れさせないよ。',
  ],
} as const;

export function pickRandom(arr: readonly string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const TITLE_LABELS: Record<string, string> = {
  trainee: '研究見習い',
  surveyor: '調査員',
  assistant: '研究助手',
  researcher: '研究員',
  doctor: '博士',
  professor: '教授',
};

export const ERROR_TYPE_LABELS: Record<string, string> = {
  mimicry: '擬態鉱（似た字と混同）',
  crystal_defect: '結晶欠損（画数の間違い）',
  weathering: '風化（はね/はらい/とめ）',
  misidentify: '鑑定ミス（部首の取り違え）',
  layer_shift: '層ズレ（送りがなの位置）',
};
