import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Question, Language } from '../types';

interface QuizCardProps {
  question: Question;
  onAnswer: (answer: string) => void;
  disabled: boolean;
  isMuted: boolean;
  language: Language;
}

const TRANSLATIONS = {
  correct: { Bosanski: "TAČNO!", English: "CORRECT!", Deutsch: "RICHTIG!" },
  wrong: { Bosanski: "NETAČNO!", English: "WRONG!", Deutsch: "FALSCH!" },
  difficulty: { Bosanski: "TEŽINA", English: "DIFFICULTY", Deutsch: "SCHWIERIGKEIT" },
  timesUp: { Bosanski: "VRIJEME ISTEKLO!", English: "TIME'S UP!", Deutsch: "ZEIT ABGELAUFEN!" }
};

const QuizCard: React.FC<QuizCardProps> = ({ question, onAnswer, disabled, isMuted, language }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [isWrong, setIsWrong] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const clickSound = useRef(new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73456.mp3'));
  const correctSound = useRef(new Audio('https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3'));
  const wrongSound = useRef(new Audio('https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg'));
  const tickSound = useRef(new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_5e4125f49e.mp3'));
  const fastTickSound = useRef(new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73456.mp3'));
  const timesUpSound = useRef(new Audio('https://cdn.pixabay.com/audio/2022/03/24/audio_98319f7278.mp3'));
  const whooshSound = useRef(new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_73147895e7.mp3'));
  const startSound = useRef(new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_73147895e7.mp3'));

  const playSound = (audio: HTMLAudioElement, volume: number = 0.4) => {
    if (!isMuted) {
      audio.currentTime = 0;
      audio.volume = volume;
      audio.play().catch(e => console.log("Sound play blocked"));
    }
  };

  useEffect(() => {
    setTimeLeft(10);
    if (timerRef.current) clearInterval(timerRef.current);
    playSound(startSound.current, 0.2);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        if (prev <= 4) playSound(fastTickSound.current, 0.5);
        else playSound(tickSound.current, 0.2);
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [question.id]);

  const handleTimeout = () => {
    if (selected) return;
    setIsWrong(true);
    playSound(timesUpSound.current, 0.6);
    playSound(wrongSound.current, 0.4);
    setSelected("");
    
    setTimeout(() => {
      onAnswer("");
      setSelected(null);
      setIsWrong(false);
    }, 3000);
  };

  const handleSelect = (option: string) => {
    if (disabled || selected || timeLeft <= 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
    
    const correct = option === question.correctAnswer;
    setSelected(option);
    playSound(whooshSound.current, 0.3);
    
    if (correct) playSound(correctSound.current, 0.5);
    else {
      setIsWrong(true);
      playSound(wrongSound.current, 0.4);
    }

    setTimeout(() => {
        onAnswer(option);
        setSelected(null);
        setIsWrong(false);
    }, 3500);
  };

  const t = (key: keyof typeof TRANSLATIONS) => TRANSLATIONS[key][language];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative w-full max-w-xl mx-auto bg-black/80 backdrop-blur-2xl rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-10 shadow-2xl border border-white/10 ${isWrong ? 'animate-shake border-rose-500/40' : 'border-white/10'}`}
    >
      <div className="absolute top-0 left-0 w-full h-1 overflow-hidden rounded-t-[1.5rem] md:rounded-t-[2.5rem]">
        <motion.div 
          className={`h-full ${timeLeft <= 3 ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}
          initial={{ width: "100%" }}
          animate={{ width: selected ? "0%" : `${(timeLeft / 10) * 100}%` }}
          transition={{ duration: selected ? 0 : 1, ease: "linear" }}
        />
      </div>

      <div className="flex justify-between items-center mb-4 md:mb-6">
        <span className="px-2.5 py-1 bg-white/5 text-white/50 border border-white/10 rounded-full text-[7px] md:text-[9px] font-black tracking-widest uppercase">
          {question.category.replace('_', ' ')}
        </span>
        <div className="flex items-center space-x-2 md:space-x-4">
           <motion.div 
             animate={timeLeft <= 3 ? { scale: [1, 1.1, 1] } : {}}
             transition={{ duration: 0.5, repeat: Infinity }}
             className={`flex items-center space-x-1 ${timeLeft <= 3 ? 'text-rose-500' : 'text-white/40'}`}
           >
             <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             <span className="text-[8px] md:text-[10px] font-black tracking-widest">{timeLeft}s</span>
           </motion.div>

           <div className="flex items-center space-x-1 md:space-x-2">
             <span className="text-white/20 text-[7px] md:text-[8px] font-black tracking-widest uppercase">{t('difficulty')}</span>
             <div className="flex space-x-0.5">
               {[...Array(10)].map((_, i) => (
                 <div key={i} className={`w-1 md:w-1.5 h-2 md:h-3 rounded-[1px] ${i < question.difficulty ? (question.difficulty > 7 ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-white/5'}`} />
               ))}
             </div>
           </div>
        </div>
      </div>

      <h2 className="text-lg md:text-2xl font-bold text-white mb-6 md:mb-8 leading-tight text-center tracking-tight min-h-[3rem] md:min-h-[4rem]">
        {question.text}
      </h2>

      <div className="grid grid-cols-1 gap-2 md:gap-3">
        {question.options.map((option, idx) => {
          const isSelected = selected === option;
          const isCorrect = isSelected && option === question.correctAnswer;
          const isWrongOption = isSelected && option !== question.correctAnswer;
          const showCorrectIfMissed = selected && !isSelected && option === question.correctAnswer;

          return (
            <motion.button
              key={idx}
              whileHover={!selected ? { scale: 1.01 } : {}}
              whileTap={!selected ? { scale: 0.98 } : {}}
              onClick={() => handleSelect(option)}
              disabled={disabled || !!selected || timeLeft <= 0}
              className={`
                group relative p-3 md:p-4 rounded-xl md:rounded-2xl text-left font-bold transition-all duration-300 border text-sm flex items-center
                ${!selected ? 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:border-white/20' : ''}
                ${isCorrect ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' : ''}
                ${isWrongOption ? 'bg-rose-500 border-rose-400 text-white shadow-lg' : ''}
                ${showCorrectIfMissed ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : ''}
                ${selected && !isSelected && !showCorrectIfMissed ? 'opacity-20 grayscale' : ''}
              `}
            >
              <span className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg font-black text-[10px] md:text-xs mr-3 md:mr-4 transition-colors
                ${isSelected ? 'bg-black/20 text-white' : 'bg-black/40 text-white/40'}
              `}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="text-sm md:text-base flex-1 truncate">{option}</span>
              
              {isCorrect && <span className="ml-1 md:ml-2 text-[8px] md:text-[10px] font-black">{t('correct')}</span>}
              {isWrongOption && <span className="ml-1 md:ml-2 text-[8px] md:text-[10px] font-black">{t('wrong')}</span>}
            </motion.button>
          );
        })}
      </div>
      
      <AnimatePresence>
        {selected !== null && (
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="mt-6 md:mt-8 p-4 md:p-5 bg-white/5 border border-white/5 rounded-xl md:rounded-2xl"
           >
              {selected === "" && (
                <p className="text-rose-500 font-black text-center text-[10px] md:text-xs mb-2 uppercase tracking-widest">{t('timesUp')}</p>
              )}
              {question.explanation && (
                <p className="text-white/60 text-[11px] md:text-sm leading-relaxed text-center font-medium italic">
                  "{question.explanation}"
                </p>
              )}
           </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default QuizCard;