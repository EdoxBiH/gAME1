
import { GoogleGenAI, Type } from "@google/genai";
import { Category, Question, Language } from "../types";
import { LOCAL_QUESTIONS } from "../data/localQuestions";

/**
 * Provides a professional, category-specific fallback explanation if one is missing.
 * Supports Bosanski, English, and Deutsch.
 */
const getEnhancedExplanation = (q: Partial<Question>, lang: Language): string => {
  if (q.explanation) return q.explanation;

  const category = q.category || Category.ALL;
  
  const explanations: Record<Language, Record<string, string[]>> = {
    'Bosanski': {
      [Category.PLAYERS]: [
        "Ovaj podatak je potvrđen kroz zvaničnu statistiku saveza i klubova.",
        "Igrač je prepoznat po ovom dostignuću u svjetskim fudbalskim analima.",
        "Fudbalska historija bilježi ovaj podvig kao jedan od ključnih u karijeri igrača."
      ],
      [Category.CLUBS]: [
        "Klupska historija i arhiva trofeja potvrđuju tačnost ovog odgovora.",
        "Ovaj uspjeh je upisan u zlatne knjige kluba i prepoznat od strane UEFA/FIFA.",
        "Navijači i historičari pamte ovaj događaj kao prekretnicu za klub."
      ],
      [Category.STADIUMS]: [
        "Arhitektonski podaci i klupska evidencija potvrđuju specifičnosti ovog stadiona.",
        "Stadion je postao legendaran upravo zbog ovih historijskih činjenica.",
        "Zvanični kapaciteti i lokacije su provjereni prema standardima saveza."
      ],
      [Category.NATIONAL_TEAMS]: [
        "Reprezentativni uspjesi su dokumentovani u FIFA svjetskom poretku.",
        "Ovaj turnir je ostao upamćen upravo po ovom rezultatu ili rekordu.",
        "Nacionalni ponos se često temelji na ovim historijski tačnim činjenicama."
      ],
      [Category.COACHES]: [
        "Taktičke inovacije i osvojeni trofeji ovog trenera potvrđuju odgovor.",
        "Njegova karijera je obilježena upravo ovim stilom vođenja ekipe.",
        "Stručni komentatori se slažu u ocjeni ovog trenerskog dostignuća."
      ],
      [Category.ALL]: [
        "Ovaj podatak je dio opće fudbalske kulture i historije.",
        "Tačnost odgovora se zasniva na provjerenih sportskim izvorima.",
        "Fudbalske činjenice govore u prilog ovom tačnom rješenju."
      ]
    },
    'English': {
      [Category.PLAYERS]: [
        "This record is officially documented in club and league statistics.",
        "The player is world-renowned for this specific achievement.",
        "Football history records this feat as a milestone in the player's career."
      ],
      [Category.CLUBS]: [
        "The club's trophy cabinet and history confirm the accuracy of this answer.",
        "This success is etched in the club's legacy and recognized globally.",
        "Historians and fans alike remember this event as a defining moment."
      ],
      [Category.STADIUMS]: [
        "Architectural data and club records verify these stadium specifics.",
        "The stadium's legendary status is built on these historical facts.",
        "Official capacities and locations follow the highest football standards."
      ],
      [Category.NATIONAL_TEAMS]: [
        "National team triumphs are strictly documented in FIFA world rankings.",
        "This tournament is best remembered for this specific result or record.",
        "National pride is often built on these historically accurate milestones."
      ],
      [Category.COACHES]: [
        "The coach's tactical innovations and trophies validate this response.",
        "His management career is defined by this specific leadership style.",
        "Expert analysts agree on the significance of this coaching achievement."
      ],
      [Category.ALL]: [
        "This information is a core part of general football culture and history.",
        "The answer's accuracy is based on verified sports databases.",
        "Football facts strongly support this correct solution."
      ]
    },
    'Deutsch': {
      [Category.PLAYERS]: [
        "Dieser Rekord ist offiziell in den Vereins- und Ligastatistiken dokumentiert.",
        "Der Spieler ist weltweit für diese spezifische Leistung bekannt.",
        "Die Fußballgeschichte verzeichnet diesen Meilenstein in der Karriere des Spielers."
      ],
      [Category.CLUBS]: [
        "Die Trophäensammlung und die Geschichte des Vereins bestätigen die Richtigkeit.",
        "Dieser Erfolg ist fest im Erbe des Vereins verankert und weltweit anerkannt.",
        "Historiker und Fans erinnern sich an dieses Ereignis als einen Wendepunkt."
      ],
      [Category.STADIUMS]: [
        "Architektonische Daten und Vereinsunterlagen bestätigen diese Details.",
        "Der legendäre Status des Stadions basiert auf diesen historischen Fakten.",
        "Offizielle Kapazitäten und Standorte entsprechen den höchsten Standards."
      ],
      [Category.NATIONAL_TEAMS]: [
        "Nationalmannschaftserfolge sind in den FIFA-Weltranglisten dokumentiert.",
        "Dieses Turnier ist vor allem für dieses spezifische Ergebnis bekannt.",
        "Nationalstolz gründet sich oft auf diesen historisch belegten Fakten."
      ],
      [Category.COACHES]: [
        "Taktische Innovationen und Titel des Trainers bestätigen diese Antwort.",
        "Seine Trainerkarriere ist durch diesen spezifischen Führungsstil geprägt.",
        "Experten sind sich über die Bedeutung dieser Trainerleistung einig."
      ],
      [Category.ALL]: [
        "Diese Information ist ein wesentlicher Teil der Fußballkultur.",
        "Die Richtigkeit der Antwort basiert auf verifizierten Sportdatenbanken.",
        "Fußballfakten stützen diese korrekte Lösung eindeutig."
      ]
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
  const langPool = LOCAL_QUESTIONS[language] || LOCAL_QUESTIONS['English'];
  
  // Filter by category and exclude already seen IDs
  let filtered = langPool.filter(q => 
    (category === Category.ALL || q.category === category) &&
    !excludeIds.includes(q.id)
  );

  // If we ran out of new questions in this category, reuse from the main pool excluding session history
  if (filtered.length < count) {
    filtered = langPool.filter(q => !excludeIds.includes(q.id));
  }

  // If even that fails (extremely long session), just use the whole pool
  if (filtered.length === 0) {
    filtered = langPool;
  }

  const shuffled = [...filtered].sort(() => 0.5 - Math.random());
  
  return shuffled.slice(0, count).map(q => ({
    ...q,
    id: q.id || `offline-${Date.now()}-${Math.random()}`,
    difficulty: difficulty,
    explanation: getEnhancedExplanation(q, language)
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

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use English for the structural part of the prompt to ensure JSON schema compliance
  // but specify the content must be in the target language.
  const targetLang = language === 'Bosanski' ? 'Bosnian' : language === 'Deutsch' ? 'German' : 'English';
  
  const prompt = `Generate ${count} football trivia questions in the ${targetLang} language.
  Category: ${category}.
  Difficulty: ${difficulty} (on a scale of 1-10, where 1 is easy and 10 is very hard).
  Each question must have exactly 4 options and one correct answer.
  IMPORTANT: The questions must be unique and not match these IDs: ${excludeIds.join(', ')}.
  You MUST provide an "explanation" field for each question in ${targetLang} explaining why the answer is correct.
  The JSON keys must be: "id", "text", "options", "correctAnswer", "explanation". Do NOT translate the keys.`;

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

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response");
    
    // Some models might wrap JSON in markdown blocks even with mimeType set
    const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      isOffline: false,
      questions: parsed.map((q: any) => ({
        ...q,
        category: category,
        difficulty: difficulty
      }))
    };
  } catch (error) {
    console.warn(`Gemini API error for ${language}, falling back to offline mode:`, error);
    return { 
      questions: getOfflineQuestions(category, language, difficulty, count, excludeIds), 
      isOffline: true 
    };
  }
};
