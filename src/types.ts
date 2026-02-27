/* ===== 問題データ ===== */

export type Tag =
  | 'radical'             // 部首
  | 'stroke_count'        // 画数
  | 'okurigana'           // 送りがな
  | 'jukugo_making'       // じゅく語作り
  | 'homophone'           // 同じ読みの漢字
  | 'reading'             // 読み
  | 'on_kun'              // 音と訓
  | 'antonym_synonym'     // 対義語・類義語
  | 'compound_structure'  // じゅく語の構成
  | 'three_char_compound' // 三字のじゅく語
  | 'writing';            // 書き取り

export interface Choice {
  label: string;
  desc?: string;
}

export interface Question {
  id: string;
  tag: Tag;
  source: string;
  points: number;
  difficulty: 1 | 2 | 3;
  question: string;
  context: string;
  target: string;
  answer: string;
  choices: Choice[] | null;  // null = 手書き
  hint?: string;
  explanation?: string;
}

/* ===== 学習履歴 ===== */

export type ErrorType =
  | 'mimicry'         // 擬態鉱（形が似た漢字と混同）
  | 'crystal_defect'  // 結晶欠損（画数・点が多い/少ない）
  | 'weathering'      // 風化（はね/はらい/とめ）
  | 'misidentify'     // 鑑定ミス（部首の取り違え）
  | 'layer_shift';    // 層ズレ（送りがなの位置ミス）

export type SelfScore = 'perfect' | 'close' | 'miss';

export interface QuestionHistory {
  correct: number;
  miss: number;
  lastAnswered: string;      // ISO date
  lastResult: 'correct' | 'miss';
  consecutiveCorrect: number;
  lastErrorType?: ErrorType;
  bookmarked: boolean;
}

export interface TagStats {
  correct: number;
  miss: number;
}

export type MineralType =
  | 'quartz'
  | 'pyrite'
  | 'fluorite'
  | 'garnet'
  | 'jadeite'
  | 'fossil'
  | 'calcite'
  | 'magnetite'
  | 'chalcopyrite'
  | 'olivine'
  | 'apatite'
  | 'zircon'
  | 'corundum'
  | 'topaz'
  | 'beryl'
  | 'malachite'
  | 'crystal_core'
  | 'muscovite'
  | 'biotite'
  | 'orthoclase'
  | 'plagioclase'
  | 'gypsum'
  | 'anhydrite'
  | 'talc'
  | 'graphite'
  | 'hematite'
  | 'galena'
  | 'sphalerite'
  | 'bornite'
  | 'native_copper'
  | 'native_gold'
  | 'sulfur'
  | 'cinnabar'
  | 'azurite'
  | 'rhodochrosite'
  | 'rhodonite'
  | 'tourmaline'
  | 'opal'
  | 'nephrite'
  | 'turquoise'
  | 'barite'
  | 'celestite'
  | 'halite'
  | 'dolomite'
  | 'aragonite'
  | 'epidote'
  | 'prehnite'
  | 'kyanite'
  | 'andalusite'
  | 'scheelite'
  | 'molybdenite'
  | 'chromite'
  | 'spinel';

export type Title = 'trainee' | 'surveyor' | 'assistant' | 'researcher' | 'doctor' | 'professor';

export interface ExamResult {
  date: string;
  score: number;
  breakdown: Record<Tag, number>;
  duration: number;  // seconds
}

export interface AppState {
  version: number;
  profile: {
    name: string;
    createdAt: string;
    streak: number;
    lastStudyDate: string;
    title: Title;
  };
  history: Record<string, QuestionHistory>;
  tagStats: Record<Tag, TagStats>;
  examResults: ExamResult[];
  minerals: Record<MineralType, number>;
  badges: string[];
}

/* ===== 画面 ===== */

export type Screen =
  | { kind: 'home' }
  | { kind: 'quiz'; mode: QuizMode }
  | { kind: 'result'; answers: AnswerRecord[]; mode: QuizMode }
  | { kind: 'layerExplore' }
  | { kind: 'layerQuiz'; depth: number }
  | { kind: 'mineralAtlas' }
  | { kind: 'kanjiSpecimens' }
  | { kind: 'fieldReport' };

export type QuizMode =
  | 'daily'       // 今日のフィールドワーク（7問）
  | 'trial'       // 試掘モード（3問）
  | 'layer'       // 地層探検（10問）
  | 'exam_short'  // ショート模試（20問）
  | 'exam_full'   // フル模試
  | 'repair';     // 断層補修

export interface AnswerRecord {
  questionId: string;
  tag: Tag;
  correct: boolean;
  selfScore?: SelfScore;
  errorType?: ErrorType;
  timeSpent: number; // seconds
}
