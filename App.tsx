import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category, Question, GameState, LevelConfig, Language, LeaderboardEntry } from './types';
import { generateQuestions } from './services/geminiService';
import { audioService } from './services/audioService';
import QuizCard from './components/QuizCard';

const INITIAL_LEVELS: LevelConfig[] = [
  { id: 1, name: { Bosanski: "Početnik", English: "Beginner", Deutsch: "Anfänger" }, minDifficulty: 1, maxDifficulty: 3, questionsPerLevel: 30, unlocked: true },
  { id: 2, name: { Bosanski: "Ekspert", English: "Expert", Deutsch: "Experte" }, minDifficulty: 4, maxDifficulty: 7, questionsPerLevel: 30, unlocked: false },
  { id: 3, name: { Bosanski: "Legenda", English: "Legend", Deutsch: "Legende" }, minDifficulty: 8, maxDifficulty: 10, questionsPerLevel: 30, unlocked: false },
];

const BASE_LEADERBOARD: LeaderboardEntry[] = [
  { name: "Edin_Dž", score: 2850, country: "🇧🇦", timestamp: Date.now() - 3600000 },
  { name: "Marco_R", score: 2720, country: "🇩🇪", timestamp: Date.now() - 7200000 },
  { name: "Luka_M", score: 2540, country: "🇭🇷", timestamp: Date.now() - 10800000 },
];

const TRANSLATIONS = {
  score: { Bosanski: "BODOVI", English: "SCORE", Deutsch: "PUNKTE" },
  gameOver: { Bosanski: "KRAJ IGRE!", English: "GAME OVER!", Deutsch: "SPIEL VORBEI!" },
  success: { Bosanski: "BRAVO!", English: "SUCCESS!", Deutsch: "BRAVO!" },
  levelUp: { Bosanski: "OTKLJUČAN NOVI NIVO!", English: "NEW LEVEL UNLOCKED!", Deutsch: "LEVEL FREIGESCHALTET!" },
  failed: { Bosanski: "KRAJ UTAKMICE", English: "FULL TIME", Deutsch: "SPIELENDE" },
  correctAnswersLabel: { Bosanski: "Tačno", English: "Correct", Deutsch: "Richtig" },
  accuracyLabel: { Bosanski: "Preciznost", English: "Accuracy", Deutsch: "Genauigkeit" },
  totalScoreLabel: { Bosanski: "Bodovi", English: "Points", Deutsch: "Punkte" },
  playAgain: { Bosanski: "POČETNA", English: "HOME", Deutsch: "START" },
  retry: { Bosanski: "POKUŠAJ PONOVO", English: "TRY AGAIN", Deutsch: "WIEDERHOLEN" },
  nextLevel: { Bosanski: "SLJEDEĆI NIVO", English: "NEXT LEVEL", Deutsch: "NÄCHSTES LEVEL" },
  shareBtn: { Bosanski: "PODIJELI", English: "SHARE", Deutsch: "TEILEN" },
  shareText: {
    Bosanski: "Osvojio sam {score} bodova u TAP FOOTBALL QUIZ 2026! Možeš li me pobijediti?",
    English: "I scored {score} points in TAP FOOTBALL QUIZ 2026! Can you beat me?",
    Deutsch: "Ich habe {score} Punkte in TAP FOOTBALL QUIZ 2026 erreicht! Kannst du mich schlagen?"
  },
  copied: { Bosanski: "Kopirano!", English: "Copied!", Deutsch: "Kopiert!" },
  start: { Bosanski: "KRENI", English: "START", Deutsch: "START" },
  generating: { Bosanski: "Učitavam...", English: "Loading...", Deutsch: "Laden..." },
  offlineMode: { Bosanski: "OFFLINE MOD", English: "OFFLINE MODE", Deutsch: "OFFLINE MODUS" },
  offlineDesc: { Bosanski: "Lokalna pitanja aktivna", English: "Local questions active", Deutsch: "Lokale Fragen aktiv" },
  selectCategory: { Bosanski: "Izaberi kategoriju", English: "Pick category", Deutsch: "Kategorie" },
  enterNickname: { Bosanski: "Nadimak", English: "Nickname", Deutsch: "Name" },
  leaderboard: { Bosanski: "RANKING 2026", English: "RANKING 2026", Deutsch: "RANKING 2026" },
  back: { Bosanski: "NAZAD", English: "BACK", Deutsch: "ZURÜCK" },
  exit: { Bosanski: "IZAĐI", English: "EXIT", Deutsch: "BEENDEN" },
  lives: { Bosanski: "ŽIVOTI", English: "LIVES", Deutsch: "LEBEN" },
  subTitle: { 
    Bosanski: "Vrhunski fudbalski kviz 2026", 
    English: "The ultimate football quiz 2026", 
    Deutsch: "Das ultimative Fußball-Quiz 2026" 
  },
  streak: { Bosanski: "NIZ", English: "STREAK", Deutsch: "STREAK" },
  rank: { Bosanski: "RANK", English: "RANK", Deutsch: "RANK" },
  newRecord: { Bosanski: "NOVI REKORD!", English: "NEW RECORD!", Deutsch: "NEUER REKORD!" },
  justNow: { Bosanski: "SADA", English: "NOW", Deutsch: "JETZT" }
};

