
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
}

const TRANSLATIONS = {
  correct: { Bosanski: "TAČNO!", English: "CORRECT!", Deutsch: "RICHTIG!" },
  wrong: { Bosanski: "NETAČNO!", English: "WRONG!", Deutsch: "FALSCH!" },
  difficulty: { Bosanski: "TEŽINA", English: "DIFF", Deutsch: "DIFF" },
  timesUp: { Bosanski: "VRIJEME!", English: "TIME!", Deutsch: "ZEIT!" }
};

const QuizCard: React.FC<QuizCardProps> = ({ question, onAnswer, disabled, isMuted, language }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [isWrong, setIsWrong] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    audioService.setMute(isMuted);
  }, [isMuted]);

  useEffect(() => {
    setTimeLeft(10);
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        if (prev <= 4) audioService.playSfx('tick', 0.4);
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      audioService.stopSfx('tick');
    };
  }, [question.id]);

  const handleTimeout = () => {
    if (selected) return;
    setIsWrong(true);
    audioService.playSfx('wrong');
    setSelected("");
    setTimeout(() => { onAnswer(""); setSelected(null); setIsWrong(false); }, 2500);
  };

  const handleSelect = (option: string) => {
    if (disabled || selected || timeLeft <= 0) return;
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
    
    setTimeout(() => { onAnswer(option); setSelected(null); setIsWrong(false); }, 3000);
  };

  const t = (key: keyof typeof TRANSLATIONS) => TRANSLATIONS[key][language];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative w-full bg-black/80 backdrop-blur-3xl rounded-3xl p-5 border border-white/10 shadow-2xl ${isWrong ? 'animate-shake border-rose-500/30' : ''}`}
    >
      <div className="absolute top-0 left-0 w-full h-0.5 overflow-hidden rounded-t-3xl">
        <motion.div className={`h-full ${timeLeft <= 3 ? 'bg-rose-500' : 'bg-emerald-500'}`}
          initial={{ width: "100%" }} animate={{ width: selected ? "0%" : `${(timeLeft / 10) * 100}%` }}
          transition={{ duration: selected ? 0 : 1, ease: "linear" }}
        />
      </div>

      <div className="flex justify-between items-center mb-4">
        <span className="bg-white/5 text-white/40 border border-white/5 px-2 py-0.5 rounded-full text-[6px] font-black uppercase">{question.category}</span>
        <div className="flex items-center space-x-2">
          <span className={`text-[8px] font-black ${timeLeft <= 3 ? 'text-rose-500' : 'text-white/40'}`}>{timeLeft}s</span>
          <div className="flex space-x-0.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`w-1 h-2 rounded-full ${i < question.difficulty / 2 ? 'bg-emerald-500' : 'bg-white/5'}`} />
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-sm font-bold text-white text-center mb-6 leading-tight min-h-[3rem] px-2">
        {question.text}
      </h2>

      <div className="grid grid-cols-1 gap-1.5">
        {question.options.map((option, idx) => {
          const isSelected = selected === option;
          const isCorrect = isSelected && option === question.correctAnswer;
          const isWrongOption = isSelected && option !== question.correctAnswer;
          const showCorrectIfMissed = selected && !isSelected && option === question.correctAnswer;

          return (
            <button key={idx} onClick={() => handleSelect(option)} disabled={!!selected}
              className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center
                ${!selected ? 'bg-white/5 border-white/5 text-white/70 active:scale-98' : ''}
                ${isCorrect ? 'bg-emerald-500 border-emerald-400 text-white' : ''}
                ${isWrongOption ? 'bg-rose-500 border-rose-400 text-white' : ''}
                ${showCorrectIfMissed ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : ''}
                ${selected && !isSelected && !showCorrectIfMissed ? 'opacity-10 grayscale' : ''}
              `}
            >
              <span className="w-5 h-5 flex items-center justify-center rounded-lg bg-black/20 text-[9px] mr-3">{String.fromCharCode(65 + idx)}</span>
              <span className="flex-1 truncate">{option}</span>
            </button>
          );
        })}
      </div>
      
      <AnimatePresence>
        {selected !== null && (
           <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-white/5 border border-white/5 rounded-xl">
              {selected === "" && <p className="text-rose-500 font-black text-center text-[8px] uppercase mb-1">{t('timesUp')}</p>}
              <p className="text-white/50 text-[10px] text-center italic font-medium">"{question.explanation}"</p>
           </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default QuizCard;
