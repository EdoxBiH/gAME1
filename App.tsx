
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category, Question, GameState, LevelConfig, Language, LeaderboardEntry, Achievement, UserStats } from './types';
import { generateQuestions } from './services/geminiService';
import { audioService } from './services/audioService';
import QuizCard from './components/QuizCard';

const INITIAL_LEVELS: LevelConfig[] = [
  { id: 1, name: { Bosanski: "Početnik", English: "Beginner", Deutsch: "Anfänger" }, minDifficulty: 1, maxDifficulty: 3, questionsPerLevel: 20, unlocked: true },
  { id: 2, name: { Bosanski: "Ekspert", English: "Expert", Deutsch: "Experte" }, minDifficulty: 4, maxDifficulty: 7, questionsPerLevel: 20, unlocked: false },
  { id: 3, name: { Bosanski: "Legenda", English: "Legend", Deutsch: "Legende" }, minDifficulty: 8, maxDifficulty: 10, questionsPerLevel: 20, unlocked: false },
];

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_goal', icon: '⚽', name: { Bosanski: "Prvi Gol", English: "First Goal", Deutsch: "Erstes Tor" }, description: { Bosanski: "Odgovori na 1 pitanje tačno", English: "Answer 1 question correctly", Deutsch: "Beantworten Sie 1 Frage richtig" }, requirement: 1, type: 'total_correct' },
  { id: 'hattrick', icon: '🎩', name: { Bosanski: "Hattrick", English: "Hattrick", Deutsch: "Hattrick" }, description: { Bosanski: "Niz od 3 tačna odgovora", English: "Get a 3-streak", Deutsch: "Erhalten Sie eine 3er-Serie" }, requirement: 3, type: 'streak' },
  { id: 'streak_master', icon: '🔥', name: { Bosanski: "Gospodar Niza", English: "Streak Master", Deutsch: "Serienmeister" }, description: { Bosanski: "Niz od 10 tačnih odgovora", English: "Get a 10-streak", Deutsch: "Erhalten Sie eine 10er-Serie" }, requirement: 10, type: 'streak' },
  { id: 'centurion', icon: '💯', name: { Bosanski: "Stotka", English: "Centurion", Deutsch: "Hundert" }, description: { Bosanski: "100 tačnih odgovora ukupno", English: "100 total correct answers", Deutsch: "100 insgesamt richtige Antworten" }, requirement: 100, type: 'total_correct' },
  { id: 'high_score_1', icon: '🚀', name: { Bosanski: "Visoki Rezultat", English: "High Score I", Deutsch: "High Score I" }, description: { Bosanski: "Ostvari 2500 bodova u jednoj igri", English: "Reach 2500 points in one game", Deutsch: "Erreiche 2500 Punkte in einem Spiel" }, requirement: 2500, type: 'high_score' },
  { id: 'high_score_2', icon: '🌠', name: { Bosanski: "Rekorder", English: "Record Breaker", Deutsch: "Rekordbrecher" }, description: { Bosanski: "Ostvari 5000 bodova u jednoj igri", English: "Reach 5000 points in one game", Deutsch: "Erreiche 5000 Punkte in einem Spiel" }, requirement: 5000, type: 'high_score' },
  { id: 'master_players', icon: '🏃‍♂️', name: { Bosanski: "Ekspert za Igrače", English: "Player Expert", Deutsch: "Spieler-Experte" }, description: { Bosanski: "20 tačnih odgovora u kategoriji Igrači", English: "20 correct answers in Players category", Deutsch: "20 richtige Antworten in der Kategorie Spieler" }, requirement: 20, type: 'category_mastery', category: Category.PLAYERS },
  { id: 'master_clubs', icon: '🛡️', name: { Bosanski: "Ekspert za Klubove", English: "Club Expert", Deutsch: "Vereins-Experte" }, description: { Bosanski: "20 tačnih odgovora u kategoriji Klubovi", English: "20 correct answers in Clubs category", Deutsch: "20 richtige Antworten in der Kategorie Vereine" }, requirement: 20, type: 'category_mastery', category: Category.CLUBS },
  { id: 'master_stadiums', icon: '🏟️', name: { Bosanski: "Ekspert za Stadione", English: "Stadium Expert", Deutsch: "Stadion-Experte" }, description: { Bosanski: "20 tačnih odgovora u kategoriji Stadioni", English: "20 correct answers in Stadiums category", Deutsch: "20 richtige Antworten in der Kategorie Stadien" }, requirement: 20, type: 'category_mastery', category: Category.STADIUMS },
  { id: 'perfectionist', icon: '💎', name: { Bosanski: "Perfekcionista", English: "Perfectionist", Deutsch: "Perfektionist" }, description: { Bosanski: "Završi 20 pitanja bez greške", English: "Finish 20 questions with 0 mistakes", Deutsch: "Beende 20 Fragen ohne Fehler" }, requirement: 1, type: 'perfect_game' },
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
  exit: { Bosanski: "IZAĐI", English: "EXIT", Deutsch: "BEENDEN" },
  quitConfirm: { Bosanski: "Želite li prekinuti igru?", English: "Do you want to quit?", Deutsch: "Möchten Sie das Spiel beenden?" },
  resetData: { Bosanski: "RESTARTUJ NAPREDAK", English: "RESET PROGRESS", Deutsch: "FORTSCHRITT LÖSCHEN" },
  resetConfirm: { Bosanski: "Ovo će obrisati sve trofeje i nivoe. Sigurno?", English: "This will erase all trophies and levels. Sure?", Deutsch: "Dies loescht alle Trophaeen und Levels. Sicher?" },
  categoriesDone: { Bosanski: "Kategorije: {done}/6", English: "Categories: {done}/6", Deutsch: "Kategorien: {done}/6" }
};

