
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
  score: { Bosanski: "Bodovi", English: "Score", Deutsch: "Punkte" },
  progress: { Bosanski: "Progres", English: "Progress", Deutsch: "Fortschritt" },
  gameOver: { Bosanski: "KRAJ IGRE!", English: "GAME OVER!", Deutsch: "SPIEL VORBEI!" },
  success: { Bosanski: "ČESTITAMO!", English: "CONGRATULATIONS!", Deutsch: "GLÜCKWUNSCH!" },
  finishedLevel: { Bosanski: "Završili ste Nivo", English: "You finished Level", Deutsch: "Du hast Level abgeschlossen" },
  correctAnswersLabel: { Bosanski: "Tačnih Odgovora", English: "Correct Answers", Deutsch: "Richtige Antworten" },
  totalScoreLabel: { Bosanski: "Ukupni Bodovi", English: "Total Points", Deutsch: "Gesamtpunkte" },
  playAgain: { Bosanski: "Igraj Ponovo", English: "Play Again", Deutsch: "Nochmal spielen" },
  start: { Bosanski: "Započni", English: "Start", Deutsch: "Start" },
  generating: { Bosanski: "Učitavam pitanja...", English: "Loading questions...", Deutsch: "Fragen werden geladen..." },
  offlineMode: { Bosanski: "OFFLINE MOD", English: "OFFLINE MODE", Deutsch: "OFFLINE-MODUS" },
  offlineWarning: { 
    Bosanski: "Igrate sa preuzetim pitanjima. Tabela nije dostupna uživo.", 
    English: "Playing with pre-downloaded questions. Leaderboard is not live.", 
    Deutsch: "Spielen mit Offline-Fragen. Bestenliste nicht live." 
  },
  selectCategory: { Bosanski: "Izaberi Kategoriju", English: "Select Category", Deutsch: "Kategorie wählen" },
  enterNickname: { Bosanski: "Unesi Nadimak", English: "Enter Nickname", Deutsch: "Spitzname" },
  nicknamePlaceholder: { Bosanski: "Tvoje ime...", English: "Your name...", Deutsch: "Dein Name..." },
  leaderboard: { Bosanski: "Najbolji Rezultati", English: "Top Scores", Deutsch: "Bestenliste" },
  back: { Bosanski: "NAZAD", English: "BACK", Deutsch: "ZURÜCK" },
  lives: { Bosanski: "Životi", English: "Lives", Deutsch: "Leben" },
  locked: { Bosanski: "ZAKLJUČANO", English: "LOCKED", Deutsch: "GESPERRT" },
  subTitle: { 
    Bosanski: "Najbolji fudbalski kviz na Balkanu. Igraj i osvajaj nivoe!", 
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

  const calculateDifficulty = useCallback((levelId: number, progressIndex: number) => {
    const config = levels.find(l => l.id === levelId)!;
    const progressRatio = progressIndex / 30;
    // Skalira težinu unutar raspona nivoa
    let diff = config.minDifficulty + (progressRatio * (config.maxDifficulty - config.minDifficulty));
    return Math.max(1, Math.min(10, Math.round(diff)));
  }, [levels]);

  const fetchBatch = useCallback(async (level: number, category: Category, lang: Language, progress: number) => {
    setLoading(true);
    const finalCategory = category === Category.ALL 
      ? Object.values(Category).filter(c => c !== Category.ALL)[Math.floor(Math.random() * 5)]
      : category;
    const currentDiff = calculateDifficulty(level, progress);
    const result = await generateQuestions(finalCategory, currentDiff, lang, 5);
    setQuestions(prev => [...prev, ...result.questions]);
    setIsOffline(result.isOffline);
    setLoading(false);
  }, [calculateDifficulty]);

  useEffect(() => {
    if (step === 'QUIZ' && questions.length - currentQuestionIndex < 3 && gameState.questionsAnswered < 30 && !gameState.isGameOver) {
      fetchBatch(gameState.currentLevel, gameState.selectedCategory, gameState.language, gameState.questionsAnswered);
    }
  }, [step, questions.length, currentQuestionIndex, gameState.currentLevel, gameState.selectedCategory, gameState.language, gameState.questionsAnswered, gameState.isGameOver, fetchBatch]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.1;
    }
    if (!isMuted && step !== 'QUIZ') {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isMuted, step]);

  const handleStartQuiz = (category: Category) => {
    setGameState(prev => ({ ...prev, selectedCategory: category, score: 0, questionsAnswered: 0, correctAnswers: 0, mistakes: 0, isGameOver: false, history: [] }));
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setStep('QUIZ');
    setLevelProgress(0);
  };

  const handlePlayAgain = () => {
    setGameState(prev => ({ ...prev, score: 0, questionsAnswered: 0, correctAnswers: 0, mistakes: 0, isGameOver: false, history: [] }));
    setStep('HOME');
    setLevelProgress(0);
    setCurrentQuestionIndex(0);
    setQuestions([]);
  };

  const unlockNextLevel = (completedLevelId: number) => {
    setLevels(prev => prev.map(lvl => lvl.id === completedLevelId + 1 ? { ...lvl, unlocked: true } : lvl));
  };

  const updateLeaderboard = (nickname: string, score: number) => {
    const newEntry: LeaderboardEntry = { name: nickname || 'Player', score, country: '👤', isUser: true };
    setLeaderboard(prev => [...prev, newEntry].sort((a, b) => b.score - a.score).slice(0, 10));
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
      updateLeaderboard(gameState.nickname, gameState.score + points);
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
    if (!isOver) setTimeout(() => setCurrentQuestionIndex(prev => prev + 1), 0);
  };

  const t = (key: keyof typeof TRANSLATIONS) => TRANSLATIONS[key][gameState.language];
  const catT = (cat: Category) => CATEGORY_TRANSLATIONS[cat][gameState.language];

  return (
    <div className="min-h-screen grass-pattern overflow-hidden font-['Outfit'] flex flex-col">
      <AnimatePresence mode="wait">
        {gameState.isGameOver ? (
          <motion.div key="game-over" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="bg-black/80 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 text-center max-w-lg w-full shadow-2xl">
              <h1 className={`text-4xl font-black mb-4 uppercase tracking-tighter ${gameState.mistakes >= 5 ? 'text-rose-500' : 'text-emerald-400'}`}>
                {gameState.mistakes >= 5 ? t('gameOver') : t('success')}
              </h1>
              <p className="text-xl text-white/60 mb-8 font-medium">{t('finishedLevel')} {gameState.currentLevel}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">{t('correctAnswersLabel')}</p>
                  <p className="text-3xl font-black text-emerald-400">{gameState.correctAnswers}/30</p>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">{t('totalScoreLabel')}</p>
                  <p className="text-3xl font-black text-yellow-400">{gameState.score}</p>
                </div>
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handlePlayAgain} className="w-full bg-emerald-500 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-sm">
                {t('playAgain')}
              </motion.button>
            </div>
          </motion.div>
        ) : step === 'HOME' ? (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -50 }} className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="absolute top-6 left-6">{isOffline && <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-2xl flex items-center space-x-2 backdrop-blur-md"><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /><span className="text-amber-400 text-[10px] font-black tracking-widest">{t('offlineMode')}</span></div>}</div>
            <div className="absolute top-6 right-6 flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-black/40 p-2 rounded-full border border-white/10 backdrop-blur-md">
                {(['Bosanski', 'English', 'Deutsch'] as Language[]).map(lang => (
                  <button key={lang} onClick={() => setGameState(prev => ({ ...prev, language: lang }))} className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${gameState.language === lang ? 'bg-emerald-500 text-white' : 'text-white/40 hover:text-white/80'}`}>{lang.substring(0, 2).toUpperCase()}</button>
                ))}
                <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 text-white/40 hover:text-white">{isMuted ? '🔇' : '🔊'}</button>
              </div>
            </div>

            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tighter uppercase leading-none">TAP FOOTBALL <span className="text-emerald-500">2026</span></h1>
              <p className="text-sm text-white/30 max-w-xs mx-auto font-medium">{t('subTitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl w-full px-4">
              {levels.map((level, i) => (
                <motion.div key={level.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`group relative p-8 rounded-[2.5rem] border transition-all ${level.unlocked ? 'bg-black/60 border-white/10 hover:bg-black/80 hover:scale-[1.02]' : 'bg-black/20 border-white/5 opacity-40'}`}>
                  <h3 className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-2">Level {level.id}</h3>
                  <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">{level.name[gameState.language]}</h2>
                  {level.unlocked ? (
                    <button onClick={() => { setGameState(prev => ({...prev, currentLevel: level.id})); setStep(gameState.nickname ? 'CATEGORY_SELECT' : 'NICKNAME_INPUT'); }} className="w-full bg-white/5 hover:bg-emerald-500 text-white py-3 rounded-2xl text-xs font-black transition-all uppercase tracking-widest">{t('start')}</button>
                  ) : (
                    <div className="text-white/20 text-[10px] font-black uppercase tracking-widest text-center py-3 border border-dashed border-white/10 rounded-2xl">{t('locked')}</div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="mt-12 w-full max-w-md bg-black/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8">
              <h3 className="text-white font-black text-center mb-6 text-[10px] tracking-widest uppercase opacity-40">{t('leaderboard')}</h3>
              <div className="space-y-3">
                {leaderboard.map((user, i) => (
                  <div key={i} className={`flex items-center justify-between p-3.5 rounded-2xl border ${user.isUser ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center space-x-4">
                      <span className="text-white/20 font-black italic text-xs">#{i+1}</span>
                      <span className="text-lg">{user.country}</span>
                      <span className={`font-bold text-sm ${user.isUser ? 'text-emerald-400' : 'text-white/80'}`}>{user.name}</span>
                    </div>
                    <span className="text-emerald-500 font-black text-sm">{user.score}</span>
                  </div>
                ))}
              </div>
            </div>
            <footer className="mt-10 opacity-20 text-[9px] font-black tracking-[0.3em] uppercase">tapfootball@gmail.com</footer>
          </motion.div>
        ) : step === 'NICKNAME_INPUT' ? (
          <motion.div key="nickname" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="bg-black/60 backdrop-blur-3xl p-12 rounded-[3rem] border border-white/10 text-center max-w-sm w-full shadow-2xl">
              <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-tight">{t('enterNickname')}</h2>
              <input type="text" value={gameState.nickname} onChange={(e) => setGameState(prev => ({ ...prev, nickname: e.target.value.substring(0, 15) }))} placeholder={t('nicknamePlaceholder')} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-lg font-bold mb-8 focus:outline-none focus:border-emerald-500 transition-all text-center" />
              <button onClick={() => gameState.nickname.trim() && setStep('CATEGORY_SELECT')} disabled={!gameState.nickname.trim()} className={`w-full font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs ${gameState.nickname.trim() ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}>{t('start')}</button>
              <button onClick={() => setStep('HOME')} className="mt-8 text-white/20 hover:text-white text-[10px] font-black uppercase tracking-widest">{t('back')}</button>
            </div>
          </motion.div>
        ) : step === 'CATEGORY_SELECT' ? (
          <motion.div key="cat-select" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col items-center justify-center p-6">
             <h2 className="text-3xl font-black text-white mb-10 uppercase tracking-tighter">{t('selectCategory')}</h2>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl w-full">
                {Object.values(Category).map((cat) => (
                  <motion.button key={cat} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleStartQuiz(cat)} className={`p-6 rounded-[2rem] border font-black text-center text-[10px] transition-all uppercase tracking-widest ${cat === Category.ALL ? 'bg-emerald-500 border-emerald-400 text-white col-span-2 md:col-span-1 shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>{catT(cat)}</motion.button>
                ))}
             </div>
             <button onClick={() => setStep('HOME')} className="mt-12 text-white/20 hover:text-white text-[10px] font-black uppercase tracking-widest">{t('back')}</button>
          </motion.div>
        ) : (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full">
            <header className="flex justify-between items-center mb-6 bg-black/60 p-5 rounded-[2rem] border border-white/10 backdrop-blur-xl">
              <div className="flex items-center space-x-4">
                <button onClick={() => setStep('HOME')} className="p-2.5 bg-white/5 rounded-2xl text-white/40 hover:text-white transition-colors">BACK</button>
                <div className="hidden sm:block"><p className="text-white/20 text-[8px] font-black uppercase tracking-widest mb-0.5">PLAYER</p><h1 className="text-white font-black text-xs uppercase">{gameState.nickname}</h1></div>
              </div>
              <div className="flex items-center space-x-8">
                <div className="text-center"><p className="text-white/20 text-[8px] font-black uppercase tracking-widest mb-1">{t('lives')}</p><div className="flex space-x-1">{[...Array(5)].map((_, i) => (<span key={i} className={`text-xs ${i < (5 - gameState.mistakes) ? 'grayscale-0' : 'grayscale opacity-20'}`}>❤️</span>))}</div></div>
                <div className="text-center"><p className="text-white/20 text-[8px] font-black uppercase tracking-widest mb-1">{t('score')}</p><p className="text-xl font-black text-yellow-400 leading-none">{gameState.score}</p></div>
                <div className="text-center"><p className="text-white/20 text-[8px] font-black uppercase tracking-widest mb-1">{t('progress')}</p><p className="text-xl font-black text-emerald-400 leading-none">{gameState.questionsAnswered}<span className="text-white/20 text-xs">/30</span></p></div>
              </div>
            </header>
            <div className="w-full mb-8 h-1 bg-white/5 rounded-full overflow-hidden"><motion.div className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }} /></div>
            <main className="flex-1 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {loading && questions.length <= currentQuestionIndex ? (
                  <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6" /><p className="text-white/40 font-black text-[10px] tracking-widest uppercase">{t('generating')}</p></motion.div>
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
