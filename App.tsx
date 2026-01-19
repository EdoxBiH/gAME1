
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
  totalScoreLabel: { Bosanski: "Bodovi", English: "Points", Deutsch: "Punkte" },
  playAgain: { Bosanski: "POČETNA", English: "HOME", Deutsch: "START" },
  retry: { Bosanski: "POKUŠAJ PONOVO", English: "TRY AGAIN", Deutsch: "WIEDERHOLEN" },
  nextLevel: { Bosanski: "SLJEDEĆI NIVO", English: "NEXT LEVEL", Deutsch: "NÄCHSTES LEVEL" },
  start: { Bosanski: "KRENI", English: "START", Deutsch: "START" },
  startGame: { Bosanski: "ZAPOČNI IGRU", English: "START GAME", Deutsch: "JETZT SPIELEN" },
  generating: { Bosanski: "Učitavam...", English: "Loading...", Deutsch: "Laden..." },
  offlineMode: { Bosanski: "OFFLINE MOD", English: "OFFLINE MODE", Deutsch: "OFFLINE MODUS" },
  selectCategory: { Bosanski: "Izaberi kategoriju", English: "Pick category", Deutsch: "Kategorie" },
  enterNickname: { Bosanski: "Nadimak", English: "Nickname", Deutsch: "Name" },
  leaderboard: { Bosanski: "RANKING 2026", English: "RANKING 2026", Deutsch: "RANKING 2026" },
  back: { Bosanski: "NAZAD", English: "BACK", Deutsch: "ZURÜCK" },
  close: { Bosanski: "ZATVORI", English: "CLOSE", Deutsch: "SCHLIESSEN" },
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
  justNow: { Bosanski: "SADA", English: "NOW", Deutsch: "JETZT" },
  pickLevel: { Bosanski: "Izaberi nivo", English: "Select Level", Deutsch: "Level wählen" },
  shareBtn: { Bosanski: "PODIJELI REZULTAT", English: "SHARE SCORE", Deutsch: "TEILEN" },
  shareText: {
    Bosanski: "Moj rezultat je {score} u TAP FOOTBALL QUIZ 2026! Možeš li bolje?",
    English: "My score is {score} in TAP FOOTBALL QUIZ 2026! Can you do better?",
    Deutsch: "Mein Punktestand ist {score} in TAP FOOTBALL QUIZ 2026! Kannst du das toppen?"
  },
  copied: { Bosanski: "Kopirano u clipboard!", English: "Copied to clipboard!", Deutsch: "Kopiert!" }
};

const LANGUAGE_FLAGS: Record<Language, string> = {
  'Bosanski': '🇧🇦',
  'English': '🇬🇧',
  'Deutsch': '🇩🇪'
};