const CATEGORY_VISUALS: Record<Category, { icon: string }> = {
  [Category.PLAYERS]: { icon: '🏃‍♂️' },
  [Category.STADIUMS]: { icon: '🏟️' },
  [Category.CLUBS]: { icon: '🛡️' },
  [Category.NATIONAL_TEAMS]: { icon: '🌍' },
  [Category.COACHES]: { icon: '📋' },
  [Category.ALL]: { icon: '⚽' },
};

const LANGUAGE_THEMES: Record<Language, { gradient: string, glow: string, accent: string }> = {
  'Bosanski': { 
    gradient: 'from-blue-600/30 via-blue-900/50 to-yellow-500/10', 
    glow: 'shadow-blue-500/20',
    accent: 'border-blue-500/30'
  },
  'English': { 
    gradient: 'from-rose-600/30 via-slate-900/50 to-blue-600/10', 
    glow: 'shadow-rose-500/20',
    accent: 'border-rose-500/30'
  },
  'Deutsch': { 
    gradient: 'from-yellow-600/30 via-rose-900/50 to-zinc-900/60', 
    glow: 'shadow-yellow-500/20',
    accent: 'border-yellow-500/30'
  }
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
    return saved ? JSON.parse(saved) : [];
  });
  const [userStats, setUserStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('quiz_user_stats');
    return saved ? JSON.parse(saved) : { 
      totalPoints: 0, totalCorrect: 0, totalAnswered: 0, maxStreak: 0, 
      levelsCompleted: [], unlockedAchievements: [], categoryCorrect: {},
      completedLevelCategories: {} 
    };
  });

  const [gameState, setGameState] = useState<GameState>(() => {
    const savedLang = localStorage.getItem('quiz_language') as Language;
    return {
      nickname: localStorage.getItem('quiz_nickname') || '',
      currentLevel: 1,
      selectedCategory: Category.ALL,
      score: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      mistakes: 0,
      isGameOver: false,
      language: ['Bosanski', 'English', 'Deutsch'].includes(savedLang) ? savedLang : 'English',
      history: [],
    };
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

  useEffect(() => {
    localStorage.setItem('quiz_language', gameState.language);
  }, [gameState.language]);

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

  const checkAchievements = useCallback((newStats: UserStats, currentStreak: number, currentScore: number, isPerfect: boolean = false) => {
    const newUnlocks: string[] = [];
    ACHIEVEMENTS.forEach(ach => {
      if (newStats.unlockedAchievements.includes(ach.id)) return;
      
      let condition = false;
      if (ach.type === 'total_correct') condition = newStats.totalCorrect >= ach.requirement;
      if (ach.type === 'streak') condition = currentStreak >= ach.requirement;
      if (ach.type === 'perfect_game') condition = isPerfect;
      if (ach.type === 'level_completed') condition = newStats.levelsCompleted.includes(ach.requirement);
      if (ach.type === 'high_score') condition = currentScore >= ach.requirement;
      if (ach.type === 'category_mastery' && ach.category) {
        condition = (newStats.categoryCorrect[ach.category] || 0) >= ach.requirement;
      }

      if (condition) {
        newUnlocks.push(ach.id);
        setUnlockedToast(ach);
        audioService.playSfx('correct', 1, true);
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
      audioService.unlock();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleInteraction();
    const newMute = !isMuted;
    setIsMuted(newMute);
  };

  const fetchBatch = useCallback(async (level: number, category: Category, lang: Language, progress: number, history: string[]) => {
    setLoading(true);
    const config = levels.find(l => l.id === level) || levels[0];
    const progressRatio = progress / 20;
    const dynamicDiff = Math.min(
      config.maxDifficulty,
      Math.max(config.minDifficulty, Math.round(config.minDifficulty + (config.maxDifficulty - config.minDifficulty) * progressRatio))
    );

    const result = await generateQuestions(category, dynamicDiff, lang, 5, history);
    setQuestions(prev => [...prev, ...result.questions]);
    setLoading(false);
  }, [levels]);

  useEffect(() => {
    if (step === 'QUIZ' && questions.length - currentQuestionIndex < 3 && gameState.questionsAnswered < 20 && !gameState.isGameOver) {
      const historyIds = gameState.history.map(h => h.questionId);
      const currentIds = questions.map(q => q.id);
      fetchBatch(gameState.currentLevel, gameState.selectedCategory, gameState.language, gameState.questionsAnswered, [...historyIds, ...currentIds]);
    }
  }, [step, questions.length, currentQuestionIndex, gameState.currentLevel, gameState.selectedCategory, gameState.language, gameState.questionsAnswered, gameState.isGameOver, fetchBatch]);

  const handleStartQuiz = (category: Category) => {
    handleInteraction();
    audioService.playSfx('playAgain', 0.6, true);
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
    const isOver = (gameState.questionsAnswered + 1 >= 20) || newMistakes >= 5;
    const finalScore = gameState.score + points;

    const updatedStats = {
      ...userStats,
      totalPoints: userStats.totalPoints + points,
      totalCorrect: isCorrect ? userStats.totalCorrect + 1 : userStats.totalCorrect,
      totalAnswered: userStats.totalAnswered + 1,
      maxStreak: Math.max(userStats.maxStreak, newStreak),
      categoryCorrect: {
        ...userStats.categoryCorrect,
        [currentQ.category]: (userStats.categoryCorrect[currentQ.category] || 0) + (isCorrect ? 1 : 0)
      }
    };
    
    if (isOver) {
      const isPerfect = newMistakes === 0 && (gameState.questionsAnswered + 1 >= 20);
      const isSuccess = (gameState.questionsAnswered + 1 >= 20) && newMistakes < 5;

      if (isSuccess) {
        // Track completed categories for current level
        const currentLevelCats = updatedStats.completedLevelCategories[gameState.currentLevel] || [];
        if (!currentLevelCats.includes(gameState.selectedCategory)) {
          const newLevelCats = [...currentLevelCats, gameState.selectedCategory];
          updatedStats.completedLevelCategories = {
            ...updatedStats.completedLevelCategories,
            [gameState.currentLevel]: newLevelCats
          };

          // Check if ALL categories (6 total) are finished
          const totalCategories = Object.keys(Category).length;
          if (newLevelCats.length === totalCategories) {
            updatedStats.levelsCompleted = [...new Set([...updatedStats.levelsCompleted, gameState.currentLevel])];
            
            // Unlock next level visually
            setLevels(prev => prev.map(l => l.id === gameState.currentLevel + 1 ? {...l, unlocked: true} : l));
          }
        }
      }
      
      checkAchievements(updatedStats, newStreak, finalScore, isPerfect);
      
      setLeaderboard(prev => {
        const updated = [...prev, { name: gameState.nickname || 'Player', score: finalScore, country: LANGUAGE_FLAGS[gameState.language], timestamp: Date.now(), isUser: true }].sort((a, b) => b.score - a.score).slice(0, 20);
        localStorage.setItem('quiz_leaderboard', JSON.stringify(updated));
        return updated;
      });
    } else {
      checkAchievements(updatedStats, newStreak, finalScore, false);
    }

    setUserStats(updatedStats);
    setGameState(prev => ({
      ...prev,
      score: finalScore,
      questionsAnswered: prev.questionsAnswered + 1,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      mistakes: newMistakes,
      isGameOver: isOver,
      history: [...prev.history, { questionId: currentQ.id, isCorrect }]
    }));

    setStreak(newStreak);
    if (!isOver) setCurrentQuestionIndex(prev => prev + 1);
  };

  const resetAllProgress = () => {
    if (window.confirm(t('resetConfirm'))) {
      audioService.playSfx('exit', 0.5, true);
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleShare = async () => {
    audioService.playSfx('click', 0.4);
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
    audioService.playSfx('exit', 0.6, true);
    setGameState(prev => ({
      ...prev,
      score: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      mistakes: 0,
      isGameOver: false,
      history: []
    }));
    setStep('HOME');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setStreak(0);
    setIsPaused(false);
  };

  const t = (key: keyof typeof TRANSLATIONS) => {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    return entry[gameState.language] || entry['English'] || key;
  };

  const isWin = gameState.questionsAnswered >= 20 && gameState.mistakes < 5;
  const accuracyPercent = Math.round((gameState.correctAnswers / Math.max(1, gameState.questionsAnswered)) * 100);

  const langTheme = LANGUAGE_THEMES[gameState.language];

  return (
    <div className="flex-1 flex flex-col h-full grass-pattern relative overflow-hidden" onClick={handleInteraction}>
      <AnimatePresence>
        {unlockedToast && (
          <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm pointer-events-none">
            <div className="bg-emerald-500 rounded-2xl p-4 shadow-[0_20px_40px_rgba(16,185,129,0.4)] border border-emerald-400 flex items-center space-x-4">
              <span className="text-2xl md:text-3xl shrink-0">{unlockedToast.icon}</span>
              <div>
                <p className="text-[9px] md:text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">{t('unlockedToast')}</p>
                <p className="text-xs md:text-sm font-bold uppercase">{unlockedToast.name[gameState.language] || unlockedToast.name['English']}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'HOME' ? (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 safe-pt safe-pb">
            <div className="mb-4 md:mb-10 flex flex-col items-center w-full max-w-md">
              <div className="flex gap-2 bg-white/5 backdrop-blur-xl p-1 rounded-full border border-white/10 mb-6 scale-90 md:scale-100">
                {(Object.keys(LANGUAGE_FLAGS) as Language[]).map(lang => (
                  <button key={lang} onClick={(e) => { e.stopPropagation(); audioService.playSfx('click', 0.3); handleInteraction(); setGameState(prev => ({ ...prev, language: lang })); }} className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full text-lg transition-all ${gameState.language === lang ? 'bg-white/10 scale-110 border-white/20' : 'opacity-40 grayscale'}`}>{LANGUAGE_FLAGS[lang]}</button>
                ))}
              </div>
              <motion.img initial={{ scale: 0 }} animate={{ scale: 1 }} src={GAME_LOGO} className="mobile-logo w-14 h-14 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]" />
              <motion.h1 className="mobile-title text-4xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9] text-center mb-1 drop-shadow-2xl">TAP FOOTBALL<br/><span className="text-emerald-500">2026</span></motion.h1>
              <motion.p className="text-[9px] md:text-xs font-bold text-white/30 tracking-[0.2em] uppercase text-center">{t('subTitle')}</motion.p>
            </div>

            <div className="w-full max-w-[300px] md:max-w-[340px] space-y-2 md:space-y-4 mobile-compact">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { handleInteraction(); audioService.playSfx('playAgain', 0.5, true); setStep('LEVEL_SELECT'); }} className="mobile-btn-height w-full h-14 md:h-20 bg-emerald-500 text-white font-black rounded-2xl md:rounded-3xl shadow-[0_15px_40px_rgba(16,185,129,0.3)] uppercase text-sm md:text-base tracking-[0.2em] btn-glow">{t('startGame')}</motion.button>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <button onClick={() => { handleInteraction(); audioService.playSfx('click', 0.3); setShowLeaderboard(true); }} className="h-12 md:h-16 bg-white/5 border border-white/10 text-white/60 font-black rounded-xl md:rounded-2xl uppercase text-[9px] md:text-[10px] tracking-widest backdrop-blur-md">🏆 RANK</button>
                <button onClick={() => { handleInteraction(); audioService.playSfx('click', 0.3); setShowTrophyRoom(true); }} className="h-12 md:h-16 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-black rounded-xl md:rounded-2xl uppercase text-[9px] md:text-[10px] tracking-widest backdrop-blur-md">🏅 ROOM</button>
              </div>
            </div>

            <button onClick={toggleMute} className="mt-6 md:mt-8 text-sm p-3 bg-black/40 rounded-full border border-white/10 backdrop-blur-md w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">{isMuted ? '🔇' : '🔊'}</button>
          </motion.div>
        ) : step === 'LEVEL_SELECT' ? (
          <motion.div key="level-select" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col items-center p-4 md:p-8 safe-pt safe-pb overflow-y-auto custom-scrollbar">
            <h2 className="text-xl md:text-4xl font-black uppercase tracking-tighter my-6 md:my-8">{t('pickLevel')}</h2>
            <div className="w-full max-w-sm space-y-2 md:space-y-4 mb-10">
              {levels.map(level => {
                const completedCatsCount = (userStats.completedLevelCategories[level.id] || []).length;
                return (
                  <motion.div 
                    key={level.id} 
                    onClick={() => { if(level.unlocked) { audioService.playSfx('click', 0.4); setGameState(prev => ({...prev, currentLevel: level.id})); setStep(gameState.nickname ? 'CATEGORY_SELECT' : 'NICKNAME_INPUT'); } }} 
                    className={`p-4 md:p-8 rounded-[1.2rem] md:rounded-[2.5rem] border transition-all cursor-pointer flex justify-between items-center relative overflow-hidden ${level.unlocked ? 'bg-black/40 border-emerald-500/30 active:scale-95' : 'bg-black/20 border-white/5 opacity-40 grayscale'}`}
                  >
                    <div>
                      <span className="text-white/30 text-[8px] md:text-[10px] font-black uppercase block mb-0.5">LVL {level.id}</span>
                      <h3 className="text-lg md:text-3xl font-black uppercase">{level.name[gameState.language] || level.name['English']}</h3>
                      <p className="text-[9px] md:text-xs text-white/50 font-bold uppercase mt-1">
                        {t('categoriesDone').replace('{done}', completedCatsCount.toString())}
                      </p>
                    </div>
                    {level.unlocked ? <span className="text-emerald-500 font-black text-xs md:text-base">GO →</span> : <span className="text-sm md:text-lg">🔒</span>}
                    
                    <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full">
                      <motion.div className="h-full bg-emerald-500/40" initial={{ width: 0 }} animate={{ width: `${(completedCatsCount / 6) * 100}%` }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <button onClick={() => { audioService.playSfx('exit', 0.5, true); setStep('HOME'); }} className="mt-auto mb-4 text-[10px] md:text-xs font-black text-white/30 uppercase tracking-[0.4em] py-3 px-8 active:text-white">{t('back')}</button>
          </motion.div>
        ) : step === 'NICKNAME_INPUT' ? (
          <motion.div key="nick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-4 safe-pt safe-pb">
            <div className="bg-black/60 backdrop-blur-2xl p-6 md:p-12 rounded-[2rem] md:rounded-[4rem] border border-white/10 w-full max-w-[340px] text-center shadow-2xl">
              <h2 className="text-xl md:text-3xl font-black mb-6 md:mb-8 uppercase tracking-tighter">{t('enterNickname')}</h2>
              <input type="text" value={gameState.nickname} placeholder="Messi10..." onChange={(e) => setGameState(p => ({...p, nickname: e.target.value.substring(0, 15)}))} className="w-full h-14 md:h-20 bg-white/5 border border-white/10 rounded-xl md:rounded-3xl px-6 text-white text-lg md:text-xl font-bold mb-6 md:mb-8 focus:outline-none focus:border-emerald-500 text-center placeholder:text-white/10" />
              <button onClick={() => { audioService.playSfx('click', 0.4); setStep('CATEGORY_SELECT'); }} disabled={!gameState.nickname.trim()} className="w-full h-14 md:h-20 bg-emerald-500 font-black rounded-xl md:rounded-3xl uppercase text-xs md:text-sm tracking-widest disabled:opacity-20 active:scale-95 transition-all">{t('start')}</button>
            </div>
          </motion.div>
        ) : step === 'CATEGORY_SELECT' ? (
          <motion.div key="cat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center p-4 md:p-8 safe-pt safe-pb overflow-y-auto custom-scrollbar">
             <h2 className="text-xl md:text-4xl font-black my-6 md:my-8 uppercase tracking-tighter text-white/40">{t('selectCategory')}</h2>
             <div className="grid grid-cols-2 gap-3 md:gap-6 w-full max-w-[500px] mb-12 px-2">
                {Object.values(Category).map((cat, index) => {
                  const isAll = cat === Category.ALL;
                  const isDoneInCurrentLevel = (userStats.completedLevelCategories[gameState.currentLevel] || []).includes(cat);
                  const icon = CATEGORY_VISUALS[cat].icon;
                  
                  return (
                    <motion.div
                      key={cat}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, type: 'spring', damping: 20 }}
                      whileHover={{ scale: 1.05, translateY: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleStartQuiz(cat)}
                      className={`group relative overflow-hidden cursor-pointer rounded-2xl md:rounded-[2.5rem] border-2 shadow-xl backdrop-blur-3xl p-4 md:p-8 transition-shadow ${
                        isAll 
                        ? `col-span-2 bg-gradient-to-br ${langTheme.gradient} border-white/20 shadow-lg ${langTheme.glow}` 
                        : `bg-black/40 ${langTheme.accent} hover:border-white/40 shadow-md ${langTheme.glow}`
                      }`}
                    >
                      {/* Animated language-themed background layer */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${langTheme.gradient} opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />
                      
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <span className="text-4xl sm:text-5xl md:text-7xl mb-4 transform transition-transform duration-500 group-hover:rotate-12 group-hover:scale-125 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                          {icon}
                        </span>
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-[10px] sm:text-xs md:text-sm font-black tracking-[0.2em] uppercase leading-none ${isAll ? 'text-white drop-shadow-md' : 'text-white/70 group-hover:text-white transition-colors'}`}>
                            {CATEGORY_TRANSLATIONS[cat][gameState.language] || CATEGORY_TRANSLATIONS[cat]['English']}
                          </span>
                          {isDoneInCurrentLevel && (
                            <motion.span 
                              initial={{ opacity: 0, scale: 0 }} 
                              animate={{ opacity: 1, scale: 1 }} 
                              className="text-emerald-400 text-[10px] md:text-sm font-bold flex items-center gap-1 mt-1"
                            >
                              <span className="bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">COMPLETED</span>
                            </motion.span>
                          )}
                        </div>
                      </div>
                      
                      {/* Dynamic light reflection */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </motion.div>
                  );
                })}
             </div>
             <button onClick={() => { audioService.playSfx('exit', 0.5, true); setStep('LEVEL_SELECT'); }} className="mt-auto mb-4 text-[10px] md:text-xs font-black text-white/30 uppercase tracking-[0.4em] py-3 px-8 hover:text-white transition-colors">{t('back')}</button>
          </motion.div>
        ) : (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col w-full max-w-xl mx-auto safe-pt safe-pb h-full overflow-hidden">
            {gameState.isGameOver ? (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-4">
                <div className={`bg-black/90 backdrop-blur-3xl p-6 md:p-12 rounded-[2rem] md:rounded-[4rem] border ${isWin ? 'border-emerald-500/40 shadow-[0_0_80px_rgba(16,185,129,0.15)]' : 'border-rose-500/40 shadow-[0_0_80px_rgba(244,63,94,0.15)]'} text-center w-full max-w-[360px] shadow-2xl relative overflow-hidden`}>
                  <motion.img initial={{ scale: 0 }} animate={{ scale: 1 }} src={GAME_LOGO} className="w-10 h-10 md:w-16 mx-auto mb-4 md:mb-6" />
                  <h1 className={`text-2xl md:text-5xl font-black mb-4 md:mb-6 uppercase tracking-tighter leading-none ${isWin ? 'text-emerald-400' : 'text-rose-500'}`}>{isWin ? t('success') : t('gameOver')}</h1>
                  <div className="grid grid-cols-2 gap-2 md:gap-3 mb-6 md:mb-10">
                    <div className="bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/5"><span className="text-[7px] md:text-[8px] font-black text-white/30 uppercase block mb-1">{t('totalScoreLabel')}</span><p className="text-xl md:text-2xl font-black text-white">{gameState.score}</p></div>
                    <div className="bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/5"><span className="text-[7px] md:text-[8px] font-black text-white/30 uppercase block mb-1">{t('accuracyLabel')}</span><p className={`text-xl md:text-2xl font-black ${accuracyPercent > 80 ? 'text-emerald-400' : 'text-yellow-400'}`}>{accuracyPercent}%</p></div>
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <button onClick={handleExitGame} className="w-full h-12 md:h-16 bg-emerald-500 font-black rounded-xl md:rounded-2xl uppercase text-[10px] md:text-xs tracking-widest active:scale-95 transition-all">{t('playAgain')}</button>
                    <button onClick={handleShare} className="w-full h-10 md:h-14 bg-white/10 border border-white/10 text-white font-black rounded-lg md:rounded-xl uppercase text-[9px] md:text-[10px] tracking-widest active:bg-white/20 transition-all flex items-center justify-center gap-2">📤 {t('shareBtn')}</button>
                    <button onClick={() => { audioService.playSfx('playAgain', 0.6, true); handleStartQuiz(gameState.selectedCategory); }} className="w-full h-10 text-white/40 font-black uppercase text-[9px] md:text-[10px] tracking-widest hover:text-white transition-colors">{t('retry')}</button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col p-3 md:p-4 h-full overflow-hidden">
                <header className="flex justify-between items-center mb-2 md:mb-4 bg-black/40 p-2 md:p-4 rounded-xl md:rounded-[2.5rem] border border-white/10 backdrop-blur-xl shrink-0">
                   <button onClick={() => { audioService.playSfx('click', 0.3); setIsPaused(true); }} className="w-8 h-8 md:w-12 md:h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-[10px] md:text-sm active:scale-90">⏸</button>
                   <div className="text-center">
                     <p className="text-white/30 text-[7px] md:text-[8px] font-black uppercase mb-0.5">LVL {gameState.currentLevel} • {gameState.score}</p>
                     <div className="flex gap-0.5">{[...Array(5)].map((_, i) => (<span key={i} className={`text-[10px] md:text-xs ${i >= (5 - gameState.mistakes) ? 'opacity-20 grayscale' : 'drop-shadow-glow'}`}>❤️</span>))}</div>
                   </div>
                   <div className="text-right">
                     <p className="text-white/30 text-[7px] md:text-[8px] font-black uppercase mb-0.5">Q {gameState.questionsAnswered + 1}/20</p>
                     <div className={`inline-block px-1.5 py-0.5 rounded-full text-[8px] md:text-[10px] font-black ${streak >= 5 ? 'bg-orange-500 text-white animate-pulse' : 'bg-white/10 text-white/30'}`}>x{streak}</div>
                   </div>
                </header>

                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-4 md:mb-6 shrink-0"><motion.div className="h-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${(gameState.questionsAnswered / 20) * 100}%` }} transition={{ duration: 0.5 }} /></div>

                <div className="flex-1 flex flex-col justify-start md:justify-center overflow-y-auto custom-scrollbar">
                  <AnimatePresence mode="wait">
                    {loading && questions.length <= currentQuestionIndex ? (
                      <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center space-y-4 md:y-6 py-20">
                        <div className="relative"><div className="w-12 h-12 md:w-20 md:h-20 border-3 md:border-4 border-emerald-500/10 rounded-full" /><div className="absolute top-0 w-12 h-12 md:w-20 md:h-20 border-3 md:border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
                        <p className="text-emerald-500 font-black text-[9px] md:text-xs uppercase tracking-[0.4em] animate-pulse">{t('generating')}</p>
                      </motion.div>
                    ) : questions[currentQuestionIndex] ? (
                      <div className="w-full pb-4">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6" onClick={() => { audioService.playSfx('exit', 0.5, true); setIsPaused(false); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-black/40 border border-white/10 w-full max-w-[300px] rounded-[2rem] p-8 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
               <span className="text-4xl block mb-6">⚽</span>
               <h3 className="text-xl font-black uppercase mb-8 tracking-tighter">PAUSED</h3>
               <div className="space-y-3">
                 <button onClick={() => { audioService.playSfx('click', 0.4); setIsPaused(false); }} className="w-full h-14 bg-emerald-500 text-white font-black rounded-xl uppercase text-xs tracking-widest active:scale-95 transition-all">{t('resume')}</button>
                 <button onClick={handleExitGame} className="w-full h-12 bg-rose-500/20 border border-rose-500/30 text-rose-500 font-black rounded-lg uppercase text-[9px] tracking-widest active:scale-95 transition-all">{t('exit')}</button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLeaderboard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 safe-pt safe-pb" onClick={() => { audioService.playSfx('exit', 0.5, true); setShowLeaderboard(false); }}>
            <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="bg-black/60 border border-white/10 w-full max-w-[340px] rounded-[2rem] p-6 max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-center text-white font-black text-lg uppercase mb-6 tracking-tighter">{t('leaderboard')}</h3>
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar mb-6 space-y-2">
                {leaderboard.map((user, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${user.isUser ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center space-x-2"><span className="font-black text-[9px] w-4 opacity-30">{i + 1}.</span><span className="font-bold text-xs">{user.name}</span><span className="text-[10px]">{user.country}</span></div>
                    <span className="text-emerald-400 font-black text-xs">{user.score}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => { audioService.playSfx('exit', 0.5, true); setShowLeaderboard(false); }} className="w-full h-12 bg-white text-black font-black rounded-xl uppercase text-[10px] tracking-widest active:scale-95 shrink-0 transition-all">{t('close')}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTrophyRoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 safe-pt safe-pb" onClick={() => { audioService.playSfx('exit', 0.5, true); setShowTrophyRoom(false); }}>
            <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="bg-black/60 border border-yellow-500/20 w-full max-w-[380px] rounded-[2rem] p-5 md:p-8 max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-6 shrink-0"><span className="text-3xl block mb-1">🏆</span><h3 className="text-white font-black text-lg uppercase tracking-tighter">{t('trophyRoom')}</h3></div>
              
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar mb-6">
                <div className="grid grid-cols-2 gap-2">
                  {ACHIEVEMENTS.map((ach) => {
                    const isUnlocked = userStats.unlockedAchievements.includes(ach.id);
                    let progress = 0;
                    if (ach.type === 'total_correct') progress = userStats.totalCorrect;
                    else if (ach.type === 'streak') progress = userStats.maxStreak;
                    else if (ach.type === 'category_mastery' && ach.category) progress = userStats.categoryCorrect[ach.category] || 0;
                    else if (ach.type === 'high_score') progress = 0;
                    else if (ach.type === 'perfect_game') progress = isUnlocked ? 1 : 0;
                    
                    const progressPercent = Math.min(100, (progress / ach.requirement) * 100);

                    return (
                      <div key={ach.id} className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${isUnlocked ? 'bg-yellow-500/10 border-yellow-500/30 shadow-md' : 'bg-white/5 border-white/5 opacity-60'}`}>
                        <span className={`text-2xl mb-2 ${isUnlocked ? 'grayscale-0' : 'grayscale brightness-50'}`}>{ach.icon}</span>
                        <p className="text-[9px] font-black uppercase mb-1 leading-tight h-5 flex items-center">{ach.name[gameState.language] || ach.name['English']}</p>
                        <p className="text-[7px] font-medium text-white/30 leading-tight h-6 flex items-center justify-center mb-2">{ach.description[gameState.language] || ach.description['English']}</p>
                        {!isUnlocked && ach.type !== 'high_score' && ach.type !== 'perfect_game' && (
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-yellow-500/40" style={{ width: `${progressPercent}%` }} />
                          </div>
                        )}
                        {isUnlocked && <span className="text-[6px] font-black text-yellow-500 uppercase mt-0.5 tracking-widest">UNLOCKED</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 shrink-0">
                <button onClick={resetAllProgress} className="w-full h-10 bg-rose-500/10 border border-rose-500/20 text-rose-500 font-black rounded-lg uppercase text-[8px] tracking-widest active:scale-95 transition-all">{t('resetData')}</button>
                <button onClick={() => { audioService.playSfx('exit', 0.5, true); setShowTrophyRoom(false); }} className="w-full h-12 bg-white text-black font-black rounded-xl uppercase text-[10px] tracking-widest active:scale-95 transition-all">{t('close')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <footer className="py-4 text-center mt-auto safe-pb shrink-0">
        <p className="text-[7px] font-black text-white/10 uppercase tracking-[0.4em] mb-0.5">TAP FOOTBALL QUIZ 2026</p>
        <p className="text-[6px] font-medium text-white/5 uppercase tracking-widest">© 2026 tapfootball@gmail.com</p>
      </footer>
    </div>
  );
};

export default App;
