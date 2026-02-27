import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const QUESTIONS_PATH = path.join(repoRoot, 'public/data/questions.json');
const OCR_SOURCE_RE = /^ocr-(answer|auto)-/;

function parseArgs() {
  const args = process.argv.slice(2);
  const map = new Map();
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (!a.startsWith('--')) continue;
    const key = a.replace(/^--/, '');
    const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
    map.set(key, val);
    if (val !== 'true') i += 1;
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

function nextReadingId(questions) {
  const max = questions
    .filter((q) => q.tag === 'reading')
    .map((q) => Number(String(q.id).replace(/^r/, '')))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return max + 1;
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

function pickDistractors(answer, pool, seedKey) {
  const filtered = [...new Set(pool.filter((x) => x !== answer))];
  const near = filtered.filter((x) => Math.abs(x.length - answer.length) <= 1);
  const base = near.length >= 3 ? near : filtered;

  const rng = mulberry32(hashString(seedKey));
  const arr = [...base];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  const out = [];
  for (const v of arr) {
    if (out.length >= 3) break;
    out.push(v);
  }

  if (out.length < 3) {
    for (const v of filtered) {
      if (out.length >= 3) break;
      if (out.includes(v)) continue;
      out.push(v);
    }
  }

  return out;
}

function markTargetContext(context, answer) {
  if (!context.includes(answer)) return context;
  return context.replace(answer, `【${answer}】`);
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
    questions = questions.filter(
      (q) => !(q.tag === 'reading' && String(q.source).startsWith('generated-from-')),
    );
  }

  const existingReadingKey = new Set(
    questions
      .filter((q) => q.tag === 'reading')
      .map((q) => `${normalizeKey(q.context)}|${q.answer}`),
  );

  const writingCandidates = questions.filter((q) => {
    if (q.tag !== 'writing') return false;
    if (!q.target || !q.answer || !q.context) return false;
    if (onlyOcr && !OCR_SOURCE_RE.test(String(q.source))) return false;
    return /[ァ-ヶ]/.test(q.target);
  });

  const readingPool = [...new Set(
    writingCandidates
      .map((q) => katakanaToHiragana(q.target))
      .filter((x) => /^[ぁ-ゖー]{1,12}$/.test(x) && x.length >= minReadingLength),
  )];

  const additions = [];
  let nextId = nextReadingId(questions);

  for (const q of writingCandidates) {
    const reading = katakanaToHiragana(q.target);
    if (!/^[ぁ-ゖー]{1,12}$/.test(reading)) continue;
    if (reading.length < minReadingLength) continue;

    const restored = q.context.includes(q.target)
      ? q.context.replace(q.target, q.answer)
      : q.context;
    const marked = markTargetContext(restored, q.answer);
    const context = /[ァ-ヶ]/.test(marked)
      ? `【${q.answer}】の読みを選びなさい。`
      : marked;

    const key = `${normalizeKey(context)}|${reading}`;
    if (existingReadingKey.has(key)) continue;

    const distractors = pickDistractors(reading, readingPool, `${q.id}:${q.target}:${q.answer}`);
    if (distractors.length < 3) continue;

    const choiceLabels = [reading, ...distractors];
    const rng = mulberry32(hashString(`choice:${q.id}`));
    for (let i = choiceLabels.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [choiceLabels[i], choiceLabels[j]] = [choiceLabels[j], choiceLabels[i]];
    }

    additions.push({
      id: `r${String(nextId).padStart(3, '0')}`,
      tag: 'reading',
      source: `generated-from-${q.source}`,
      points: 1,
      difficulty: reading.length >= 4 ? 2 : 1,
      question: '線のついた漢字の読みをひらがなで答えなさい。',
      context,
      target: q.answer,
      answer: reading,
      choices: choiceLabels.map((label) => ({ label })),
      explanation: `${q.answer} の読みは「${reading}」。`,
    });

    existingReadingKey.add(key);
    nextId += 1;
  }

  questions.push(...additions);
  sortQuestions(questions);

  if (!dryRun) {
    await fs.writeFile(QUESTIONS_PATH, `${JSON.stringify(questions, null, 2)}\n`, 'utf8');
  }

  console.log(JSON.stringify({
    dryRun,
    onlyOcr,
    minReadingLength,
    resetGenerated,
    sourceWritingCount: writingCandidates.length,
    readingPoolCount: readingPool.length,
    added: additions.length,
    totalQuestions: questions.length,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