const CATEGORY_TRANSLATIONS: Record<Category, Record<Language, string>> = {
  [Category.PLAYERS]: { Bosanski: "IGRAČI", English: "PLAYERS", Deutsch: "SPIELER" },
  [Category.STADIUMS]: { Bosanski: "STADIONI", English: "STADIUMS", Deutsch: "STADIEN" },
  [Category.CLUBS]: { Bosanski: "KLUBOVI", English: "CLUBS", Deutsch: "VEREINE" },
  [Category.NATIONAL_TEAMS]: { Bosanski: "REPREZENTACIJE", English: "TEAMS", Deutsch: "TEAMS" },
  [Category.COACHES]: { Bosanski: "TRENERI", English: "COACHES", Deutsch: "TRAINER" },
  [Category.ALL]: { Bosanski: "SVE", English: "ALL", Deutsch: "ALLE" }
};

const screenVariants = {
  initial: { opacity: 0, scale: 0.98, y: 10 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: { type: 'spring' as const, damping: 25, stiffness: 300 } 
  },
  exit: { opacity: 0, scale: 1.02, y: -10, transition: { duration: 0.2 } }
} as const;

const getTimeAgo = (timestamp: number, lang: Language) => {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return TRANSLATIONS.justNow[lang];
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

const App: React.FC = () => {
  const [isMuted, setIsMuted] = useState<boolean>(() => JSON.parse(localStorage.getItem('quiz_muted') || 'false'));
  const [levels, setLevels] = useState<LevelConfig[]>(() => JSON.parse(localStorage.getItem('quiz_levels') || JSON.stringify(INITIAL_LEVELS)));
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const saved = localStorage.getItem('quiz_leaderboard');
    return saved ? JSON.parse(saved) : BASE_LEADERBOARD;
  });
  
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [loading, setLoading] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  
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

  const [streak, setStreak] = useState(0);
  const [step, setStep] = useState<'HOME' | 'NICKNAME_INPUT' | 'CATEGORY_SELECT' | 'QUIZ'>('HOME');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('quiz_muted', JSON.stringify(isMuted));
    audioService.setMute(isMuted);
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('quiz_levels', JSON.stringify(levels));
  }, [levels]);

  useEffect(() => {
    localStorage.setItem('quiz_nickname', gameState.nickname);
  }, [gameState.nickname]);

  const fetchBatch = useCallback(async (level: number, category: Category, lang: Language, progress: number) => {
    setLoading(true);
    const config = levels.find(l => l.id === level) || levels[0];
    const progressRatio = progress / 30;
    const dynamicDiff = Math.min(
      config.maxDifficulty,
      Math.max(config.minDifficulty, Math.round(config.minDifficulty + (config.maxDifficulty - config.minDifficulty) * progressRatio))
    );

    const finalCategory = category === Category.ALL 
      ? Object.values(Category).filter(c => c !== Category.ALL)[Math.floor(Math.random() * 5)]
      : category;
    
    const result = await generateQuestions(finalCategory, dynamicDiff, lang, 5);
    setQuestions(prev => [...prev, ...result.questions]);
    setIsOffline(result.isOffline);
    setLoading(false);
  }, [levels]);

  useEffect(() => {
    if (step === 'QUIZ' && questions.length - currentQuestionIndex < 3 && gameState.questionsAnswered < 30 && !gameState.isGameOver) {
      fetchBatch(gameState.currentLevel, gameState.selectedCategory, gameState.language, gameState.questionsAnswered);
    }
  }, [step, questions.length, currentQuestionIndex, gameState.currentLevel, gameState.selectedCategory, gameState.language, gameState.questionsAnswered, gameState.isGameOver, fetchBatch]);

  useEffect(() => {
    if (hasInteracted) {
      audioService.setBgMusic(!isMuted);
    }
  }, [hasInteracted, isMuted]);

  const handleInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      audioService.setBgMusic(!isMuted);
    }
  };

  const handleStartQuiz = (category: Category) => {
    handleInteraction();
    setGameState(prev => ({ 
      ...prev, 
      selectedCategory: category, 
      score: 0, 
      questionsAnswered: 0, 
      correctAnswers: 0, 
      mistakes: 0, 
      isGameOver: false, 
      history: [] 
    }));
    setQuestions([]);
    setStreak(0);
    setCurrentQuestionIndex(0);
    setStep('QUIZ');
    setUserRank(null);
  };

  const handleAnswer = (answer: string) => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;
    
    const isCorrect = answer === currentQ.correctAnswer;
    const newStreak = isCorrect ? streak + 1 : 0;
    const multiplier = Math.min(3, 1 + Math.floor(newStreak / 5) * 0.5);
    const points = isCorrect ? Math.round((currentQ.difficulty || 1) * 10 * multiplier) : 0;
    
    const newMistakes = isCorrect ? gameState.mistakes : gameState.mistakes + 1;
    const isWon = (gameState.questionsAnswered + 1 >= 30) && newMistakes < 5;
    const isLost = newMistakes >= 5;
    const isOver = isWon || isLost;

    if (isOver) {
      const finalScore = gameState.score + points;
      const newEntry: LeaderboardEntry = {
        name: gameState.nickname || 'Player',
        score: finalScore,
        country: '👤',
        timestamp: Date.now(),
        isUser: true
      };

      setLeaderboard(prev => {
        const updated = [...prev, newEntry].sort((a, b) => b.score - a.score);
        const unique = updated.filter((item, index) => updated.findIndex(t => t.score === item.score && t.name === item.name) === index);
        const final = unique.slice(0, 20);
        
        const rank = final.findIndex(e => e.timestamp === newEntry.timestamp && e.score === newEntry.score) + 1;
        setUserRank(rank > 0 ? rank : null);
        
        localStorage.setItem('quiz_leaderboard', JSON.stringify(final));
        return final;
      });

      if (isWon) {
        setLevels(prev => prev.map(lvl => lvl.id === gameState.currentLevel + 1 ? { ...lvl, unlocked: true } : lvl));
      }
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

    setStreak(newStreak);
    if (!isOver) setCurrentQuestionIndex(prev => prev + 1);
  };

  const handleBackToHome = () => {
    setGameState(prev => ({ ...prev, isGameOver: false }));
    setStep('HOME');
  };

  const t = (key: keyof typeof TRANSLATIONS) => TRANSLATIONS[key][gameState.language];
  const isWin = gameState.questionsAnswered >= 30 && gameState.mistakes < 5;

  return (
    <div className="min-h-screen grass-pattern overflow-hidden font-['Outfit'] flex flex-col relative text-white" onClick={handleInteraction}>
      <AnimatePresence>
        {isOffline && (
          <motion.div initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }} className="fixed top-0 left-0 w-full z-[100] bg-amber-500/95 backdrop-blur-md px-4 py-2 flex items-center justify-center space-x-3 shadow-lg">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2 h-2 rounded-full bg-white" />
            <div className="text-center">
              <span className="text-[10px] font-black text-amber-950 uppercase tracking-[0.1em] block">{t('offlineMode')}</span>
              <span className="text-[7px] font-bold text-amber-900 uppercase opacity-70">{t('offlineDesc')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {gameState.isGameOver ? (
          <motion.div key="game-over" variants={screenVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <div className={`bg-black/95 backdrop-blur-3xl p-8 rounded-[3rem] border ${isWin ? 'border-emerald-500/40 shadow-emerald-500/10' : 'border-rose-500/40'} text-center w-full max-w-md shadow-2xl relative overflow-hidden`}>
              {userRank && userRank <= 3 && (
                <div className="absolute top-8 -right-12 rotate-45 bg-yellow-500 text-black px-12 py-1 font-black text-[10px] shadow-lg animate-pulse z-10">
                  {t('newRecord')}
                </div>
              )}
              <div className={`absolute top-0 left-0 w-full h-1.5 ${isWin ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-rose-500 shadow-[0_0_15px_#ef4444]'}`} />
              
              <h1 className={`text-4xl font-black mt-4 mb-1 uppercase tracking-tighter ${isWin ? 'text-emerald-400' : 'text-rose-500'}`}>
                {isWin ? t('success') : t('gameOver')}
              </h1>
              <p className="text-[14px] text-white/40 mb-10 font-black uppercase tracking-[0.2em]">
                {isWin ? t('levelUp') : t('failed')}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {[
                  { label: t('correctAnswersLabel'), value: gameState.correctAnswers, color: 'text-emerald-400' },
                  { label: t('rank'), value: userRank ? `#${userRank}` : '-', color: 'text-yellow-400' },
                  { label: t('totalScoreLabel'), value: gameState.score, color: 'text-white' },
                  { label: 'LVL', value: gameState.currentLevel, color: 'text-white/60' }
                ].map(stat => (
                  <div key={stat.label} className="bg-white/5 p-4 rounded-3xl border border-white/5">
                    <span className="text-[8px] font-black text-white/30 uppercase block mb-1">{stat.label}</span>
                    <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <button onClick={isWin ? () => { if (gameState.currentLevel < 3) { setGameState(p => ({...p, currentLevel: p.currentLevel + 1})); handleStartQuiz(gameState.selectedCategory); } else { handleBackToHome(); } } : () => handleStartQuiz(gameState.selectedCategory)} 
                  className={`w-full ${isWin ? 'bg-emerald-500' : 'bg-white text-black'} font-black py-5 rounded-2xl shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all`}>
                  {isWin ? t('nextLevel') : t('retry')}
                </button>
                <button onClick={handleBackToHome} className="w-full bg-white/5 text-white/70 font-black py-4 rounded-2xl border border-white/10 uppercase text-[10px] tracking-widest">
                  {t('playAgain')}
                </button>
              </div>
            </div>
          </motion.div>
        ) : step === 'HOME' ? (
          <motion.div key="home" variants={screenVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col items-center pt-12 p-4">
            <div className="w-full flex justify-between items-center mb-10 px-4 max-w-sm">
              <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); handleInteraction(); }} className="text-xl active:scale-90 transition-all">{isMuted ? '🔇' : '🔊'}</button>
              <div className="flex gap-1 bg-black/40 p-1 rounded-full border border-white/10 backdrop-blur-md">
                {(['Bosanski', 'English', 'Deutsch'] as Language[]).map(lang => (
                  <button key={lang} onClick={(e) => { e.stopPropagation(); setGameState(prev => ({ ...prev, language: lang })); handleInteraction(); }} 
                    className={`px-3 py-1 rounded-full text-[9px] font-black transition-all ${gameState.language === lang ? 'bg-emerald-500 text-white' : 'text-white/30'}`}>
                    {lang.substring(0, 2).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="text-center mb-10">
              <h1 className="text-5xl font-black tracking-tighter uppercase leading-none mb-2">TAP FOOTBALL</h1>
              <p className="text-[10px] font-bold text-emerald-500 tracking-[0.4em] uppercase">{t('subTitle')}</p>
            </div>

            <div className="w-full max-w-xs space-y-3 mb-10">
              {levels.map((level) => (
                <motion.div key={level.id} whileTap={level.unlocked ? { scale: 0.98 } : {}}
                  onClick={() => level.unlocked && (setGameState(prev => ({...prev, currentLevel: level.id})), setStep(gameState.nickname ? 'CATEGORY_SELECT' : 'NICKNAME_INPUT'))} 
                  className={`relative p-5 rounded-[1.8rem] border transition-all cursor-pointer ${level.unlocked ? 'bg-black/60 border-white/20 active:border-emerald-500' : 'bg-black/20 border-white/5 opacity-40 grayscale cursor-not-allowed'}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-white/30 text-[8px] font-black uppercase tracking-widest mb-1 block">LVL {level.id}</span>
                      <h2 className="text-base font-black uppercase tracking-tight">{level.name[gameState.language]}</h2>
                    </div>
                    {level.unlocked ? <span className="text-emerald-500 font-black text-xs">GO</span> : <span>🔒</span>}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="w-full max-w-[280px] bg-black/40 backdrop-blur-xl rounded-[1.5rem] border border-white/5 p-4 overflow-hidden">
              <h3 className="text-white/20 font-black text-[8px] tracking-[0.2em] uppercase text-center mb-3">{t('leaderboard')}</h3>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {leaderboard.map((user, i) => (
                  <div key={`${user.timestamp}-${i}`} className={`flex items-center justify-between px-3 py-2 rounded-xl border ${user.isUser ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center space-x-2">
                      <span className="text-white/20 font-black text-[9px]">#{i+1}</span>
                      <div className="flex flex-col">
                        <span className="font-bold text-[10px] leading-none mb-0.5">{user.name}</span>
                        <span className="text-[6px] text-white/30 font-black uppercase tracking-wider">{getTimeAgo(user.timestamp, gameState.language)}</span>
                      </div>
                    </div>
                    <span className="text-emerald-400 font-black text-[10px]">{user.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : step === 'NICKNAME_INPUT' ? (
          <motion.div key="nickname" variants={screenVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="bg-black/80 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 text-center w-full max-w-sm shadow-2xl">
              <h2 className="text-2xl font-black mb-8 uppercase tracking-tight">{t('enterNickname')}</h2>
              <input type="text" value={gameState.nickname} placeholder="Messi10..."
                onChange={(e) => setGameState(prev => ({ ...prev, nickname: e.target.value.substring(0, 15) }))} 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-lg font-bold mb-8 focus:outline-none focus:border-emerald-500 text-center transition-all" 
              />
              <div className="flex flex-col gap-3">
                <button onClick={() => { handleInteraction(); setStep('CATEGORY_SELECT'); }} disabled={!gameState.nickname.trim()} className={`w-full font-black py-5 rounded-2xl uppercase text-[12px] tracking-widest transition-all ${gameState.nickname.trim() ? 'bg-emerald-500' : 'bg-white/10 text-white/20'}`}>
                  {t('start')}
                </button>
                <button onClick={() => setStep('HOME')} className="text-[10px] font-black text-white/20 uppercase mt-2">{t('back')}</button>
              </div>
            </div>
          </motion.div>
        ) : step === 'CATEGORY_SELECT' ? (
          <motion.div key="cat-select" variants={screenVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col items-center justify-center p-6">
             <h2 className="text-2xl font-black mb-10 uppercase tracking-tighter text-white/60">{t('selectCategory')}</h2>
             <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                {Object.values(Category).map((cat) => (
                  <button key={cat} onClick={() => handleStartQuiz(cat)} 
                    className={`p-5 rounded-2xl border font-black text-[9px] uppercase tracking-[0.2em] transition-all ${cat === Category.ALL ? 'bg-emerald-500 border-emerald-400 text-white col-span-2 shadow-xl shadow-emerald-500/20' : 'bg-black/60 border-white/10 text-white/60 hover:border-white/30'}`}
                  >
                    {CATEGORY_TRANSLATIONS[cat][gameState.language]}
                  </button>
                ))}
             </div>
             <button onClick={() => setStep('HOME')} className="mt-12 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] active:text-white transition-all">{t('back')}</button>
          </motion.div>
        ) : (
          <motion.div key="quiz" variants={screenVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-col p-4 w-full max-w-md mx-auto relative pt-14">
            <header className="flex justify-between items-center mb-6 bg-black/60 p-4 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl relative">
              <button onClick={() => setStep('HOME')} className="absolute -top-10 left-0 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-[8px] font-black text-white/50 tracking-widest transition-all">
                {t('exit')}
              </button>
              
              <div className="flex flex-col">
                <p className="text-white/20 text-[7px] font-black uppercase mb-1 tracking-widest">LVL {gameState.currentLevel}</p>
                <p className="text-lg font-black text-yellow-400 leading-none">{gameState.score}</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-white/20 text-[7px] font-black uppercase mb-1 tracking-widest">{t('lives')}</p>
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-xs transition-opacity ${i >= (5 - gameState.mistakes) ? 'opacity-20 grayscale' : 'opacity-100'}`}>❤️</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-white/20 text-[7px] font-black uppercase mb-1 tracking-widest">Q {gameState.questionsAnswered + 1}/30</p>
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-black ${streak >= 5 ? 'bg-orange-500 text-white animate-pulse' : 'bg-white/5 text-white/20'}`}>
                   {t('streak')} x{streak}
                </div>
              </div>
            </header>
            
            <div className="w-full mb-8 h-1.5 bg-white/5 rounded-full overflow-hidden shadow-inner">
              <motion.div className="h-full bg-emerald-500 shadow-[0_0_15px_#10b981]" initial={{ width: 0 }} animate={{ width: `${(gameState.questionsAnswered / 30) * 100}%` }} />
            </div>

            <main className="flex-1 flex items-center justify-center relative">
              <AnimatePresence mode="wait">
                {loading && questions.length <= currentQuestionIndex ? (
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.4em]">{t('generating')}</p>
                  </div>
                ) : questions[currentQuestionIndex] ? (
                  <QuizCard key={questions[currentQuestionIndex].id} question={questions[currentQuestionIndex]} onAnswer={handleAnswer} disabled={false} isMuted={isMuted} language={gameState.language} />
                ) : null}
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
      <footer className="py-6 text-center mt-auto">
        <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.4em]">TAP FOOTBALL QUIZ 2026</p>
      </footer>
    </div>
  );
};

export default App;