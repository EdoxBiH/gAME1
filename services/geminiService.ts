
import { GoogleGenAI, Type } from "@google/genai";
import { Category, Question, Language } from "../types";
import { LOCAL_QUESTIONS } from "../data/localQuestions";

/**
 * Provides a professional, category-specific fallback explanation if one is missing.
 */
const getEnhancedExplanation = (q: Partial<Question>, lang: Language): string => {
  if (q.explanation) return q.explanation;

  const category = q.category || Category.ALL;
  
  const explanations: Record<Language, Record<string, string[]>> = {
    'Bosanski': {
      [Category.PLAYERS]: ["Ovaj podatak je potvrđen kroz zvaničnu statistiku."],
      [Category.CLUBS]: ["Klupska historija potvrđuje tačnost ovog odgovora."],
      [Category.STADIUMS]: ["Stadion je postao legendaran zbog ovih činjenica."],
      [Category.NATIONAL_TEAMS]: ["Reprezentativni uspjesi su dokumentovani u FIFA arhivi."],
      [Category.COACHES]: ["Karijera ovog trenera je obilježena ovim dostignućem."],
      [Category.ALL]: ["Fudbalske činjenice govore u prilog ovom tačnom rješenju."]
    },
    'English': {
      [Category.PLAYERS]: ["This record is officially documented in league statistics."],
      [Category.CLUBS]: ["The club's trophy cabinet confirms the accuracy of this answer."],
      [Category.STADIUMS]: ["Official capacities follow the highest football standards."],
      [Category.NATIONAL_TEAMS]: ["National team triumphs are documented in FIFA world rankings."],
      [Category.COACHES]: ["The coach's tactical innovations validate this response."],
      [Category.ALL]: ["Football facts strongly support this correct solution."]
    },
    'Deutsch': {
      [Category.PLAYERS]: ["Dieser Rekord ist offiziell in den Statistiken dokumentiert."],
      [Category.CLUBS]: ["Die Geschichte des Vereins bestätigt die Richtigkeit."],
      [Category.STADIUMS]: ["Offizielle Kapazitäten entsprechen den höchsten Standards."],
      [Category.NATIONAL_TEAMS]: ["Nationalmannschaftserfolge sind dokumentiert."],
      [Category.COACHES]: ["Trainerkarriere und Titel bestätigen diese Antwort."],
      [Category.ALL]: ["Fußballfakten stützen diese korrekte Lösung eindeutig."]
    }
  };

  const pool = explanations[lang] || explanations['English'];
  const categoryPool = pool[category] || pool[Category.ALL];
  
  const text = q.text || "";
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % categoryPool.length;
  
  return categoryPool[index];
};

const getOfflineQuestions = (category: Category, language: Language, difficulty: number, count: number, excludeIds: string[] = []): Question[] => {
  // Ensure we have a pool, default to English if specific language is missing
  const langPool = LOCAL_QUESTIONS[language] || LOCAL_QUESTIONS['English'] || [];
  
  if (langPool.length === 0) return [];

  // 1. Try to filter by category and unused IDs
  let filtered = langPool.filter(q => 
    (category === Category.ALL || q.category === category) &&
    !excludeIds.includes(q.id)
  );

  // 2. If no unused category-specific questions, ignore category but keep unused
  if (filtered.length === 0 && category !== Category.ALL) {
    filtered = langPool.filter(q => !excludeIds.includes(q.id));
  }

  // 3. If still nothing (all questions used), just use the whole pool
  if (filtered.length === 0) {
    filtered = langPool;
  }

  const shuffled = [...filtered].sort(() => 0.5 - Math.random());
  
  return shuffled.slice(0, count).map(q => ({
    ...q,
    id: q.id || `offline-${Date.now()}-${Math.random()}`,
    difficulty: q.difficulty || difficulty,
    explanation: q.explanation || getEnhancedExplanation(q, language)
  }));
};

export const generateQuestions = async (
  category: Category,
  difficulty: number,
  language: Language,
  count: number = 5,
  excludeIds: string[] = []
): Promise<{ questions: Question[], isOffline: boolean }> => {
  
  // Basic sanity check
  if (!LOCAL_QUESTIONS[language] && language !== 'English') {
    console.warn(`Local pool for ${language} not found, falling back.`);
  }

  if (!navigator.onLine) {
    return { 
      questions: getOfflineQuestions(category, language, difficulty, count, excludeIds), 
      isOffline: true 
    };
  }

  const targetLang = language === 'Bosanski' ? 'Bosnian' : language === 'Deutsch' ? 'German' : 'English';
  
  const prompt = `Generate ${count} football trivia questions in ${targetLang}.
  Category: ${category}.
  Difficulty: ${difficulty}/10.
  Unique IDs to avoid: ${excludeIds.slice(-20).join(', ')}.
  JSON: [{"id": string, "text": string, "options": [4 strings], "correctAnswer": string, "explanation": string}]`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["id", "text", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response");
    
    const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      isOffline: false,
      questions: parsed.map((q: any) => ({
        ...q,
        id: q.id || `ai-${Date.now()}-${Math.random()}`,
        category: category,
        difficulty: difficulty
      }))
    };
  } catch (error) {
    console.error(`Gemini fetch failed for ${language}:`, error);
    return { 
      questions: getOfflineQuestions(category, language, difficulty, count, excludeIds), 
      isOffline: true 
    };
  }
};
