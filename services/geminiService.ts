
import { GoogleGenAI, Type } from "@google/genai";
import { Category, Question, Language } from "../types";
import { LOCAL_QUESTIONS } from "../data/localQuestions";

// Fix: Initializing GoogleGenAI using process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getDefaultExplanation = (lang: Language): string => {
  const map: Record<Language, string> = {
    'Bosanski': 'Ovo je tačan odgovor na osnovu sportskih činjenica.',
    'English': 'This is the correct answer based on sports facts.',
    'Deutsch': 'Dies ist die richtige Antwort basierend auf sportlichen Fakten.'
  };
  return map[lang] || map['English'];
};

const getOfflineQuestions = (category: Category, language: Language, difficulty: number, count: number): Question[] => {
  // Ensure we have a valid language pool
  const langPool = LOCAL_QUESTIONS[language] || LOCAL_QUESTIONS['English'];
  
  // Filter by category if specific, otherwise take all available for that language
  let filtered = langPool.filter(q => category === Category.ALL || q.category === category);
  
  // Fallback to all questions if specific category empty
  if (filtered.length === 0) {
    filtered = langPool;
  }

  const shuffled = [...filtered].sort(() => 0.5 - Math.random());
  
  return shuffled.slice(0, count).map(q => ({
    ...q,
    id: `offline-${Date.now()}-${Math.random()}`,
    difficulty: difficulty, // Assign the requested difficulty level for scoring consistency
    explanation: q.explanation || getDefaultExplanation(language)
  }));
};

export const generateQuestions = async (
  category: Category,
  difficulty: number,
  language: Language,
  count: number = 5
): Promise<{ questions: Question[], isOffline: boolean }> => {
  
  // Quick check for internet connection
  if (!navigator.onLine) {
    return { 
      questions: getOfflineQuestions(category, language, difficulty, count), 
      isOffline: true 
    };
  }

  const prompt = `Generiši ${count} fudbalskih pitanja na jeziku: ${language}. 
  Kategorija: ${category}. 
  Težina: ${difficulty} (od 1-lakše do 10-teže). 
  Svako pitanje mora imati 4 opcije i tačan odgovor. 
  Takođe obavezno dodaj polje "explanation" sa kratkim objašnjenjem zašto je taj odgovor tačan na istom jeziku (${language}).`;

  try {
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
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["id", "text", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    // Fix: Access response.text directly (property access) as per guidelines
    const text = response.text;
    if (!text) throw new Error("Empty response");
    
    const parsed = JSON.parse(text);
    return {
      isOffline: false,
      questions: parsed.map((q: any) => ({
        ...q,
        category: category,
        difficulty: difficulty
      }))
    };
  } catch (error) {
    console.warn("Gemini API error, falling back to offline mode:", error);
    return { 
      questions: getOfflineQuestions(category, language, difficulty, count), 
      isOffline: true 
    };
  }
};
