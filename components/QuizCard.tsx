
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
  difficulty: { Bosanski: "TEŽINA", English: "DIFFICULTY", Deutsch: "SCHWIERIGKEIT" }
};

const QuizCard: React.FC<QuizCardProps> = ({ question, onAnswer, disabled, isMuted, language }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [isWrong, setIsWrong] = useState(false);
  
  const clickSound = useRef(new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73456.mp3'));
  const correctSound = useRef(new Audio('https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3'));
  const wrongSound = useRef(new Audio('https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg'));

  const playSound = (audio: HTMLAudioElement) => {
    if (!isMuted) {
      audio.currentTime = 0;
      audio.volume = 0.4;
      audio.play().catch(e => console.log("Sound play blocked"));
    }
  };

  const handleSelect = (option: string) => {
    if (disabled || selected) return;
    
    const correct = option === question.correctAnswer;
    setSelected(option);
    
    if (correct) {
      playSound(correctSound.current);
    } else {
      setIsWrong(true);
      playSound(wrongSound.current);
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
      className={`w-full max-w-xl mx-auto bg-black/80 backdrop-blur-2xl rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-white/10 ${isWrong ? 'animate-shake border-rose-500/40' : 'border-white/10'}`}
    >
      <div className="flex justify-between items-center mb-6">
        <span className="px-4 py-1.5 bg-white/5 text-white/50 border border-white/10 rounded-full text-[9px] font-black tracking-widest uppercase">
          {question.category.replace('_', ' ')}
        </span>
        <div className="flex items-center space-x-2">
           <span className="text-white/20 text-[8px] font-black tracking-widest uppercase">{t('difficulty')}</span>
           <div className="flex space-x-0.5">
             {[...Array(10)].map((_, i) => (
               <div key={i} className={`w-1.5 h-3 rounded-sm ${i < question.difficulty ? (question.difficulty > 7 ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-white/5'}`} />
             ))}
           </div>
        </div>
      </div>

      <h2 className="text-xl md:text-2xl font-bold text-white mb-8 leading-snug text-center tracking-tight min-h-[4rem]">
        {question.text}
      </h2>

      <div className="grid grid-cols-1 gap-3">
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
              disabled={disabled || !!selected}
              className={`
                group relative p-4 rounded-2xl text-left font-bold transition-all duration-300 border text-sm flex items-center
                ${!selected ? 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:border-white/20' : ''}
                ${isCorrect ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)]' : ''}
                ${isWrongOption ? 'bg-rose-500 border-rose-400 text-white shadow-[0_0_25px_rgba(244,63,94,0.4)]' : ''}
                ${showCorrectIfMissed ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : ''}
                ${selected && !isSelected && !showCorrectIfMissed ? 'opacity-20 grayscale' : ''}
              `}
            >
              <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-xs mr-4 transition-colors
                ${isSelected ? 'bg-black/20' : 'bg-black/40 text-white/40'}
              `}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="text-base flex-1">{option}</span>
              
              {isCorrect && <span className="ml-2 text-[10px] font-black">{t('correct')}</span>}
              {isWrongOption && <span className="ml-2 text-[10px] font-black">{t('wrong')}</span>}
            </motion.button>
          );
        })}
      </div>
      
      <AnimatePresence>
        {selected && question.explanation && (
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="mt-8 p-5 bg-white/5 border border-white/5 rounded-2xl"
           >
              <p className="text-white/60 text-xs md:text-sm leading-relaxed text-center font-medium italic">
                "{question.explanation}"
              </p>
           </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default QuizCard;
