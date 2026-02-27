import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const QUESTIONS_PATH = path.join(repoRoot, 'public/data/questions.json');
const REVIEW_PATH = path.join(repoRoot, 'public/data/ocr_review_candidates.json');

const DEFAULT_OCR_PATH = path.join(repoRoot, '../漢字検定6級問題集_ocr.md');
const DEFAULT_PAGE_START = 70;
const DEFAULT_PAGE_END = 107;
const DEFAULT_MAX_GRADE = 5;
const DEFAULT_GRADE_KANJI_PATH = path.join(repoRoot, '../kanji_by_grade.json');

const SKIP_PATTERNS = [
  /1[問間]\d点/,
  /解答/,
  /目標/,
  /制限時間/,
  /合格/,
  /別冊/,
  /Start/i,
  /Goal/i,
  /攻略法/,
  /分野/,
  /第\d+回/,
  /模擬テスト/,
  /OCRで有効テキスト/,
  /コケクキカオエウイア/,
  /カタカナを漢字になおし/,
  /太い画のところは何画目か/,
  /総画数/,
  /漢字の読みには音と訓/,
  /ひらがなを漢字になおして対義/,
  /じゅく語の構成/,
  /組み合わせになっています/,
];

const MANUAL_TARGET_ANSWER = {
  // --- 既存 ---
  ドク: '毒',
  バカ: '墓',
  タモ: '保',
  ベントウ: '弁当',
  キンシ: '禁止',
  リエキ: '利益',
  ニクガン: '肉眼',
  デントウ: '伝統',
  ゾウキ: '雑木',
  レキシ: '歴史',
  ネンガジョウ: '年賀状',
  コウシャ: '校舎',
  カイエン: '開演',
  // --- OCR p70-107 で出現するカタカナ語（追加分） ---
  サイヨウ: '採用',
  セキニン: '責任',
  シイク: '飼育',
  キョウギ: '競技',
  ケンセツ: '建設',
  ガンカ: '眼科',
  ホウフ: '豊富',
  ホケン: '保健',
  サカイ: '境',
  サンソ: '酸素',
  セイケツ: '清潔',
  ケツエキ: '血液',
  キントウ: '均等',
  ケンチク: '建築',
  キソク: '規則',
  キュウジョ: '救助',
  カンシャ: '感謝',
  テイキアツ: '低気圧',
  キンゾク: '金属',
  ショクドウ: '食堂',
  ヒリョウ: '肥料',
  サクラ: '桜',
  カギリ: '限',
  ツミ: '罪',
  ユメ: '夢',
  ヒタイ: '額',
  イドウ: '移動',
};