const CATEGORY_TRANSLATIONS: Record<Category, Record<Language, string>> = {
  [Category.PLAYERS]: { Bosanski: "IGRAČI", English: "PLAYERS", Deutsch: "SPIELER" },
  [Category.STADIUMS]: { Bosanski: "STADIONI", English: "STADIUMS", Deutsch: "STADIEN" },
  [Category.CLUBS]: { Bosanski: "KLUBOVI", English: "CLUBS", Deutsch: "VEREINE" },
  [Category.NATIONAL_TEAMS]: { Bosanski: "REPREZENTACIJE", English: "TEAMS", Deutsch: "TEAMS" },
  [Category.COACHES]: { Bosanski: "TRENERI", English: "COACHES", Deutsch: "TRAINER" },
  [Category.ALL]: { Bosanski: "SVE", English: "ALL", Deutsch: "ALLE" }
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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
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
  const [step, setStep] = useState<'HOME' | 'LEVEL_SELECT' | 'NICKNAME_INPUT' | 'CATEGORY_SELECT' | 'QUIZ'>('HOME');
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

  const handleInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      audioService.setBgMusic(!isMuted);
    }
  };

  const fetchBatch = useCallback(async (level: number, category: Category, lang: Language, progress: number) => {
    setLoading(true);
    const config = levels.find(l => l.id === level) || levels[0];
    const progressRatio = progress / 30;
    const dynamicDiff = Math.min(
      config.maxDifficulty,
      Math.max(config.minDifficulty, Math.round(config.minDifficulty + (config.maxDifficulty - config.minDifficulty) * progressRatio))
    );

    const result = await generateQuestions(category, dynamicDiff, lang, 5);
    setQuestions(prev => [...prev, ...result.questions]);
    setIsOffline(result.isOffline);
    setLoading(false);
  }, [levels]);

  useEffect(() => {
    if (step === 'QUIZ' && questions.length - currentQuestionIndex < 3 && gameState.questionsAnswered < 30 && !gameState.isGameOver) {
      fetchBatch(gameState.currentLevel, gameState.selectedCategory, gameState.language, gameState.questionsAnswered);
    }
  }, [step, questions.length, currentQuestionIndex, gameState.currentLevel, gameState.selectedCategory, gameState.language, gameState.questionsAnswered, gameState.isGameOver, fetchBatch]);

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
  };

  const handleAnswer = (answer: string) => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;
    
    const isCorrect = answer === currentQ.correctAnswer;
    const newStreak = isCorrect ? streak + 1 : 0;
    const multiplier = Math.min(3, 1 + Math.floor(newStreak / 5) * 0.5);
    const points = isCorrect ? Math.round((currentQ.difficulty || 1) * 10 * multiplier) : 0;
    
    const newMistakes = isCorrect ? gameState.mistakes : gameState.mistakes + 1;
    const isOver = (gameState.questionsAnswered + 1 >= 30) || newMistakes >= 5;

    if (isOver) {
      const finalScore = gameState.score + points;
      const newEntry: LeaderboardEntry = {
        name: gameState.nickname || 'Player',
        score: finalScore,
        country: LANGUAGE_FLAGS[gameState.language],
        timestamp: Date.now(),
        isUser: true
      };
      setLeaderboard(prev => [...prev, newEntry].sort((a, b) => b.score - a.score).slice(0, 20));
      if (gameState.questionsAnswered + 1 >= 30 && newMistakes < 5) {
        setLevels(prev => prev.map(l => l.id === gameState.currentLevel + 1 ? {...l, unlocked: true} : l));
      }
    }

    setGameState(prev => ({
      ...prev,
      score: prev.score + points,
      questionsAnswered: prev.questionsAnswered + 1,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      mistakes: newMistakes,
      isGameOver: isOver
    }));

    setStreak(newStreak);
    if (!isOver) setCurrentQuestionIndex(prev => prev + 1);
  };

  const handleShareResult = async () => {
    const scoreStr = gameState.score.toString();
    const message = t('shareText').replace('{score}', scoreStr);
    
    let shareUrl = '';
    try {
      const rawUrl = window.location.href;
      if (!rawUrl.startsWith('http')) {
        shareUrl = "https://football-quiz-2026.vercel.app";
      } else {
        const parsed = new URL(rawUrl);
        shareUrl = parsed.origin + parsed.pathname;
      }
    } catch (e) {
      shareUrl = "https://football-quiz-2026.vercel.app";
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TAP FOOTBALL QUIZ 2026',
          text: message,
          url: shareUrl,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          copyToClipboard(message + " " + shareUrl);
        }
      }
    } else {
      copyToClipboard(message + " " + shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(t('copied'));
  };

  const t = (key: keyof typeof TRANSLATIONS) => TRANSLATIONS[key][gameState.language];
  const isWin = gameState.questionsAnswered >= 30 && gameState.mistakes < 5;

  return (
    <div className="min-h-screen grass-pattern overflow-hidden font-['Outfit'] flex flex-col relative text-white" onClick={handleInteraction}>
      <AnimatePresence mode="wait">
        {step === 'HOME' ? (
          <motion.div 
            key="landing" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex-1 flex flex-col items-center justify-center p-6 relative"
          >
            <div className="absolute top-12 flex flex-col items-center">
              <div className="flex gap-4 bg-white/5 backdrop-blur-xl p-3 rounded-full border border-white/10 mb-2">
                {(Object.keys(LANGUAGE_FLAGS) as Language[]).map(lang => (
                  <button 
                    key={lang} 
                    onClick={(e) => { e.stopPropagation(); setGameState(prev => ({ ...prev, language: lang })); handleInteraction(); }}
                    className={`text-2xl transition-all duration-300 transform ${gameState.language === lang ? 'scale-125 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] opacity-100' : 'opacity-30 grayscale hover:grayscale-0 hover:opacity-100 hover:scale-110'}`}
                  >
                    {LANGUAGE_FLAGS[lang]}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center mb-20">
              <motion.h1 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none drop-shadow-2xl"
              >
                TAP FOOTBALL<br/><span className="text-emerald-500">2026</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-[10px] md:text-xs font-bold text-white/40 tracking-[0.5em] uppercase mt-4"
              >
                {t('subTitle')}
              </motion.p>
            </div>

            <div className="w-full max-w-xs space-y-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { handleInteraction(); setStep('LEVEL_SELECT'); }}
                className="w-full bg-emerald-500 text-white font-black py-6 rounded-3xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] uppercase text-sm tracking-[0.2em] btn-glow"
              >
                {t('startGame')}
              </motion.button>
              
              <button 
                onClick={() => setShowLeaderboard(true)}
                className="w-full bg-white/5 border border-white/10 text-white/60 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest backdrop-blur-md"
              >
                🏆 {t('leaderboard')}
              </button>
            </div>

            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className="absolute bottom-12 right-8 text-xl p-4 bg-black/40 rounded-full border border-white/10 backdrop-blur-md"
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </motion.div>
        ) : step === 'LEVEL_SELECT' ? (
          <motion.div 
            key="level-select" 
            initial={{ opacity: 0, x: 50 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="flex-1 flex flex-col items-center pt-20 p-6"
          >
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-10">{t('pickLevel')}</h2>
            <div className="w-full max-w-sm space-y-4">
              {levels.map(level => (
                <motion.div 
                  key={level.id}
                  whileTap={level.unlocked ? { scale: 0.98 } : {}}
                  onClick={() => level.unlocked && (setGameState(prev => ({...prev, currentLevel: level.id})), setStep(gameState.nickname ? 'CATEGORY_SELECT' : 'NICKNAME_INPUT'))}
                  className={`p-6 rounded-[2rem] border transition-all cursor-pointer flex justify-between items-center ${level.unlocked ? 'bg-black/60 border-emerald-500/30 shadow-xl' : 'bg-black/20 border-white/5 opacity-40 grayscale'}`}
                >
                  <div>
                    <span className="text-white/30 text-[9px] font-black uppercase tracking-widest block mb-1">LVL {level.id}</span>
                    <h3 className="text-xl font-black uppercase">{level.name[gameState.language]}</h3>
                  </div>
                  {level.unlocked ? <span className="text-emerald-500 font-black">GO →</span> : <span className="text-white/20">🔒</span>}
                </motion.div>
              ))}
            </div>
            <button onClick={() => setStep('HOME')} className="mt-12 text-[10px] font-black text-white/30 uppercase tracking-[0.3em] hover:text-white transition-all">{t('back')}</button>
          </motion.div>
        ) : step === 'NICKNAME_INPUT' ? (
          <motion.div key="nick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="bg-black/80 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 w-full max-w-sm text-center">
              <h2 className="text-2xl font-black mb-8 uppercase tracking-tight">{t('enterNickname')}</h2>
              <input 
                type="text" 
                value={gameState.nickname} 
                onChange={(e) => setGameState(p => ({...p, nickname: e.target.value.substring(0, 15)}))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-lg font-bold mb-8 focus:outline-none focus:border-emerald-500 text-center"
              />
              <button 
                onClick={() => setStep('CATEGORY_SELECT')}
                disabled={!gameState.nickname.trim()}
                className="w-full bg-emerald-500 font-black py-5 rounded-2xl uppercase text-xs tracking-widest disabled:opacity-20"
              >
                {t('start')}
              </button>
            </div>
          </motion.div>
        ) : step === 'CATEGORY_SELECT' ? (
          <motion.div key="cat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-6">
             <h2 className="text-2xl font-black mb-10 uppercase tracking-tighter text-white/50">{t('selectCategory')}</h2>
             <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                {Object.values(Category).map(cat => (
                  <button key={cat} onClick={() => handleStartQuiz(cat)} className={`p-5 rounded-2xl border font-black text-[9px] uppercase tracking-[0.2em] transition-all ${cat === Category.ALL ? 'bg-emerald-500 border-emerald-400 text-white col-span-2' : 'bg-black/60 border-white/10 text-white/60 hover:border-white/30'}`}>
                    {CATEGORY_TRANSLATIONS[cat][gameState.language]}
                  </button>
                ))}
             </div>
             <button onClick={() => setStep('LEVEL_SELECT')} className="mt-10 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">{t('back')}</button>
          </motion.div>
        ) : (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col p-4 w-full max-w-md mx-auto pt-14">
            {gameState.isGameOver ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className={`bg-black/95 backdrop-blur-3xl p-8 rounded-[3rem] border ${isWin ? 'border-emerald-500/40 shadow-emerald-500/10' : 'border-rose-500/40'} text-center w-full shadow-2xl`}>
                  <h1 className={`text-4xl font-black mt-4 mb-2 uppercase tracking-tighter ${isWin ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {isWin ? t('success') : t('gameOver')}
                  </h1>
                  <div className="grid grid-cols-2 gap-3 my-8">
                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                      <span className="text-[8px] font-black text-white/30 uppercase block mb-1">{t('correctAnswersLabel')}</span>
                      <p className="text-xl font-black text-emerald-400">{gameState.correctAnswers}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                      <span className="text-[8px] font-black text-white/30 uppercase block mb-1">{t('totalScoreLabel')}</span>
                      <p className="text-xl font-black text-white">{gameState.score}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <button onClick={() => setStep('HOME')} className="w-full bg-emerald-500 font-black py-5 rounded-2xl uppercase text-xs tracking-widest">{t('playAgain')}</button>
                    <button onClick={handleShareResult} className="w-full bg-white/10 text-white font-black py-4 rounded-2xl border border-emerald-500/40 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                       <span>📤</span> {t('shareBtn')}
                    </button>
                    <button onClick={() => handleStartQuiz(gameState.selectedCategory)} className="w-full bg-white/5 text-white/70 font-black py-4 rounded-2xl border border-white/10 uppercase text-[10px] tracking-widest">{t('retry')}</button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <header className="flex justify-between items-center mb-6 bg-black/60 p-4 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl">
                   <div className="flex flex-col">
                    <p className="text-white/20 text-[7px] font-black uppercase mb-1">LVL {gameState.currentLevel}</p>
                    <p className="text-lg font-black text-yellow-400 leading-none">{gameState.score}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-white/20 text-[7px] font-black uppercase mb-1">{t('lives')}</p>
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-xs ${i >= (5 - gameState.mistakes) ? 'opacity-20 grayscale' : 'opacity-100'}`}>❤️</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-white/20 text-[7px] font-black uppercase mb-1">Q {gameState.questionsAnswered + 1}/30</p>
                    <div className={`px-2 py-0.5 rounded-full text-[9px] font-black ${streak >= 5 ? 'bg-orange-500 text-white animate-pulse' : 'bg-white/5 text-white/20'}`}>
                       x{streak}
                    </div>
                  </div>
                </header>
                <div className="w-full mb-8 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-emerald-500 shadow-[0_0_15px_#10b981]" initial={{ width: 0 }} animate={{ width: `${(gameState.questionsAnswered / 30) * 100}%` }} />
                </div>
                <div className="flex-1 flex items-center justify-center">
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
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLeaderboard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6" onClick={() => setShowLeaderboard(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-black/60 border border-white/10 w-full max-w-sm rounded-[3rem] p-8" onClick={e => e.stopPropagation()}>
              <h3 className="text-center text-white font-black text-xl tracking-tight uppercase mb-8">{t('leaderboard')}</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mb-8">
                {leaderboard.map((user, i) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${user.isUser ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center space-x-3">
                      <span className="font-black text-[10px] w-4 opacity-30">{i + 1}.</span>
                      <span className="font-bold text-sm">{user.name}</span>
                    </div>
                    <span className="text-emerald-400 font-black text-sm">{user.score}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowLeaderboard(false)} className="w-full bg-white text-black font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest">{t('close')}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="py-8 text-center mt-auto">
        <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.5em]">TAP FOOTBALL QUIZ 2026</p>
      </footer>
    </div>
  );
};

export default App;
