
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category, Question, GameState, LevelConfig, Language, LeaderboardEntry, Achievement, UserStats } from './types';
import { generateQuestions } from './services/geminiService';
import { audioService } from './services/audioService';
import QuizCard from './components/QuizCard';

const INITIAL_LEVELS: LevelConfig[] = [
  { id: 1, name: { Bosanski: "Početnik", English: "Beginner", Deutsch: "Anfänger" }, minDifficulty: 1, maxDifficulty: 3, questionsPerLevel: 30, unlocked: true },
  { id: 2, name: { Bosanski: "Ekspert", English: "Expert", Deutsch: "Experte" }, minDifficulty: 4, maxDifficulty: 7, questionsPerLevel: 30, unlocked: false },
  { id: 3, name: { Bosanski: "Legenda", English: "Legend", Deutsch: "Legende" }, minDifficulty: 8, maxDifficulty: 10, questionsPerLevel: 30, unlocked: false },
];

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_goal', icon: '⚽', name: { Bosanski: "Prvi Gol", English: "First Goal", Deutsch: "Erstes Tor" }, description: { Bosanski: "Odgovori na 1 pitanje tačno", English: "Answer 1 question correctly", Deutsch: "Beantworten Sie 1 Frage richtig" }, requirement: 1, type: 'total_correct' },
  { id: 'hattrick', icon: '🎩', name: { Bosanski: "Hattrick", English: "Hattrick", Deutsch: "Hattrick" }, description: { Bosanski: "Niz od 3 tačna odgovora", English: "Get a 3-streak", Deutsch: "Erhalten Sie eine 3er-Serie" }, requirement: 3, type: 'streak' },
  { id: 'clean_sheet', icon: '🧤', name: { Bosanski: "Mreža Mirovala", English: "Clean Sheet", Deutsch: "Weiße Weste" }, description: { Bosanski: "Završi partiju bez greške", English: "Finish a game with 0 mistakes", Deutsch: "Beende ein Spiel ohne Fehler" }, requirement: 1, type: 'perfect_game' },
  { id: 'pro_striker', icon: '🔥', name: { Bosanski: "Pro Napadač", English: "Pro Striker", Deutsch: "Pro-Stürmer" }, description: { Bosanski: "Niz od 10 tačnih odgovora", English: "Get a 10-streak", Deutsch: "Erhalten Sie eine 10er-Serie" }, requirement: 10, type: 'streak' },
  { id: 'centurion', icon: '💯', name: { Bosanski: "Centurion", English: "Centurion", Deutsch: "Centurion" }, description: { Bosanski: "100 tačnih odgovora ukupno", English: "100 total correct answers", Deutsch: "100 insgesamt richtige Antworten" }, requirement: 100, type: 'total_correct' },
  { id: 'world_class', icon: '🌍', name: { Bosanski: "Svjetska Klasa", English: "World Class", Deutsch: "Weltklasse" }, description: { Bosanski: "Završi 2. nivo", English: "Complete Level 2", Deutsch: "Level 2 abschließen" }, requirement: 2, type: 'level_completed' },
];

const BASE_LEADERBOARD: LeaderboardEntry[] = [
  { name: "Edin_Dž", score: 2850, country: "🇧🇦", timestamp: Date.now() - 3600000 },
  { name: "Marco_R", score: 2720, country: "🇩🇪", timestamp: Date.now() - 7200000 },
  { name: "Luka_M", score: 2540, country: "🇭🇷", timestamp: Date.now() - 10800000 },
];

