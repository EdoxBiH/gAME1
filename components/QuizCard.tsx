
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Question, Language } from '../types';
import { audioService } from '../services/audioService';

interface QuizCardProps {
  question: Question;
  onAnswer: (answer: string) => void;
  disabled: boolean;
  isMuted: boolean;
  language: Language;
  isPaused?: boolean;
}

const TRANSLATIONS = {
  correct: { Bosanski: "TAČNO!", English: "CORRECT!", Deutsch: "RICHTIG!" },
  wrong: { Bosanski: "NETAČNO!", English: "WRONG!", Deutsch: "FALSCH!" },
  difficulty: { Bosanski: "TEŽINA", English: "DIFF", Deutsch: "DIFF" },
  timesUp: { Bosanski: "VRIJEME!", English: "TIME!", Deutsch: "ZEIT!" }
};

const QuizCard: React.FC<QuizCardProps> = ({ question, onAnswer, disabled, isMuted, language, isPaused }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [isWrong, setIsWrong] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    audioService.setMute(isMuted);
  }, [isMuted]);

  useEffect(() => {
    if (isPaused || selected) {
      if (timerRef.current) clearInterval(timerRef.current);
      audioService.stopSfx('tick');
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          audioService.stopSfx('tick');
          audioService.playSfx('timesUp', 0.8);
          handleTimeout();
          return 0;
        }

        const nextVal = prev - 1;
        if (nextVal <= 3) {
          audioService.playSfx('tick', 0.8);
        } else if (nextVal <= 6) {
          audioService.playSfx('tick', 0.4);
        } else {
          audioService.playSfx('tick', 0.15);
        }

        return nextVal;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      audioService.stopSfx('tick');
    };
  }, [question.id, isPaused, selected]);

  useEffect(() => {
    setTimeLeft(10);
    setSelected(null);
    setIsWrong(false);
  }, [question.id]);

  const handleTimeout = () => {
    if (selected) return;
    setIsWrong(true);
    setTimeout(() => audioService.playSfx('wrong', 0.5), 200);
    setSelected("");
    setTimeout(() => { onAnswer(""); }, 2500);
  };

  const handleSelect = (option: string) => {
    if (disabled || selected || timeLeft <= 0 || isPaused) return;
    if (timerRef.current) clearInterval(timerRef.current);
    audioService.stopSfx('tick');

    const correct = option === question.correctAnswer;
    setSelected(option);
    
    if (correct) {
      audioService.playSfx('correct');
    } else {
      setIsWrong(true);
      audioService.playSfx('wrong');
    }
    
    setTimeout(() => { onAnswer(option); }, 3000);
  };

  const t = (key: keyof typeof TRANSLATIONS) => TRANSLATIONS[key][language];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative w-full bg-black/80 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 border border-white/10 shadow-2xl ${isWrong ? 'animate-shake border-rose-500/30' : ''}`}
    >
      <div className="absolute top-0 left-0 w-full h-1 overflow-hidden rounded-t-[2rem] md:rounded-t-[3rem]">
        <motion.div className={`h-full ${timeLeft <= 3 ? 'bg-rose-500' : 'bg-emerald-500'}`}
          initial={{ width: "100%" }} animate={{ width: selected ? "0%" : `${(timeLeft / 10) * 100}%` }}
          transition={{ duration: selected || isPaused ? 0 : 1, ease: "linear" }}
        />
      </div>

      <div className="flex justify-between items-center mb-6 md:mb-8">
        <span className="bg-white/5 text-white/40 border border-white/5 px-3 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">{question.category}</span>
        <div className="flex items-center space-x-3">
          <span className={`text-xs font-black tabular-nums ${timeLeft <= 3 ? 'text-rose-500 animate-pulse' : 'text-white/40'}`}>{timeLeft}s</span>
          <div className="flex space-x-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`w-1 h-3 md:w-1.5 md:h-4 rounded-full ${i < question.difficulty / 2 ? 'bg-emerald-500' : 'bg-white/5'}`} />
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-lg md:text-2xl font-bold text-white text-center mb-8 md:mb-12 leading-[1.4] min-h-[4rem] px-1 md:px-4">
        {question.text}
      </h2>

      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {question.options.map((option, idx) => {
          const isSelected = selected === option;
          const isCorrect = isSelected && option === question.correctAnswer;
          const isWrongOption = isSelected && option !== question.correctAnswer;
          const showCorrectIfMissed = selected && !isSelected && option === question.correctAnswer;

          return (
            <button key={idx} onClick={() => handleSelect(option)} disabled={!!selected || isPaused}
              className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border text-sm md:text-base font-bold transition-all text-left flex items-center min-h-[60px] md:min-h-[72px]
                ${!selected ? 'bg-white/5 border-white/10 text-white/70 active:scale-95' : ''}
                ${isCorrect ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : ''}
                ${isWrongOption ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20' : ''}
                ${showCorrectIfMissed ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : ''}
                ${selected && !isSelected && !showCorrectIfMissed ? 'opacity-10 grayscale scale-95' : ''}
              `}
            >
              <span className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-lg bg-black/20 text-xs md:text-sm mr-4 shrink-0 font-black">{String.fromCharCode(65 + idx)}</span>
              <span className="flex-1 overflow-hidden text-ellipsis line-clamp-2">{option}</span>
            </button>
          );
        })}
      </div>
      
      <AnimatePresence>
        {selected !== null && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 md:mt-8 p-5 md:p-6 bg-white/5 border border-white/10 rounded-2xl md:rounded-[2rem]">
              {selected === "" && <p className="text-rose-500 font-black text-center text-xs uppercase mb-2 tracking-widest">{t('timesUp')}</p>}
              <p className="text-white/50 text-xs md:text-sm text-center italic font-medium leading-relaxed">"{question.explanation}"</p>
           </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default QuizCard;