const MANUAL_CONTEXT_OVERRIDE = {
  // --- 既存 ---
  'エキベンを買った。': { target: 'エキ', answer: '駅' },
  'ドクにも薬にもならない。': { target: 'ドク', answer: '毒' },
  '係員にミチビかれる。': { target: 'ミチビ', answer: '導' },
  'タえ間なく聞こえる。': { target: 'タ', answer: '絶' },
  '母がベントウを作る。': { target: 'ベントウ', answer: '弁当' },
  '遊泳はキンシだ。': { target: 'キンシ', answer: '禁止' },
  '道ばたの草をアむ。': { target: 'ア', answer: '編' },
  '店のリエキが上がる。': { target: 'リエキ', answer: '利益' },
  'ワタのような雲。': { target: 'ワタ', answer: '綿' },
  'お彼岸にハカに参る。': { target: 'ハカ', answer: '墓' },
  'ニクガンで星を見る。': { target: 'ニクガン', answer: '肉眼' },
  'マメを小皿にウツす。': { target: 'ウツ', answer: '移' },
  'デントウの祭りを見る。': { target: 'デントウ', answer: '伝統' },
  'ゾウキ林に虫がいる。': { target: 'ゾウキ', answer: '雑木' },
  '梅のエダを折る。': { target: 'エダ', answer: '枝' },
  '鳥の世話をマカせる。': { target: 'マカ', answer: '任' },
  '議会で意見をノべる。': { target: 'ノ', answer: '述' },
  '友となべをカコむ。': { target: 'カコ', answer: '囲' },
  '明日にソナえて休む。': { target: 'ソナ', answer: '備' },
  'レキシはくり返す。': { target: 'レキシ', answer: '歴史' },
  'ネンガジョウを配達する。': { target: 'ネンガジョウ', answer: '年賀状' },
  'コウシャは五階建てだ。': { target: 'コウシャ', answer: '校舎' },
  'げきがカイエンした。': { target: 'カイエン', answer: '開演' },
  // --- 追加: 短いターゲット・曖昧なケースの救済 ---
  '走る速さをクラべる。': { target: 'クラ', answer: '比' },
  '松のミキで虫がなく。': { target: 'ミキ', answer: '幹' },
  '道をタシかめる。': { target: 'タシ', answer: '確' },
  '商売でソンを出す。': { target: 'ソン', answer: '損' },
  '見わたすカギリ森だ。': { target: 'カギリ', answer: '限' },
  '土にヒリョウをまく。': { target: 'ヒリョウ', answer: '肥料' },
  '資料がヤブれる。': { target: 'ヤブ', answer: '破' },
  '友人にユメを話す。': { target: 'ユメ', answer: '夢' },
  'ツミほろぼしをする。': { target: 'ツミ', answer: '罪' },
  '内科のイシとなる。': { target: 'イシ', answer: '医師' },
  'ヒタイにあせが光る。': { target: 'ヒタイ', answer: '額' },
  'バスでイドウする。': { target: 'イドウ', answer: '移動' },
  'テイキアツが近づく。': { target: 'テイキアツ', answer: '低気圧' },
  'キソク正しい生活。': { target: 'キソク', answer: '規則' },
  'サクラの葉が色づく。': { target: 'サクラ', answer: '桜' },
  'セイケツなハンカチ。': { target: 'セイケツ', answer: '清潔' },
  '金魚をシイクする。': { target: 'シイク', answer: '飼育' },
  'ホウフな食材を得る。': { target: 'ホウフ', answer: '豊富' },
  '三角定規をかした。': { target: 'カ', answer: '貸' },
  'ショクドウでたべる。': { target: 'ショクドウ', answer: '食堂' },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const map = new Map();
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a.startsWith('--')) {
      const k = a.replace(/^--/, '');
      const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      map.set(k, v);
      if (v !== 'true') i += 1;
    }
  }
  return {
    ocrPath: map.get('ocr') ?? DEFAULT_OCR_PATH,
    pageStart: Number(map.get('page-start') ?? DEFAULT_PAGE_START),
    pageEnd: Number(map.get('page-end') ?? DEFAULT_PAGE_END),
    gradePath: map.get('grade-path') ?? DEFAULT_GRADE_KANJI_PATH,
    maxGrade: Number(map.get('max-grade') ?? DEFAULT_MAX_GRADE),
    dryRun: map.get('dry-run') === 'true',
  };
}

function parsePages(markdown) {
  const lines = markdown.split('\n');
  const pages = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^## Page (\d+)/);
    if (m) {
      current = { page: Number(m[1]), lines: [] };
      pages.push(current);
      continue;
    }
    if (current) current.lines.push(line.trim());
  }
  return pages;
}

function likelyNoise(line) {
  if (!line) return true;
  if (!/[ァ-ヶ]/.test(line)) return true;
  if (!/[ぁ-ん]/.test(line)) return true;
  if (line.length < 5 || line.length > 100) return true;
  if (/[→←=]/.test(line)) return true;
  return SKIP_PATTERNS.some((p) => p.test(line));
}

function normalizeContext(line) {
  return line
    .replace(/\s+/g, '')
    // --- カタカナ濁点・半濁点の取り違え ---
    .replace(/ポケン/g, 'ホケン')
    .replace(/キンク/g, 'キソク')
    // --- ひらがな↔カタカナ混同 ---
    .replace(/やサ/g, 'ヤサ')
    // --- 漢字の似字化け ---
    .replace(/タえ問/g, 'タえ間')
    .replace(/お使岸/g, 'お彼岸')
    .replace(/ゾウキ休/g, 'ゾウキ林')
    .replace(/海のエダ/g, '梅のエダ')
    .replace(/漢子/g, '漢字')
    .replace(/別前/g, '別冊')
    // --- カタカナ断片（余分な先頭文字） ---
    .replace(/梅のコエダ/g, '梅のエダ')
    // --- 末尾ゴミの除去（8L, 18, 0t 等のOCRアーティファクト） ---
    .replace(/[0-9０-９]+[a-zA-Z]?。$/g, '。')
    .replace(/[0-9０-９]+[a-zA-Z]?$/g, '')
    .replace(/[←→・●※■]+$/g, '')
    // --- 行頭ゴミの除去 ---
    .replace(/^の友となべ/g, '友となべ')
    .replace(/^代次の/g, '次の')
    // --- 設問番号マーカー（OCR化け含む） ---
    .replace(/^[@◎©®⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳£]+/g, '')
    // --- 先頭の数字（ページ番号・設問番号）を除去 ---
    .replace(/^[0-9０-９]+/g, '')
    // --- 先頭の括弧ペア・不完全括弧を除去 ---
    .replace(/^[（(][^）)]*[）)]/g, '')
    .replace(/^[（(]+/g, '')
    // --- 先頭の非CJK文字列を除去（矢印・記号等） ---
    .replace(/^[^ぁ-んァ-ヶ一-龯]+/g, '');
}

