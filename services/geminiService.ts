
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
  
  if (!navigator.onLine) {
    return { 
      questions: getOfflineQuestions(category, language, difficulty, count, excludeIds), 
      isOffline: true 
    };
  }

  const targetLang = language === 'Bosanski' ? 'Bosnian' : language === 'Deutsch' ? 'German' : 'English';
  
  const systemInstruction = `You are a world-class football (soccer) historian and trivia expert. 
Your task is to generate high-quality, accurate, and engaging football trivia questions.

CRITICAL FAMILY-FRIENDLY RULES:
1. Content MUST be appropriate for all ages (G-rated).
2. NO references to violence, gambling, alcohol, drugs, or political controversies.
3. NO offensive, discriminatory, or inappropriate language.
4. Focus strictly on football facts, history, players, and stadiums.

TECHNICAL RULES:
1. The entire content (question text, all 4 options, and the explanation) MUST be written in ${targetLang}.
2. Ensure the correct answer is exactly one of the options.
3. The explanation should be informative and provide context about the correct answer.
4. Avoid repeating questions provided in the exclusion list.
5. Questions must be relevant to the year 2026 and historical football facts.`;

  const prompt = `Generate ${count} football trivia questions for the category: ${category}.
Difficulty level: ${difficulty}/10 (1 is very easy, 10 is expert level).
Exclude these question IDs: ${excludeIds.slice(-20).join(', ')}.
If the category is 'ALL', provide a balanced mix of players, clubs, stadiums, national teams, and coaches.`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "A unique string ID for the question" },
              text: { type: Type.STRING, description: "The trivia question text" },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Exactly 4 multiple choice options"
              },
              correctAnswer: { type: Type.STRING, description: "The correct option from the options array" },
              explanation: { type: Type.STRING, description: "A brief explanation of why the answer is correct" }
            },
            required: ["id", "text", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response from Gemini API");
    
    const parsed = JSON.parse(resultText);
    if (!Array.isArray(parsed)) throw new Error("Gemini API response is not an array");

    return {
      isOffline: false,
      questions: parsed.map((q: any) => ({
        ...q,
        id: q.id || `ai-${Date.now()}-${Math.random()}`,
        category: category === Category.ALL ? (q.category || category) : category,
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
