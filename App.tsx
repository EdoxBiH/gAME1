
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category, Question, GameState, LevelConfig, Language, LeaderboardEntry } from './types';
import { generateQuestions } from './services/geminiService';
import QuizCard from './components/QuizCard';

const INITIAL_LEVELS: LevelConfig[] = [
  { id: 1, name: { Bosanski: "Početnik", English: "Beginner", Deutsch: "Anfänger" }, minDifficulty: 1, maxDifficulty: 3, questionsPerLevel: 30, unlocked: true },
  { id: 2, name: { Bosanski: "Poznavalac", English: "Expert", Deutsch: "Experte" }, minDifficulty: 4, maxDifficulty: 6, questionsPerLevel: 30, unlocked: false },
  { id: 3, name: { Bosanski: "Legenda", English: "Legend", Deutsch: "Legende" }, minDifficulty: 7, maxDifficulty: 10, questionsPerLevel: 30, unlocked: false },
];

const CATEGORY_TRANSLATIONS: Record<Category, Record<Language, string>> = {
  [Category.PLAYERS]: { Bosanski: "IGRAČI", English: "PLAYERS", Deutsch: "SPIELER" },
  [Category.STADIUMS]: { Bosanski: "STADIONI", English: "STADIUMS", Deutsch: "STADIEN" },
  [Category.CLUBS]: { Bosanski: "KLUBOVI", English: "CLUBS", Deutsch: "VEREINE" },
  [Category.NATIONAL_TEAMS]: { Bosanski: "REPREZENTACIJE", English: "NATIONAL TEAMS", Deutsch: "NATIONALMANNSCHAFTEN" },
  [Category.COACHES]: { Bosanski: "TRENERI", English: "COACHES", Deutsch: "TRAINER" },
  [Category.ALL]: { Bosanski: "SVE KATEGORIJE", English: "ALL CATEGORIES", Deutsch: "ALLE KATEGORIEN" }
};

const TRANSLATIONS = {
  score: { Bosanski: "BODOVI", English: "SCORE", Deutsch: "PUNKTE" },
  progress: { Bosanski: "PROGRES", English: "PROGRESS", Deutsch: "FORTSCHRITT" },
  gameOver: { Bosanski: "KRAJ IGRE!", English: "GAME OVER!", Deutsch: "SPIEL VORBEI!" },
  success: { Bosanski: "ČESTITAMO!", English: "CONGRATULATIONS!", Deutsch: "GLÜCKWUNSCH!" },
  finishedLevel: { Bosanski: "Završili ste Nivo", English: "You finished Level", Deutsch: "Du hast Level abgeschlossen" },
  correctAnswersLabel: { Bosanski: "Tačnih Odgovora", English: "Correct Answers", Deutsch: "Richtige Antworten" },
  totalScoreLabel: { Bosanski: "Ukupni Bodovi", English: "Total Points", Deutsch: "Gesamtpunkte" },
  playAgain: { Bosanski: "Igraj Ponovo", English: "Play Again", Deutsch: "Nochmal spielen" },
  start: { Bosanski: "ZAPOČNI", English: "START", Deutsch: "START" },
  generating: { Bosanski: "Učitavam pitanja...", English: "Loading questions...", Deutsch: "Fragen werden geladen..." },
  offlineMode: { Bosanski: "OFFLINE MOD", English: "OFFLINE MODE", Deutsch: "OFFLINE-MODUS" },
  selectCategory: { Bosanski: "Izaberi Kategoriju", English: "Select Category", Deutsch: "Kategorie wählen" },
  enterNickname: { Bosanski: "Unesi Nadimak", English: "Enter Nickname", Deutsch: "Spitzname" },
  nicknamePlaceholder: { Bosanski: "Tvoje ime...", English: "Your name...", Deutsch: "Dein Name..." },
  leaderboard: { Bosanski: "NAJBOLJI REZULTATI", English: "TOP SCORES", Deutsch: "BESTENLISTE" },
  back: { Bosanski: "NAZAD", English: "BACK", Deutsch: "ZURÜCK" },
  lives: { Bosanski: "ŽIVOTI", English: "LIVES", Deutsch: "LEBEN" },
  locked: { Bosanski: "ZAKLJUČANO", English: "LOCKED", Deutsch: "GESPERRT" },
  refreshing: { Bosanski: "Ažuriranje...", English: "Updating...", Deutsch: "Aktualisierung..." },
  subTitle: { 
    Bosanski: "Najbolji fudbalski kviz. Igraj i osvajaj nivoe!", 
    English: "The ultimate football quiz. Play and unlock levels!", 
    Deutsch: "Das ultimative Fußball-Quiz. Spiele und schalte Levels frei!" 
  }
};