const TRANSLATIONS = {
  score: { Bosanski: "BODOVI", English: "SCORE", Deutsch: "PUNKTE" },
  gameOver: { Bosanski: "KRAJ IGRE!", English: "GAME OVER!", Deutsch: "SPIEL VORBEI!" },
  success: { Bosanski: "POBJEDA!", English: "VICTORY!", Deutsch: "SIEG!" },
  correctAnswersLabel: { Bosanski: "Tačno", English: "Correct", Deutsch: "Richtig" },
  accuracyLabel: { Bosanski: "Tačnost", English: "Accuracy", Deutsch: "Genauigkeit" },
  attemptedLabel: { Bosanski: "Pokušaji", English: "Attempted", Deutsch: "Versuche" },
  totalScoreLabel: { Bosanski: "Bodovi", English: "Points", Deutsch: "Punkte" },
  playAgain: { Bosanski: "POČETNA", English: "HOME", Deutsch: "START" },
  retry: { Bosanski: "POKUŠAJ PONOVO", English: "TRY AGAIN", Deutsch: "WIEDERHOLEN" },
  resume: { Bosanski: "NASTAVI", English: "RESUME", Deutsch: "WEITER" },
  start: { Bosanski: "KRENI", English: "START", Deutsch: "START" },
  startGame: { Bosanski: "ZAPOČNI IGRU", English: "START GAME", Deutsch: "JETZT SPIELEN" },
  generating: { Bosanski: "Učitavam...", English: "Loading...", Deutsch: "Laden..." },
  selectCategory: { Bosanski: "Izaberi kategoriju", English: "Pick category", Deutsch: "Kategorie" },
  enterNickname: { Bosanski: "Nadimak", English: "Nickname", Deutsch: "Name" },
  leaderboard: { Bosanski: "RANKING 2026", English: "RANKING 2026", Deutsch: "RANKING 2026" },
  back: { Bosanski: "NAZAD", English: "BACK", Deutsch: "ZURÜCK" },
  close: { Bosanski: "ZATVORI", English: "CLOSE", Deutsch: "SCHLIESSEN" },
  lives: { Bosanski: "ŽIVOTI", English: "LIVES", Deutsch: "LEBEN" },
  subTitle: { Bosanski: "Vrhunski fudbalski kviz 2026", English: "The ultimate football quiz 2026", Deutsch: "Das ultimative Fußball-Quiz 2026" },
  pickLevel: { Bosanski: "Izaberi nivo", English: "Select Level", Deutsch: "Level wählen" },
  shareBtn: { Bosanski: "PODIJELI REZULTAT", English: "SHARE GLORY", Deutsch: "TEILEN" },
  shareText: { 
    Bosanski: "Ostvario sam {score} bodova uz {accuracy}% tačnosti u TAP FOOTBALL 2026! Možeš li me pobijediti?", 
    English: "I scored {score} points with {accuracy}% accuracy in TAP FOOTBALL 2026! Can you beat me?", 
    Deutsch: "Ich habe {score} Punkte mit {accuracy}% Genauigkeit in TAP FOOTBALL 2026 erreicht! Kannst du mich schlagen?" 
  },
  copied: { Bosanski: "Kopirano u clipboard!", English: "Copied to clipboard!", Deutsch: "In Zwischenablage kopiert!" },
  trophyRoom: { Bosanski: "TROFEJNA SALA", English: "TROPHY ROOM", Deutsch: "TROPHÄENRAUM" },
  unlockedToast: { Bosanski: "OTKLJUČANO!", English: "UNLOCKED!", Deutsch: "FREIGESCHALTET!" },
  exit: { Bosanski: "IZAĐI IZ IGRE", English: "EXIT GAME", Deutsch: "BEENDEN" },
  quitConfirm: { Bosanski: "Želite li prekinuti igru?", English: "Do you want to quit?", Deutsch: "Möchten Sie das Spiel beenden?" },
  resetData: { Bosanski: "RESTARTUJ NAPREDAK", English: "RESET PROGRESS", Deutsch: "FORTSCHRITT LÖSCHEN" },
  resetConfirm: { Bosanski: "Ovo će obrisati sve trofeje i nivoe. Sigurno?", English: "This will erase all trophies and levels. Sure?", Deutsch: "Dies löscht alle Trophäen und Levels. Sicher?" }
};