function splitQuestionFragments(rawLine) {
  // 1) 日本語文字+数字+日本語文字 → 設問境界として改行挿入
  const stitchedBreaks = rawLine.replace(
    /([ぁ-んァ-ヶ一-龯])\s*[0-9０-９]{1,2}\s*(?=[ぁ-んァ-ヶ一-龯])/g,
    '$1。\n',
  );
  // 2) 丸数字・記号マーカー（OCR化け含む）で分割
  const withBreaks = stitchedBreaks.replace(
    /[@◎©®£①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/g,
    '\n',
  );
  // 3) 「（数字」パターンも設問境界として分割（例: （3人を...）
  const withParenBreaks = withBreaks.replace(/[（(]\d/g, '\n');
  const parts = withParenBreaks
    .split('\n')
    .flatMap((x) => x.split('。').map((s) => s.trim()))
    .filter(Boolean)
    .map((s) => `${s}。`);
  return parts;
}

function normalizeContextKey(text) {
  return text
    .replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳◎@©®]/g, '')
    .replace(/[0-9０-９]/g, '')
    .replace(/[()（）「」『』【】[\]{}]/g, '')
    .replace(/[・…:：;；、,]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function extractTarget(context, targetAnswerMap) {
  const tokens = context.match(/[ァ-ヶ]{1,8}/g) ?? [];
  if (tokens.length === 0) return { target: null, exactToken: false };

  for (const t of tokens) {
    if (targetAnswerMap.has(t)) return { target: t, exactToken: true };
  }

  const candidates = new Set();
  for (const t of tokens) {
    candidates.add(t);
    const minLen = t.length >= 3 ? 2 : 1;
    for (let i = 0; i < t.length; i += 1) {
      for (let j = i + 1; j <= t.length; j += 1) {
        const piece = t.slice(i, j);
        if (piece.length >= minLen) candidates.add(piece);
      }
    }
  }

  const sorted = [...candidates].sort((a, b) => b.length - a.length);
  for (const c of sorted) {
    if (targetAnswerMap.has(c)) return { target: c, exactToken: false };
  }

  tokens.sort((a, b) => b.length - a.length);
  return { target: tokens[0], exactToken: false };
}

function buildTargetAnswerMap(questions) {
  const map = new Map();
  const ambiguous = new Set();
  for (const q of questions) {
    if (q.tag !== 'writing') continue;
    if (!q.target || !q.answer) continue;
    const prev = map.get(q.target);
    if (prev && prev !== q.answer) ambiguous.add(q.target);
    else map.set(q.target, q.answer);
  }
  for (const key of ambiguous) map.delete(key);
  return map;
}

function buildContextAnswerMap(questions) {
  const map = new Map();
  for (const q of questions) {
    if (q.tag !== 'writing') continue;
    if (!q.context || !q.target || !q.answer) continue;
    const key = normalizeContextKey(q.context);
    if (!key) continue;
    map.set(key, { target: q.target, answer: q.answer });
  }
  return map;
}

function buildAllowedKanjiSet(gradeData, maxGrade) {
  const grades = Array.isArray(gradeData?.grades) ? gradeData.grades : [];
  const out = new Set();
  for (const row of grades) {
    const g = Number(row?.grade);
    if (!Number.isFinite(g) || g > maxGrade) continue;
    for (const ch of row?.kanji ?? []) out.add(ch);
  }
  return out;
}

function answerIsWithinGrade(answer, allowedKanjiSet) {
  if (!allowedKanjiSet || allowedKanjiSet.size === 0) return true;
  const chars = [...String(answer)];
  const kanjiChars = chars.filter((ch) => /[一-龯々〆ヶ]/.test(ch));
  if (kanjiChars.length === 0) return true;
  return kanjiChars.every((ch) => allowedKanjiSet.has(ch));
}

function nextWritingId(questions) {
  const max = questions
    .filter((q) => q.tag === 'writing')
    .map((q) => Number(String(q.id).replace(/^w/, '')))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return max + 1;
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

async function main() {
  const {
    ocrPath,
    pageStart,
    pageEnd,
    gradePath,
    maxGrade,
    dryRun,
  } = parseArgs();
  const [ocrText, rawQuestions, rawGradeData] = await Promise.all([
    fs.readFile(ocrPath, 'utf8'),
    fs.readFile(QUESTIONS_PATH, 'utf8'),
    fs.readFile(gradePath, 'utf8'),
  ]);
  const questions = JSON.parse(rawQuestions);
  const gradeData = JSON.parse(rawGradeData);
  const allowedKanjiSet = buildAllowedKanjiSet(gradeData, maxGrade);

  const targetAnswerMap = buildTargetAnswerMap(questions);
  const contextAnswerMap = buildContextAnswerMap(questions);
  for (const [k, v] of Object.entries(MANUAL_TARGET_ANSWER)) targetAnswerMap.set(k, v);

  const existingContexts = new Set(
    questions
      .filter((q) => q.tag === 'writing')
      .map((q) => normalizeContext(q.context)),
  );

  const pages = parsePages(ocrText);
  const review = [];
  const additions = [];
  let nextId = nextWritingId(questions);

  for (const p of pages) {
    if (p.page < pageStart || p.page > pageEnd) continue;
    for (const line of p.lines) {
      if (likelyNoise(line)) continue;

      const fragments = splitQuestionFragments(line);
      for (const fragment of fragments) {
        const context = normalizeContext(fragment);
        if (likelyNoise(context)) continue;
        if (existingContexts.has(context)) continue;
        if (/カタカナを漢字になおし/.test(context)) continue;

        const knownTokenCount = (context.match(/[ァ-ヶ]{1,8}/g) ?? [])
          .filter((t) => targetAnswerMap.has(t) || MANUAL_TARGET_ANSWER[t])
          .length;
        if (knownTokenCount >= 2) {
          review.push({
            page: p.page,
            context,
            guessedTarget: null,
            reason: 'multi_target_line',
          });
          continue;
        }

        const key = normalizeContextKey(context);
        const known = contextAnswerMap.get(key);
        const override = MANUAL_CONTEXT_OVERRIDE[context];
        const extracted = extractTarget(context, targetAnswerMap);
        const target = override?.target ?? known?.target ?? extracted.target;
        if (!target) continue;
        const answer = override?.answer ?? known?.answer ?? targetAnswerMap.get(target);

        if (!answer) {
          review.push({
            page: p.page,
            context,
            guessedTarget: target,
            reason: 'answer_not_found',
          });
          continue;
        }

        if (!answerIsWithinGrade(answer, allowedKanjiSet)) {
          review.push({
            page: p.page,
            context,
            guessedTarget: target,
            reason: 'answer_outside_grade_scope',
          });
          continue;
        }

        // 1文字ターゲットは誤マッチが多いため、既知文脈/手動指定以外は保留。
        if (target.length < 2 && !override && !known) {
          review.push({
            page: p.page,
            context,
            guessedTarget: target,
            reason: 'short_target_ambiguous',
          });
          continue;
        }

        // トークンの部分一致（例: コウシャ→シャ）は誤マッチが多いため保留。
        if (!override && !known && !extracted.exactToken) {
          review.push({
            page: p.page,
            context,
            guessedTarget: target,
            reason: 'partial_token_ambiguous',
          });
          continue;
        }

        additions.push({
          id: `w${String(nextId).padStart(3, '0')}`,
          tag: 'writing',
          source: `ocr-auto-p${String(p.page).padStart(3, '0')}`,
          points: 2,
          difficulty: answer.length >= 2 ? 2 : 1,
          question: 'カタカナを漢字になおしなさい。',
          context,
          target,
          answer,
          choices: null,
          explanation: `OCR抽出問題。${target}→${answer} を確認して覚えよう。`,
        });
        existingContexts.add(context);
        nextId += 1;
      }
    }
  }

  questions.push(...additions);
  sortQuestions(questions);

  if (!dryRun) {
    await Promise.all([
      fs.writeFile(QUESTIONS_PATH, `${JSON.stringify(questions, null, 2)}\n`, 'utf8'),
      fs.writeFile(REVIEW_PATH, `${JSON.stringify(review, null, 2)}\n`, 'utf8'),
    ]);
  }

  console.log(JSON.stringify({
    ocrPath,
    pageStart,
    pageEnd,
    gradePath,
    maxGrade,
    dryRun,
    added: additions.length,
    reviewCount: review.length,
    gradeKanjiCount: allowedKanjiSet.size,
    totalQuestions: questions.length,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