const BASE_MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { name: "Edin_Dž", score: 2850, country: "🇧🇦" },
  { name: "Marco_Reus", score: 2720, country: "🇩🇪" },
  { name: "Harry_K", score: 2680, country: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Luka_M", score: 2540, country: "🇭🇷" },
  { name: "Kylian_M", score: 2410, country: "🇫🇷" },
];

const RIVAL_PLAYERS = [
  { name: "Erling_H", country: "🇳🇴" },
  { name: "Mohamed_S", country: "🇪🇬" },
  { name: "Vinicius_Jr", country: "🇧🇷" },
  { name: "Jude_B", country: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Dušan_V", country: "🇷🇸" },
];

const App: React.FC = () => {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem('quiz_muted');
    return saved ? JSON.parse(saved) : false;
  });

  const [levels, setLevels] = useState<LevelConfig[]>(() => {
    const saved = localStorage.getItem('quiz_levels');
    return saved ? JSON.parse(saved) : INITIAL_LEVELS;
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const saved = localStorage.getItem('quiz_leaderboard');
    return saved ? JSON.parse(saved) : BASE_MOCK_LEADERBOARD;
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const [gameState, setGameState] = useState<GameState>({
    nickname: localStorage.getItem('quiz_nickname') || '',
    currentLevel: 1,
    selectedCategory: Category.ALL,
    score: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    mistakes: 0,
    isGameOver: false,
    language: 'Bosanski',
    history: [],
  });

  const [step, setStep] = useState<'HOME' | 'NICKNAME_INPUT' | 'CATEGORY_SELECT' | 'QUIZ'>('HOME');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [levelProgress, setLevelProgress] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const questionStartTime = useRef<number>(0);

  useEffect(() => localStorage.setItem('quiz_muted', JSON.stringify(isMuted)), [isMuted]);
  useEffect(() => localStorage.setItem('quiz_leaderboard', JSON.stringify(leaderboard)), [leaderboard]);
  useEffect(() => localStorage.setItem('quiz_levels', JSON.stringify(levels)), [levels]);
  useEffect(() => localStorage.setItem('quiz_nickname', gameState.nickname), [gameState.nickname]);

  useEffect(() => {
    const handleOnlineStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const calculateDifficulty = useCallback((levelId: number, progressIndex: number, history: GameState['history']) => {
    const config = levels.find(l => l.id === levelId) || levels[0];
    const progressRatio = progressIndex / 30;
    const baseDiff = config.minDifficulty + (progressRatio * (config.maxDifficulty - config.minDifficulty));
    
    let adjustment = 0;
    const recent = history.slice(-5);
    recent.forEach(entry => {
      if (entry.isCorrect) adjustment += 0.2;
      else adjustment -= 0.5;
    });

    return Math.max(1, Math.min(10, Math.round(baseDiff + adjustment)));
  }, [levels]);

  const fetchBatch = useCallback(async (level: number, category: Category, lang: Language, progress: number, history: GameState['history']) => {
    setLoading(true);
    const finalCategory = category === Category.ALL 
      ? Object.values(Category).filter(c => c !== Category.ALL)[Math.floor(Math.random() * 5)]
      : category;
    
    const currentDiff = calculateDifficulty(level, progress, history);
    const result = await generateQuestions(finalCategory, currentDiff, lang, 5);
    
    setQuestions(prev => [...prev, ...result.questions]);
    setIsOffline(result.isOffline);
    setLoading(false);
  }, [calculateDifficulty]);

  useEffect(() => {
    if (step === 'QUIZ' && questions.length - currentQuestionIndex < 3 && gameState.questionsAnswered < 30 && !gameState.isGameOver) {
      fetchBatch(gameState.currentLevel, gameState.selectedCategory, gameState.language, gameState.questionsAnswered, gameState.history);
    }
  }, [step, questions.length, currentQuestionIndex, gameState.currentLevel, gameState.selectedCategory, gameState.language, gameState.questionsAnswered, gameState.isGameOver, gameState.history, fetchBatch]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.08;
    }
    if (hasInteracted && !isMuted && step !== 'QUIZ') {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isMuted, step, hasInteracted]);

  const handleStartQuiz = (category: Category) => {
    setGameState(prev => ({ ...prev, selectedCategory: category, score: 0, questionsAnswered: 0, correctAnswers: 0, mistakes: 0, isGameOver: false, history: [] }));
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setStep('QUIZ');
    setLevelProgress(0);
    setHasInteracted(true);
  };

  const unlockNextLevel = (completedLevelId: number) => {
    setLevels(prev => prev.map(lvl => lvl.id === completedLevelId + 1 ? { ...lvl, unlocked: true } : lvl));
  };

  const handleAnswer = (answer: string) => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;
    
    const isCorrect = answer === currentQ.correctAnswer;
    const points = isCorrect ? (currentQ.difficulty || 1) * 10 : 0;
    const newMistakes = isCorrect ? gameState.mistakes : gameState.mistakes + 1;
    const isWon = gameState.questionsAnswered + 1 >= 30;
    const isLost = newMistakes >= 5;
    const isOver = isWon || isLost;

    if (isOver) {
      const finalScore = gameState.score + points;
      setLeaderboard(prev => {
        const name = gameState.nickname || 'Player';
        const updated = [...prev, { name, score: finalScore, country: '👤', isUser: true }];
        return updated.sort((a, b) => b.score - a.score).slice(0, 10);
      });
      if (isWon && !isLost) unlockNextLevel(gameState.currentLevel);
    }

    setGameState(prev => ({
      ...prev,
      score: prev.score + points,
      questionsAnswered: prev.questionsAnswered + 1,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      mistakes: newMistakes,
      history: [...prev.history, { questionId: currentQ.id, isCorrect }],
      isGameOver: isOver
    }));

    setLevelProgress(((gameState.questionsAnswered + 1) / 30) * 100);
    if (!isOver) setCurrentQuestionIndex(prev => prev + 1);
  };

  const t = (key: keyof typeof TRANSLATIONS) => TRANSLATIONS[key][gameState.language];

  return (
    <div className="min-h-screen grass-pattern overflow-hidden font-['Outfit'] flex flex-col relative">
      <AnimatePresence mode="wait">
        {gameState.isGameOver ? (
          <motion.div key="game-over" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="bg-black/80 backdrop-blur-3xl p-8 rounded-[2rem] border border-white/10 text-center max-w-sm w-full shadow-2xl">
              <h1 className={`text-3xl font-black mb-2 uppercase tracking-tighter ${gameState.mistakes >= 5 ? 'text-rose-500' : 'text-emerald-400'}`}>
                {gameState.mistakes >= 5 ? t('gameOver') : t('success')}
              </h1>
              <p className="text-sm text-white/50 mb-8">{t('finishedLevel')} {gameState.currentLevel}</p>
              
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">{t('correctAnswersLabel')}</p>
                  <p className="text-xl font-black text-emerald-400">{gameState.correctAnswers}/30</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">{t('totalScoreLabel')}</p>
                  <p className="text-xl font-black text-yellow-400">{gameState.score}</p>
                </div>
              </div>

              <button onClick={() => setStep('HOME')} className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest text-[10px]">
                {t('playAgain')}
              </button>
            </div>
          </motion.div>
        ) : step === 'HOME' ? (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
            <div className="absolute top-6 left-6 flex items-center space-x-2">
              <button onClick={() => setIsMuted(!isMuted)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all backdrop-blur-md">{isMuted ? '🔇' : '🔊'}</button>
            </div>
            
            <div className="absolute top-6 right-6 flex items-center bg-black/40 p-1 rounded-full border border-white/10 backdrop-blur-md">
              {(['Bosanski', 'English', 'Deutsch'] as Language[]).map(lang => (
                <button key={lang} onClick={() => setGameState(prev => ({ ...prev, language: lang }))} className={`px-3 py-1.5 rounded-full text-[8px] font-black transition-all ${gameState.language === lang ? 'bg-emerald-500 text-white' : 'text-white/40'}`}>{lang.substring(0, 2).toUpperCase()}</button>
              ))}
            </div>

            <div className="text-center mb-12">
              <motion.h1 initial={{ y: -20 }} animate={{ y: 0 }} className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none mb-2">TAP FOOTBALL <span className="text-emerald-500">2026</span></motion.h1>
              <p className="text-[10px] md:text-xs text-white/30 font-medium tracking-wide max-w-xs mx-auto">{t('subTitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl px-2">
              {levels.map((level) => (
                <motion.div key={level.id} whileHover={level.unlocked ? { y: -5 } : {}} className={`group relative p-6 rounded-[2rem] border transition-all ${level.unlocked ? 'bg-black/60 border-white/10' : 'bg-black/20 border-white/5 opacity-40'}`}>
                  <span className="text-white/20 text-[8px] font-black uppercase tracking-widest mb-1 block">LVL {level.id}</span>
                  <h2 className="text-lg md:text-xl font-black text-white mb-4 uppercase tracking-tight">{level.name[gameState.language]}</h2>
                  {level.unlocked ? (
                    <button onClick={() => { setGameState(prev => ({...prev, currentLevel: level.id})); setStep(gameState.nickname ? 'CATEGORY_SELECT' : 'NICKNAME_INPUT'); }} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-2.5 rounded-xl text-[9px] font-black transition-all uppercase tracking-widest">{t('start')}</button>
                  ) : (
                    <div className="text-white/20 text-[8px] font-black uppercase tracking-widest text-center py-2.5 border border-dashed border-white/10 rounded-xl">{t('locked')}</div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="mt-10 w-full max-w-sm bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/5 p-6">
              <h3 className="text-white font-black text-[9px] tracking-widest uppercase opacity-40 text-center mb-4">{t('leaderboard')}</h3>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((user, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${user.isUser ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center space-x-3">
                      <span className="text-white/20 font-black text-[10px]">#{i+1}</span>
                      <span className="text-sm">{user.country}</span>
                      <span className="font-bold text-xs text-white/80">{user.name}</span>
                    </div>
                    <span className="text-emerald-500 font-black text-xs">{user.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : step === 'NICKNAME_INPUT' ? (
          <motion.div key="nickname" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="bg-black/60 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/10 text-center max-w-sm w-full">
              <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight">{t('enterNickname')}</h2>
              <input type="text" value={gameState.nickname} onChange={(e) => setGameState(prev => ({ ...prev, nickname: e.target.value.substring(0, 15) }))} placeholder={t('nicknamePlaceholder')} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-6 text-white text-base font-bold mb-6 focus:outline-none focus:border-emerald-500 text-center" />
              <button onClick={() => setStep('CATEGORY_SELECT')} disabled={!gameState.nickname.trim()} className={`w-full font-black py-3.5 rounded-xl transition-all uppercase tracking-widest text-[10px] ${gameState.nickname.trim() ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/20'}`}>{t('start')}</button>
            </div>
          </motion.div>
        ) : step === 'CATEGORY_SELECT' ? (
          <motion.div key="cat-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-6">
             <h2 className="text-xl font-black text-white mb-8 uppercase tracking-tighter">{t('selectCategory')}</h2>
             <div className="grid grid-cols-2 gap-3 max-w-md w-full">
                {Object.values(Category).map((cat) => (
                  <button key={cat} onClick={() => handleStartQuiz(cat)} className={`p-4 rounded-2xl border font-black text-[9px] transition-all uppercase tracking-widest ${cat === Category.ALL ? 'bg-emerald-500 border-emerald-400 text-white col-span-2' : 'bg-white/5 border-white/5 text-white/40 hover:text-white'}`}>
                    {CATEGORY_TRANSLATIONS[cat][gameState.language]}
                  </button>
                ))}
             </div>
          </motion.div>
        ) : (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col p-3 md:p-8 max-w-4xl mx-auto w-full">
            <header className="flex justify-between items-center mb-4 bg-black/60 p-3 rounded-2xl border border-white/10 backdrop-blur-xl">
              <button onClick={() => setStep('HOME')} className="p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white text-[9px] font-black uppercase">BACK</button>
              <div className="flex space-x-4 md:space-x-8">
                <div className="text-center">
                  <p className="text-white/20 text-[7px] font-black uppercase mb-0.5">{t('lives')}</p>
                  <div className="flex space-x-0.5">
                    {[...Array(5)].map((_, i) => (<span key={i} className={`text-[10px] ${i < (5 - gameState.mistakes) ? '' : 'grayscale opacity-20'}`}>❤️</span>))}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white/20 text-[7px] font-black uppercase mb-0.5">{t('score')}</p>
                  <p className="text-sm font-black text-yellow-400 leading-none">{gameState.score}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/20 text-[7px] font-black uppercase mb-0.5">{t('progress')}</p>
                  <p className="text-sm font-black text-emerald-400 leading-none">{gameState.questionsAnswered}/30</p>
                </div>
              </div>
            </header>
            
            <div className="w-full mb-6 h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div className="h-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }} />
            </div>

            <main className="flex-1 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {loading && questions.length <= currentQuestionIndex ? (
                  <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-white/30 font-black text-[9px] tracking-widest uppercase">{t('generating')}</p>
                  </motion.div>
                ) : questions[currentQuestionIndex] ? (
                  <QuizCard key={questions[currentQuestionIndex].id} question={questions[currentQuestionIndex]} onAnswer={handleAnswer} disabled={false} isMuted={isMuted} language={gameState.language} />
                ) : null}
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