const LANGUAGE_FLAGS: Record<Language, string> = { 'Bosanski': '🇧🇦', 'English': '🇬🇧', 'Deutsch': '🇩🇪' };
const CATEGORY_TRANSLATIONS: Record<Category, Record<Language, string>> = {
  [Category.PLAYERS]: { Bosanski: "IGRAČI", English: "PLAYERS", Deutsch: "SPIELER" },
  [Category.STADIUMS]: { Bosanski: "STADIONI", English: "STADIUMS", Deutsch: "STADIEN" },
  [Category.CLUBS]: { Bosanski: "KLUBOVI", English: "CLUBS", Deutsch: "VEREINE" },
  [Category.NATIONAL_TEAMS]: { Bosanski: "REPREZENTACIJE", English: "TEAMS", Deutsch: "TEAMS" },
  [Category.COACHES]: { Bosanski: "TRENERI", English: "COACHES", Deutsch: "TRAINER" },
  [Category.ALL]: { Bosanski: "SVE", English: "ALL", Deutsch: "ALLE" }
};

const GAME_LOGO = "https://cdn-icons-png.flaticon.com/512/53/53283.png";

const App: React.FC = () => {
  const [isMuted, setIsMuted] = useState<boolean>(() => JSON.parse(localStorage.getItem('quiz_muted') || 'false'));
  const [levels, setLevels] = useState<LevelConfig[]>(() => {
    const saved = localStorage.getItem('quiz_levels');
    return saved ? JSON.parse(saved) : INITIAL_LEVELS;
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const saved = localStorage.getItem('quiz_leaderboard');
    return saved ? JSON.parse(saved) : BASE_LEADERBOARD;
  });
  const [userStats, setUserStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('quiz_user_stats');
    return saved ? JSON.parse(saved) : { totalPoints: 0, totalCorrect: 0, totalAnswered: 0, maxStreak: 0, levelsCompleted: [], unlockedAchievements: [] };
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
    language: 'English',
    history: [],
  });

  useEffect(() => {
    localStorage.setItem('quiz_muted', JSON.stringify(isMuted));
    audioService.setMute(isMuted);
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('quiz_user_stats', JSON.stringify(userStats));
  }, [userStats]);

  useEffect(() => {
    localStorage.setItem('quiz_levels', JSON.stringify(levels));
  }, [levels]);

  useEffect(() => {
    localStorage.setItem('quiz_nickname', gameState.nickname);
  }, [gameState.nickname]);

  const [hasInteracted, setHasInteracted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showTrophyRoom, setShowTrophyRoom] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [unlockedToast, setUnlockedToast] = useState<Achievement | null>(null);
  
  const [streak, setStreak] = useState(0);
  const [step, setStep] = useState<'HOME' | 'LEVEL_SELECT' | 'NICKNAME_INPUT' | 'CATEGORY_SELECT' | 'QUIZ'>('HOME');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const checkAchievements = useCallback((newStats: UserStats, currentStreak: number, isPerfect: boolean = false) => {
    const newUnlocks: string[] = [];
    ACHIEVEMENTS.forEach(ach => {
      if (newStats.unlockedAchievements.includes(ach.id)) return;
      
      let condition = false;
      if (ach.type === 'total_correct') condition = newStats.totalCorrect >= ach.requirement;
      if (ach.type === 'streak') condition = currentStreak >= ach.requirement;
      if (ach.type === 'perfect_game') condition = isPerfect;
      if (ach.type === 'level_completed') condition = newStats.levelsCompleted.includes(ach.requirement);

      if (condition) {
        newUnlocks.push(ach.id);
        setUnlockedToast(ach);
        audioService.playSfx('correct', 1);
        setTimeout(() => setUnlockedToast(null), 4000);
      }
    });

    if (newUnlocks.length > 0) {
      setUserStats(prev => ({ ...prev, unlockedAchievements: [...prev.unlockedAchievements, ...newUnlocks] }));
    }
  }, []);

  const handleInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      audioService.setBgMusic(!isMuted);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMute = !isMuted;
    setIsMuted(newMute);
    audioService.setBgMusic(!newMute);
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
    setLoading(false);
  }, [levels]);

  useEffect(() => {
    if (step === 'QUIZ' && questions.length - currentQuestionIndex < 3 && gameState.questionsAnswered < 30 && !gameState.isGameOver) {
      fetchBatch(gameState.currentLevel, gameState.selectedCategory, gameState.language, gameState.questionsAnswered);
    }
  }, [step, questions.length, currentQuestionIndex, gameState.currentLevel, gameState.selectedCategory, gameState.language, gameState.questionsAnswered, gameState.isGameOver, fetchBatch]);

  const handleStartQuiz = (category: Category) => {
    handleInteraction();
    setGameState(prev => ({ ...prev, selectedCategory: category, score: 0, questionsAnswered: 0, correctAnswers: 0, mistakes: 0, isGameOver: false, history: [] }));
    setQuestions([]);
    setStreak(0);
    setCurrentQuestionIndex(0);
    setIsPaused(false);
    setStep('QUIZ');
  };

  const handleAnswer = (answer: string) => {
    if (isPaused) return;
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;
    
    const isCorrect = answer === currentQ.correctAnswer;
    const newStreak = isCorrect ? streak + 1 : 0;
    const points = isCorrect ? Math.round((currentQ.difficulty || 1) * 10 * (1 + Math.floor(newStreak / 5) * 0.5)) : 0;
    
    const newMistakes = isCorrect ? gameState.mistakes : gameState.mistakes + 1;
    const isOver = (gameState.questionsAnswered + 1 >= 30) || newMistakes >= 5;

    const updatedStats = {
      ...userStats,
      totalPoints: userStats.totalPoints + points,
      totalCorrect: isCorrect ? userStats.totalCorrect + 1 : userStats.totalCorrect,
      totalAnswered: userStats.totalAnswered + 1,
      maxStreak: Math.max(userStats.maxStreak, newStreak)
    };
    setUserStats(updatedStats);
    checkAchievements(updatedStats, newStreak);

    if (isOver) {
      const isPerfect = newMistakes === 0 && (gameState.questionsAnswered + 1 >= 30);
      if (isPerfect) checkAchievements(updatedStats, newStreak, true);

      if (gameState.questionsAnswered + 1 >= 30 && newMistakes < 5) {
        setUserStats(prev => ({
          ...prev,
          levelsCompleted: [...new Set([...prev.levelsCompleted, gameState.currentLevel])]
        }));
      }

      setLeaderboard(prev => {
        const updated = [...prev, { name: gameState.nickname || 'Player', score: gameState.score + points, country: LANGUAGE_FLAGS[gameState.language], timestamp: Date.now(), isUser: true }].sort((a, b) => b.score - a.score).slice(0, 20);
        localStorage.setItem('quiz_leaderboard', JSON.stringify(updated));
        return updated;
      });
      
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

  const resetAllProgress = () => {
    if (window.confirm(t('resetConfirm'))) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleShare = async () => {
    const accuracy = Math.round((gameState.correctAnswers / Math.max(1, gameState.questionsAnswered)) * 100);
    const text = t('shareText')
      .replace('{score}', gameState.score.toString())
      .replace('{accuracy}', accuracy.toString());
    const url = window.location.origin + window.location.pathname;

    if (navigator.share) {
      try { await navigator.share({ title: 'TAP FOOTBALL 2026', text: text, url: url }); } catch (err) { console.error('Share failed:', err); }
    } else {
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text + " " + url)}`;
      window.open(shareUrl, '_blank');
      navigator.clipboard.writeText(`${text} ${url}`);
      alert(t('copied'));
    }
  };

  const handleExitGame = () => {
    if (window.confirm(t('quitConfirm'))) {
      setStep('HOME');
      setQuestions([]);
      setIsPaused(false);
    }
  };

  const t = (key: keyof typeof TRANSLATIONS) => TRANSLATIONS[key][gameState.language];
  const isWin = gameState.questionsAnswered >= 30 && gameState.mistakes < 5;
  const accuracyPercent = Math.round((gameState.correctAnswers / Math.max(1, gameState.questionsAnswered)) * 100);

  return (
    <div className="flex-1 flex flex-col h-full grass-pattern relative overflow-hidden" onClick={handleInteraction}>
      <AnimatePresence>
        {unlockedToast && (
          <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm pointer-events-none">
            <div className="bg-emerald-500 rounded-2xl p-4 shadow-[0_20px_40px_rgba(16,185,129,0.4)] border border-emerald-400 flex items-center space-x-4">
              <span className="text-3xl shrink-0">{unlockedToast.icon}</span>
              <div>
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">{t('unlockedToast')}</p>
                <p className="text-sm font-bold uppercase">{unlockedToast.name[gameState.language]}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'HOME' ? (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 safe-pt safe-pb">
            <div className="mb-6 md:mb-10 flex flex-col items-center">
              <div className="flex gap-3 bg-white/5 backdrop-blur-xl p-1.5 rounded-full border border-white/10 mb-6">
                {(Object.keys(LANGUAGE_FLAGS) as Language[]).map(lang => (
                  <button key={lang} onClick={(e) => { e.stopPropagation(); setGameState(prev => ({ ...prev, language: lang })); }} className={`w-10 h-10 flex items-center justify-center rounded-full text-xl transition-all ${gameState.language === lang ? 'bg-white/10 scale-110 drop-shadow-xl' : 'opacity-40 grayscale'}`}>{LANGUAGE_FLAGS[lang]}</button>
                ))}
              </div>
              <motion.img initial={{ scale: 0 }} animate={{ scale: 1 }} src={GAME_LOGO} className="w-14 h-14 md:w-20 md:h-20 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]" />
              <motion.h1 className="text-4xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9] text-center mb-2 drop-shadow-2xl mobile-title">TAP FOOTBALL<br/><span className="text-emerald-500">2026</span></motion.h1>
              <motion.p className="text-[10px] md:text-xs font-bold text-white/40 tracking-[0.3em] uppercase">{t('subTitle')}</motion.p>
            </div>

            <div className="w-full max-w-[320px] space-y-3 md:space-y-4 mobile-compact">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep('LEVEL_SELECT')} className="w-full h-16 md:h-20 bg-emerald-500 text-white font-black rounded-2xl md:rounded-3xl shadow-[0_15px_40px_rgba(16,185,129,0.3)] uppercase text-sm md:text-base tracking-[0.2em] btn-glow">{t('startGame')}</motion.button>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowLeaderboard(true)} className="h-14 md:h-16 bg-white/5 border border-white/10 text-white/60 font-black rounded-xl md:rounded-2xl uppercase text-[10px] tracking-widest backdrop-blur-md">🏆 RANK</button>
                <button onClick={() => setShowTrophyRoom(true)} className="h-14 md:h-16 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-black rounded-xl md:rounded-2xl uppercase text-[10px] tracking-widest backdrop-blur-md">🏅 ROOM</button>
              </div>
              <button onClick={() => window.location.reload()} className="w-full h-12 md:h-14 bg-rose-500/10 border border-rose-500/20 text-rose-500 font-black rounded-xl md:rounded-2xl uppercase text-[10px] tracking-widest backdrop-blur-md">{t('exit')}</button>
            </div>

            <button onClick={toggleMute} className="mt-8 text-sm p-3 bg-black/40 rounded-full border border-white/10 backdrop-blur-md w-12 h-12 flex items-center justify-center">{isMuted ? '🔇' : '🔊'}</button>
          </motion.div>
        ) : step === 'LEVEL_SELECT' ? (
          <motion.div key="level-select" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col items-center p-4 md:p-8 safe-pt safe-pb overflow-y-auto">
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter my-8">{t('pickLevel')}</h2>
            <div className="w-full max-w-sm space-y-3 md:space-y-4 mb-10">
              {levels.map(level => (
                <motion.div key={level.id} onClick={() => level.unlocked && (setGameState(prev => ({...prev, currentLevel: level.id})), setStep(gameState.nickname ? 'CATEGORY_SELECT' : 'NICKNAME_INPUT'))} className={`p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border transition-all cursor-pointer flex justify-between items-center ${level.unlocked ? 'bg-black/40 border-emerald-500/30 active:scale-95' : 'bg-black/20 border-white/5 opacity-40 grayscale'}`}>
                  <div><span className="text-white/30 text-[9px] md:text-[10px] font-black uppercase block mb-1">LVL {level.id}</span><h3 className="text-xl md:text-3xl font-black uppercase">{level.name[gameState.language]}</h3></div>
                  {level.unlocked ? <span className="text-emerald-500 font-black text-sm md:text-base">GO →</span> : <span className="text-lg">🔒</span>}
                </motion.div>
              ))}
            </div>
            <button onClick={() => setStep('HOME')} className="mt-auto mb-4 text-[11px] md:text-xs font-black text-white/30 uppercase tracking-[0.4em] py-4 px-8 active:text-white">{t('back')}</button>
          </motion.div>
        ) : step === 'NICKNAME_INPUT' ? (
          <motion.div key="nick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-4 safe-pt safe-pb">
            <div className="bg-black/60 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border border-white/10 w-full max-w-[360px] text-center shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-black mb-8 uppercase tracking-tighter">{t('enterNickname')}</h2>
              <input type="text" value={gameState.nickname} placeholder="Messi10..." onChange={(e) => setGameState(p => ({...p, nickname: e.target.value.substring(0, 15)}))} className="w-full h-16 md:h-20 bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl px-6 text-white text-xl font-bold mb-8 focus:outline-none focus:border-emerald-500 text-center placeholder:text-white/10" />
              <button onClick={() => setStep('CATEGORY_SELECT')} disabled={!gameState.nickname.trim()} className="w-full h-16 md:h-20 bg-emerald-500 font-black rounded-2xl md:rounded-3xl uppercase text-sm tracking-widest disabled:opacity-20 active:scale-95 transition-all">{t('start')}</button>
            </div>
          </motion.div>
        ) : step === 'CATEGORY_SELECT' ? (
          <motion.div key="cat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center p-4 md:p-8 safe-pt safe-pb overflow-y-auto">
             <h2 className="text-2xl md:text-4xl font-black my-8 uppercase tracking-tighter text-white/50">{t('selectCategory')}</h2>
             <div className="grid grid-cols-2 gap-3 md:gap-5 w-full max-w-[400px] mb-10">
                {Object.values(Category).map(cat => (
                  <button key={cat} onClick={() => handleStartQuiz(cat)} className={`h-24 md:h-32 p-4 rounded-2xl md:rounded-3xl border font-black text-[10px] md:text-[12px] uppercase tracking-widest flex items-center justify-center text-center leading-tight transition-all active:scale-95 ${cat === Category.ALL ? 'bg-emerald-500 border-emerald-400 col-span-2 text-white' : 'bg-black/40 border-white/10 text-white/60 hover:text-white hover:border-white/30'}`}>{CATEGORY_TRANSLATIONS[cat][gameState.language]}</button>
                ))}
             </div>
             <button onClick={() => setStep('LEVEL_SELECT')} className="mt-auto mb-4 text-[11px] md:text-xs font-black text-white/30 uppercase tracking-[0.4em] py-4 px-8">{t('back')}</button>
          </motion.div>
        ) : (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col w-full max-w-xl mx-auto safe-pt safe-pb h-full">
            {gameState.isGameOver ? (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-4">
                <div className={`bg-black/90 backdrop-blur-3xl p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border ${isWin ? 'border-emerald-500/40 shadow-[0_0_80px_rgba(16,185,129,0.15)]' : 'border-rose-500/40 shadow-[0_0_80px_rgba(244,63,94,0.15)]'} text-center w-full max-w-[400px] shadow-2xl relative overflow-hidden`}>
                  <motion.img initial={{ scale: 0 }} animate={{ scale: 1 }} src={GAME_LOGO} className="w-12 h-12 md:w-16 mx-auto mb-6 relative z-10" />
                  <h1 className={`text-3xl md:text-5xl font-black mb-6 uppercase tracking-tighter leading-none ${isWin ? 'text-emerald-400' : 'text-rose-500'}`}>{isWin ? t('success') : t('gameOver')}</h1>
                  <div className="grid grid-cols-2 gap-3 mb-10">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><span className="text-[8px] font-black text-white/30 uppercase block mb-1">{t('totalScoreLabel')}</span><p className="text-2xl font-black text-white">{gameState.score}</p></div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><span className="text-[8px] font-black text-white/30 uppercase block mb-1">{t('accuracyLabel')}</span><p className={`text-2xl font-black ${accuracyPercent > 80 ? 'text-emerald-400' : 'text-yellow-400'}`}>{accuracyPercent}%</p></div>
                  </div>
                  <div className="space-y-3">
                    <button onClick={() => setStep('HOME')} className="w-full h-16 bg-emerald-500 font-black rounded-2xl uppercase text-xs tracking-widest active:scale-95 transition-all">{t('playAgain')}</button>
                    <button onClick={handleShare} className="w-full h-14 bg-white/10 border border-white/10 text-white font-black rounded-xl uppercase text-[10px] tracking-widest active:bg-white/20 transition-all flex items-center justify-center gap-2">📤 {t('shareBtn')}</button>
                    <button onClick={() => handleStartQuiz(gameState.selectedCategory)} className="w-full h-12 text-white/40 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">{t('retry')}</button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col p-4">
                <header className="flex justify-between items-center mb-4 bg-black/40 p-3 md:p-4 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 backdrop-blur-xl shrink-0">
                   <button onClick={() => setIsPaused(true)} className="w-10 h-10 md:w-12 md:h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-sm active:scale-90 transition-transform">⏸</button>
                   <div className="text-center">
                     <p className="text-white/30 text-[8px] font-black uppercase mb-0.5">LVL {gameState.currentLevel} • {gameState.score}</p>
                     <div className="flex gap-0.5">{[...Array(5)].map((_, i) => (<span key={i} className={`text-xs ${i >= (5 - gameState.mistakes) ? 'opacity-20 grayscale' : 'drop-shadow-glow'}`}>❤️</span>))}</div>
                   </div>
                   <div className="text-right">
                     <p className="text-white/30 text-[8px] font-black uppercase mb-0.5">Q {gameState.questionsAnswered + 1}/30</p>
                     <div className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${streak >= 5 ? 'bg-orange-500 text-white animate-pulse' : 'bg-white/10 text-white/30'}`}>x{streak}</div>
                   </div>
                </header>

                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-6 shrink-0"><motion.div className="h-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${(gameState.questionsAnswered / 30) * 100}%` }} transition={{ duration: 0.5 }} /></div>

                <div className="flex-1 flex flex-col justify-center min-h-0">
                  <AnimatePresence mode="wait">
                    {loading && questions.length <= currentQuestionIndex ? (
                      <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center space-y-6">
                        <div className="relative"><div className="w-20 h-20 border-4 border-emerald-500/10 rounded-full" /><div className="absolute top-0 w-20 h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
                        <p className="text-emerald-500 font-black text-xs uppercase tracking-[0.5em] animate-pulse">{t('generating')}</p>
                      </motion.div>
                    ) : questions[currentQuestionIndex] ? (
                      <div className="w-full max-h-full overflow-y-auto custom-scrollbar">
                        <QuizCard key={questions[currentQuestionIndex].id} question={questions[currentQuestionIndex]} onAnswer={handleAnswer} disabled={isPaused} isMuted={isMuted} language={gameState.language} isPaused={isPaused} />
                      </div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPaused && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6" onClick={() => setIsPaused(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-black/40 border border-white/10 w-full max-w-[320px] rounded-[3rem] p-10 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
               <span className="text-5xl block mb-6">⚽</span>
               <h3 className="text-2xl font-black uppercase mb-10 tracking-tighter">PAUSED</h3>
               <div className="space-y-4">
                 <button onClick={() => setIsPaused(false)} className="w-full h-16 bg-emerald-500 text-white font-black rounded-2xl uppercase text-sm tracking-widest active:scale-95 transition-all">{t('resume')}</button>
                 <button onClick={handleExitGame} className="w-full h-14 bg-rose-500/20 border border-rose-500/30 text-rose-500 font-black rounded-xl uppercase text-[10px] tracking-widest active:scale-95 transition-all">{t('exit')}</button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLeaderboard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 safe-pt safe-pb" onClick={() => setShowLeaderboard(false)}>
            <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="bg-black/60 border border-white/10 w-full max-w-[360px] rounded-[2.5rem] p-8 max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-center text-white font-black text-xl uppercase mb-8 tracking-tighter">{t('leaderboard')}</h3>
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar mb-8 space-y-3">
                {leaderboard.map((user, i) => (
                  <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${user.isUser ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center space-x-3"><span className="font-black text-[10px] w-4 opacity-30">{i + 1}.</span><span className="font-bold text-sm">{user.name}</span><span className="text-xs">{user.country}</span></div>
                    <span className="text-emerald-400 font-black text-sm">{user.score}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowLeaderboard(false)} className="w-full h-14 bg-white text-black font-black rounded-2xl uppercase text-xs tracking-widest active:scale-95 shrink-0 transition-all">{t('close')}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTrophyRoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 safe-pt safe-pb" onClick={() => setShowTrophyRoom(false)}>
            <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="bg-black/60 border border-yellow-500/20 w-full max-w-[400px] rounded-[2.5rem] p-8 max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-8 shrink-0"><span className="text-5xl block mb-2">🏆</span><h3 className="text-white font-black text-xl uppercase tracking-tighter">{t('trophyRoom')}</h3></div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mb-8">
                <div className="grid grid-cols-2 gap-3">
                  {ACHIEVEMENTS.map((ach) => {
                    const isUnlocked = userStats.unlockedAchievements.includes(ach.id);
                    return (
                      <div key={ach.id} className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-all ${isUnlocked ? 'bg-yellow-500/10 border-yellow-500/30 shadow-xl scale-100' : 'bg-white/5 border-white/5 opacity-40 grayscale scale-95'}`}>
                        <span className="text-4xl mb-3">{ach.icon}</span>
                        <p className="text-[10px] font-black uppercase mb-2 leading-tight h-6 flex items-center">{ach.name[gameState.language]}</p>
                        <p className="text-[8px] font-medium text-white/40 leading-tight h-8 flex items-center justify-center">{ach.description[gameState.language]}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-4 shrink-0">
                <button onClick={resetAllProgress} className="w-full h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 font-black rounded-xl uppercase text-[9px] tracking-widest hover:bg-rose-500/20 active:scale-95 transition-all">{t('resetData')}</button>
                <button onClick={() => setShowTrophyRoom(false)} className="w-full h-14 bg-white text-black font-black rounded-2xl uppercase text-xs tracking-widest active:scale-95 transition-all">{t('close')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="py-6 text-center mt-auto safe-pb shrink-0">
        <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.5em] mb-1">TAP FOOTBALL QUIZ 2026</p>
        <p className="text-[7px] font-medium text-white/5 uppercase tracking-widest">© 2026 tapfootball@gmail.com</p>
      </footer>
    </div>
  );
};

export default App;
