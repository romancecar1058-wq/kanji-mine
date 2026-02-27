import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const QUESTIONS_PATH = path.join(repoRoot, 'public/data/questions.json');

const OCR_SOURCE_RE = /^ocr-(answer|auto)-/;
const GENERATED_OK_PREFIX = 'generated-ok-ocr';
const GENERATED_HP_PREFIX = 'generated-hp-ocr';

const MANUAL_ON_KUN = {
  '囲': { on: ['イ'], kun: 'かこむ' },
  '移': { on: ['イ'], kun: 'うつす' },
  '営': { on: ['エイ'], kun: 'いとなむ' },
  '英': { on: ['エイ'], kun: null },
  '衛': { on: ['エイ'], kun: null },
  '液': { on: ['エキ'], kun: null },
  '駅': { on: ['エキ'], kun: null },
  '仮': { on: ['カ'], kun: 'かり' },
  '価': { on: ['カ'], kun: 'あたい' },
  '可': { on: ['カ'], kun: null },
  '過': { on: ['カ'], kun: 'すぎる' },
  '快': { on: ['カイ'], kun: 'こころよい' },
  '慣': { on: ['カン'], kun: 'なれる' },
  '機': { on: ['キ'], kun: 'はた' },
  '境': { on: ['キョウ'], kun: 'さかい' },
  '効': { on: ['コウ'], kun: null },
  '鉱': { on: ['コウ'], kun: null },
  '再': { on: ['サイ'], kun: 'ふたたび' },
  '最': { on: ['サイ'], kun: 'もっとも' },
  '妻': { on: ['サイ'], kun: 'つま' },
  '罪': { on: ['ザイ'], kun: 'つみ' },
  '賛': { on: ['サン'], kun: null },
  '史': { on: ['シ'], kun: null },
  '師': { on: ['シ'], kun: null },
  '枝': { on: ['シ'], kun: 'えだ' },
  '示': { on: ['ジ'], kun: 'しめす' },
  '謝': { on: ['シャ'], kun: 'あやまる' },
  '述': { on: ['ジュツ'], kun: 'のべる' },
  '象': { on: ['ショウ'], kun: 'ぞう' },
  '精': { on: ['セイ'], kun: null },
  '絶': { on: ['ゼツ'], kun: 'たえる' },
  '祖': { on: ['ソ'], kun: null },
  '素': { on: ['ソ'], kun: 'もと' },
  '損': { on: ['ソン'], kun: 'そこなう' },
  '貸': { on: ['タイ'], kun: 'かす' },
  '銅': { on: ['ドウ'], kun: 'あかがね' },
  '毒': { on: ['ドク'], kun: null },
  '任': { on: ['ニン'], kun: 'まかせる' },
  '版': { on: ['ハン'], kun: null },
  '飯': { on: ['ハン'], kun: 'めし' },
  '費': { on: ['ヒ'], kun: 'ついやす' },
  '備': { on: ['ビ'], kun: 'そなえる' },
  '副': { on: ['フク'], kun: 'そえる' },
  '復': { on: ['フク'], kun: null },
  '編': { on: ['ヘン'], kun: 'あむ' },
  '墓': { on: ['ボ'], kun: 'はか' },
  '暴': { on: ['ボウ'], kun: 'あばく' },
  '綿': { on: ['メン'], kun: 'わた' },
  // --- 追加分（新規書き取り問題で出現する漢字） ---
  '保': { on: ['ホ'], kun: 'たもつ' },
  '借': { on: ['シャク'], kun: 'かりる' },
  '夢': { on: ['ム'], kun: 'ゆめ' },
  '導': { on: ['ドウ'], kun: 'みちびく' },
  '幹': { on: ['カン'], kun: 'みき' },
  '折': { on: ['セツ'], kun: 'おる' },
  '採': { on: ['サイ'], kun: 'とる' },
  '改': { on: ['カイ'], kun: 'あらためる' },
  '政': { on: ['セイ'], kun: 'まつりごと' },
  '易': { on: ['エキ','イ'], kun: 'やさしい' },
  '桜': { on: ['オウ'], kun: 'さくら' },
  '比': { on: ['ヒ'], kun: 'くらべる' },
  '破': { on: ['ハ'], kun: 'やぶる' },
  '確': { on: ['カク'], kun: 'たしかめる' },
  '織': { on: ['ショク','シキ'], kun: 'おる' },
  '防': { on: ['ボウ'], kun: 'ふせぐ' },
  '限': { on: ['ゲン'], kun: 'かぎる' },
  '額': { on: ['ガク'], kun: 'ひたい' },
  '鳴': { on: ['メイ'], kun: 'なく' },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const map = new Map();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.replace(/^--/, '');
    const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
    map.set(key, value);
    if (value !== 'true') i += 1;
  }
  return {
    onlyOcr: map.get('only-ocr') !== 'false',
    minReadingLength: Number(map.get('min-reading-length') ?? 2),
    resetGenerated: map.get('reset-generated') !== 'false',
    dryRun: map.get('dry-run') === 'true',
  };
}

