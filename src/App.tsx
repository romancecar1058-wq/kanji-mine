import { useState, useCallback, useEffect, useRef } from 'react';
import type { Screen, Question, AnswerRecord, MineralType, QuizMode } from './types';
import { useAppState, normalizeState } from './hooks/useHistory';
import Home from './pages/Home';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import LayerExplore from './pages/LayerExplore';
import MineralAtlas from './pages/MineralAtlas';
import FieldReport from './pages/FieldReport';
import KanjiSpecimens from './pages/KanjiSpecimens';

export interface DebugFlags {
  mineralFullColor: boolean;
  allSpecimensGold: boolean;
  allTier3: boolean;
}

const INITIAL_DEBUG_FLAGS: DebugFlags = {
  mineralFullColor: false,
  allSpecimensGold: false,
  allTier3: false,
};

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [lastAnswers, setLastAnswers] = useState<AnswerRecord[]>([]);
  const { state, recordAnswer, toggleBookmark, persist, resetData } = useAppState();
  const [debugFlags, setDebugFlags] = useState<DebugFlags>(INITIAL_DEBUG_FLAGS);
  const debug = debugFlags.mineralFullColor;
  const [quizBaselineMinerals, setQuizBaselineMinerals] = useState<Record<MineralType, number>>(
    () => structuredClone(state.minerals),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.href = url;
    a.download = `kanken6_backup_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!confirm('現在のデータを上書きしますか？')) return;
        persist(() => normalizeState(parsed));
      } catch {
        alert('JSONファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [persist]);

  // Load questions
  useEffect(() => {
    fetch('./data/questions.json')
      .then(res => res.json())
      .then((data: Question[]) => setAllQuestions(data))
      .catch(err => console.error('Failed to load questions:', err));
  }, []);

  const navigate = useCallback((s: Screen) => {
    if (s.kind === 'quiz' || s.kind === 'layerQuiz') {
      setQuizBaselineMinerals(structuredClone(state.minerals));
    }
    setScreen(s);
  }, [state.minerals]);

  const handleQuizComplete = useCallback((answers: AnswerRecord[], mode: QuizMode) => {
    setLastAnswers(answers);
    setScreen({ kind: 'result', answers, mode });
  }, []);

  const handleSetProfileName = useCallback((name: string) => {
    const normalized = name.trim().slice(0, 12);
    persist(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        name: normalized,
      },
    }));
  }, [persist]);

  if (allQuestions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ fontSize: '1.5rem' }}>⛏ 漢字鉱山</p>
        <p style={{ color: 'var(--text-dim)', marginTop: 12 }}>データを読み込み中...</p>
      </div>
    );
  }

  switch (screen.kind) {
    case 'home':
      return (
        <>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={onFileSelected} />
          <Home state={state} navigate={navigate} debugFlags={debugFlags} onSetDebugFlags={setDebugFlags} allQuestions={allQuestions} onExport={handleExport} onImport={handleImport} onResetData={resetData} onSetProfileName={handleSetProfileName} />
        </>
      );

    case 'quiz':
      return (
        <Quiz
          allQuestions={allQuestions}
          appState={state}
          mode={screen.mode}
          onComplete={handleQuizComplete}
          onRecordAnswer={recordAnswer}
          onBack={() => navigate({ kind: 'home' })}
        />
      );

    case 'layerExplore':
      return <LayerExplore state={state} navigate={navigate} allQuestions={allQuestions} />;

    case 'layerQuiz':
      return (
        <Quiz
          allQuestions={allQuestions}
          appState={state}
          mode="layer"
          layerDepth={screen.depth}
          onComplete={handleQuizComplete}
          onRecordAnswer={recordAnswer}
          onBack={() => navigate({ kind: 'layerExplore' })}
        />
      );

    case 'result':
      return (
        <Result
          answers={lastAnswers}
          questions={allQuestions}
          mode={screen.mode}
          navigate={navigate}
          appState={state}
          baselineMinerals={quizBaselineMinerals}
        />
      );

    case 'mineralAtlas':
      return <MineralAtlas state={state} navigate={navigate} allQuestions={allQuestions} debug={debug} debugFlags={debugFlags} />;

    case 'kanjiSpecimens':
      return <KanjiSpecimens state={state} navigate={navigate} allQuestions={allQuestions} debugFlags={debugFlags} />;

    case 'fieldReport':
      return (
        <FieldReport
          state={state}
          allQuestions={allQuestions}
          navigate={navigate}
          onToggleBookmark={toggleBookmark}
        />
      );

    default:
      return (
        <>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={onFileSelected} />
          <Home state={state} navigate={navigate} debugFlags={debugFlags} onSetDebugFlags={setDebugFlags} allQuestions={allQuestions} onExport={handleExport} onImport={handleImport} onResetData={resetData} onSetProfileName={handleSetProfileName} />
        </>
      );
  }
}