function katakanaToHiragana(text) {
  return text
    .replace(/ヴ/g, 'ゔ')
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeKey(text) {
  return String(text)
    .replace(/[\s　]+/g, '')
    .replace(/[「」『』（）()【】\[\]]/g, '')
    .trim();
}

function sortQuestions(questions) {
  const tagOrder = [
    'writing',
    'reading',
    'on_kun',
    'antonym_synonym',
    'compound_structure',
    'three_char_compound',
    'homophone',
    'jukugo_making',
    'okurigana',
    'stroke_count',
    'radical',
  ];
  const tagIndex = new Map(tagOrder.map((t, i) => [t, i]));

  questions.sort((a, b) => {
    const ta = tagIndex.has(a.tag) ? tagIndex.get(a.tag) : 999;
    const tb = tagIndex.has(b.tag) ? tagIndex.get(b.tag) : 999;
    if (ta !== tb) return ta - tb;
    const na = Number(String(a.id).match(/(\d+)$/)?.[1] ?? 0);
    const nb = Number(String(b.id).match(/(\d+)$/)?.[1] ?? 0);
    if (na !== nb) return na - nb;
    return String(a.id).localeCompare(String(b.id));
  });
}

function nextId(questions, tag, prefix) {
  const max = questions
    .filter((q) => q.tag === tag)
    .map((q) => Number(String(q.id).replace(new RegExp(`^${prefix}`), '')))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return max + 1;
}

function parseOnKunAnswer(answer) {
  const text = String(answer);
  if (!text) return null;
  if (text.includes('（音のみ）')) {
    const on = text.replace(/（音のみ）/g, '').split('・').filter(Boolean);
    return on.length > 0 ? { on, kun: null } : null;
  }
  const parts = text.split('・').filter(Boolean);
  if (parts.length === 0) return null;
  return {
    on: [parts[0]],
    kun: parts[1] ?? null,
  };
}

function formatOnKunAnswer(entry) {
  if (!entry.kun) return `${entry.on.join('・')}（音のみ）`;
  return `${entry.on.join('・')}・${entry.kun}`;
}

function buildOnKunPool(questions) {
  const map = new Map();
  for (const q of questions) {
    if (q.tag !== 'on_kun') continue;
    const kanji = String(q.context ?? '').trim();
    if (![...kanji].some((ch) => /[一-龯々〆ヶ]/.test(ch))) continue;
    if ([...kanji].length !== 1) continue;
    const parsed = parseOnKunAnswer(q.answer);
    if (!parsed) continue;
    map.set(kanji, parsed);
  }
  for (const [k, v] of Object.entries(MANUAL_ON_KUN)) {
    if (!map.has(k)) map.set(k, v);
  }
  return map;
}

function buildWritingRecords(questions, onlyOcr, minReadingLength) {
  const out = [];
  for (const q of questions) {
    if (q.tag !== 'writing') continue;
    if (!q.answer || !q.target || !q.context) continue;
    if (onlyOcr && !OCR_SOURCE_RE.test(String(q.source))) continue;
    if ([...String(q.answer)].length !== 1) continue;
    const reading = katakanaToHiragana(String(q.target));
    if (!/^[ぁ-ゖー]{1,12}$/.test(reading)) continue;
    if (reading.length < minReadingLength) continue;
    const restored = String(q.context).includes(String(q.target))
      ? String(q.context).replace(String(q.target), String(q.answer))
      : String(q.context);
    out.push({
      sourceId: q.id,
      source: q.source,
      answer: String(q.answer),
      reading,
      restored,
    });
  }
  return out;
}

function pickDistractors(correct, labels, seedKey, count = 3) {
  const pool = labels.filter((l) => l !== correct);
  const rng = mulberry32(hashString(seedKey));
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

function makeHomophoneContext(restored, answer) {
  if (restored.includes(answer)) return restored.replace(answer, '（　）');
  return `「${answer}」に当てはまる漢字を選びなさい。`;
}

function makeHomophoneTarget(context) {
  const idx = context.indexOf('（　）');
  if (idx < 0) return '（　）';
  const head = context.slice(0, idx).trim();
  const tail = context.slice(idx + 3).replace(/。.*$/, '').trim();
  if (head && !tail) return `${head}（　）`;
  if (!head && tail) return `（　）${tail}`;
  return '（　）';
}

function generateOnKunQuestions(questions, writingRecords) {
  const pool = buildOnKunPool(questions);
  const existingTargets = new Set(
    questions
      .filter((q) => q.tag === 'on_kun')
      .map((q) => String(q.context ?? '').trim())
      .filter((c) => [...c].length === 1),
  );
  const allLabels = [...new Set([...pool.values()].map(formatOnKunAnswer))];

  const additions = [];
  let nextOk = nextId(questions, 'on_kun', 'ok');

  const candidateChars = [...new Set(writingRecords.map((r) => r.answer))]
    .filter((ch) => !existingTargets.has(ch))
    .filter((ch) => pool.has(ch))
    .sort((a, b) => a.localeCompare(b, 'ja'));

  for (const ch of candidateChars) {
    const entry = pool.get(ch);
    const answer = formatOnKunAnswer(entry);
    const distractors = pickDistractors(answer, allLabels, `ok:${ch}:${answer}`, 3);
    if (distractors.length < 3) continue;

    const choiceLabels = [answer, ...distractors];
    const rng = mulberry32(hashString(`ok-choice:${ch}`));
    for (let i = choiceLabels.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [choiceLabels[i], choiceLabels[j]] = [choiceLabels[j], choiceLabels[i]];
    }

    const explanation = entry.kun
      ? `${ch} の音読みは「${entry.on.join('・')}」、訓読みは「${entry.kun}」。`
      : `${ch} は「${entry.on.join('・')}」の音読み中心で使う漢字。`;

    additions.push({
      id: `ok${String(nextOk).padStart(3, '0')}`,
      tag: 'on_kun',
      source: GENERATED_OK_PREFIX,
      points: 2,
      difficulty: entry.kun ? 2 : 3,
      question: '漢字の音読みと訓読みの組み合わせを選びなさい。',
      context: ch,
      target: ch,
      answer,
      choices: choiceLabels.map((label) => ({ label })),
      explanation,
    });
    nextOk += 1;
  }

  return additions;
}

function generateHomophoneQuestions(questions, writingRecords) {
  const existingKeys = new Set(
    questions
      .filter((q) => q.tag === 'homophone')
      .map((q) => `${normalizeKey(q.context)}|${q.answer}`),
  );

  const readingGroups = new Map();
  for (const r of writingRecords) {
    if (!readingGroups.has(r.reading)) readingGroups.set(r.reading, new Map());
    const group = readingGroups.get(r.reading);
    if (!group.has(r.answer)) group.set(r.answer, r);
  }

  const bankSets = questions
    .filter((q) => q.tag === 'homophone' && Array.isArray(q.choices))
    .map((q) => new Set(q.choices.map((c) => c.label).filter((c) => [...c].length === 1)));

  const singleCharPool = [...new Set(writingRecords.map((r) => r.answer))];

  const additions = [];
  let nextHp = nextId(questions, 'homophone', 'hp');

  for (const [reading, group] of [...readingGroups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ja'))) {
    const chars = [...group.keys()];
    if (chars.length < 2) continue;

    for (const answer of chars.sort((a, b) => a.localeCompare(b, 'ja'))) {
      const sample = group.get(answer);
      const context = makeHomophoneContext(sample.restored, answer);
      const key = `${normalizeKey(context)}|${answer}`;
      if (existingKeys.has(key)) continue;

      const candidateSet = new Set(chars);
      for (const set of bankSets) {
        const intersects = chars.some((ch) => set.has(ch));
        if (!intersects) continue;
        for (const ch of set) candidateSet.add(ch);
      }
      for (const ch of singleCharPool) {
        if (candidateSet.size >= 8) break;
        candidateSet.add(ch);
      }

      const candidateLabels = [...candidateSet].filter((c) => [...c].length === 1);
      const distractors = pickDistractors(answer, candidateLabels, `hp:${reading}:${answer}`, 3);
      if (distractors.length < 3) continue;

      const choiceLabels = [answer, ...distractors];
      const rng = mulberry32(hashString(`hp-choice:${reading}:${answer}`));
      for (let i = choiceLabels.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [choiceLabels[i], choiceLabels[j]] = [choiceLabels[j], choiceLabels[i]];
      }

      additions.push({
        id: `hp${String(nextHp).padStart(3, '0')}`,
        tag: 'homophone',
        source: `${GENERATED_HP_PREFIX}-${reading}`,
        points: 2,
        difficulty: 2,
        question: '（　）に入る漢字を選びなさい。',
        context,
        target: makeHomophoneTarget(context),
        answer,
        choices: choiceLabels.map((label) => ({ label })),
        explanation: `${answer}（${reading}）`,
      });
      existingKeys.add(key);
      nextHp += 1;
    }
  }

  return additions;
}

async function main() {
  const {
    onlyOcr,
    minReadingLength,
    resetGenerated,
    dryRun,
  } = parseArgs();

  const raw = await fs.readFile(QUESTIONS_PATH, 'utf8');
  let questions = JSON.parse(raw);

  if (resetGenerated) {
    questions = questions.filter((q) => {
      if (q.tag === 'on_kun' && String(q.source).startsWith(GENERATED_OK_PREFIX)) return false;
      if (q.tag === 'homophone' && String(q.source).startsWith(GENERATED_HP_PREFIX)) return false;
      return true;
    });
  }

  const writingRecords = buildWritingRecords(questions, onlyOcr, minReadingLength);
  const onKunAdditions = generateOnKunQuestions(questions, writingRecords);
  questions.push(...onKunAdditions);

  const homophoneAdditions = generateHomophoneQuestions(questions, writingRecords);
  questions.push(...homophoneAdditions);

  sortQuestions(questions);

  if (!dryRun) {
    await fs.writeFile(QUESTIONS_PATH, `${JSON.stringify(questions, null, 2)}\n`, 'utf8');
  }

  console.log(JSON.stringify({
    dryRun,
    resetGenerated,
    onlyOcr,
    minReadingLength,
    sourceWritingRecords: writingRecords.length,
    addedOnKun: onKunAdditions.length,
    addedHomophone: homophoneAdditions.length,
    totalQuestions: questions.length,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
