
import { Category, Question, Language } from '../types';

export const LOCAL_QUESTIONS: Record<Language, Question[]> = {
  Bosanski: [
    {
      id: 'b1',
      category: Category.PLAYERS,
      text: 'Ko je osvojio najviše Zlatnih lopti (Ballon d\'Or) u historiji?',
      options: ['Cristiano Ronaldo', 'Lionel Messi', 'Michel Platini', 'Zinedine Zidane'],
      correctAnswer: 'Lionel Messi',
      difficulty: 2,
      explanation: 'Lionel Messi drži rekord sa 8 osvojenih Zlatnih lopti.'
    },
    {
      id: 'b2',
      category: Category.CLUBS,
      text: 'Koji klub ima najviše titula Lige Šampiona?',
      options: ['AC Milan', 'Liverpool', 'Real Madrid', 'Bayern Munich'],
      correctAnswer: 'Real Madrid',
      difficulty: 1,
      explanation: 'Real Madrid je rekorder sa 15 titula prvaka Evrope.'
    },
    {
      id: 'b3',
      category: Category.STADIUMS,
      text: 'Na kojem stadionu igra FC Barcelona?',
      options: ['Santiago Bernabéu', 'Camp Nou', 'San Siro', 'Wembley'],
      correctAnswer: 'Camp Nou',
      difficulty: 1,
      explanation: 'Camp Nou je dom Barcelone od 1957. godine.'
    },
    {
      id: 'b4',
      category: Category.NATIONAL_TEAMS,
      text: 'Koja reprezentacija je osvojila Svjetsko prvenstvo 2022. godine?',
      options: ['Francuska', 'Hrvatska', 'Argentina', 'Brazil'],
      correctAnswer: 'Argentina',
      difficulty: 2,
      explanation: 'Argentina je pobijedila Francusku u finalu nakon penala.'
    },
    {
      id: 'b5',
      category: Category.COACHES,
      text: 'Koji trener je poznat po nadimku "The Special One"?',
      options: ['Pep Guardiola', 'Jurgen Klopp', 'Jose Mourinho', 'Carlo Ancelotti'],
      correctAnswer: 'Jose Mourinho',
      difficulty: 3,
      explanation: 'Mourinho je sam sebi dao ovaj nadimak po dolasku u Chelsea 2004. godine.'
    }
  ],
  English: [
    {
      id: 'e1',
      category: Category.PLAYERS,
      text: 'Who has won the most Ballon d\'Or awards in history?',
      options: ['Cristiano Ronaldo', 'Lionel Messi', 'Michel Platini', 'Zinedine Zidane'],
      correctAnswer: 'Lionel Messi',
      difficulty: 2,
      explanation: 'Lionel Messi holds the record with 8 Ballon d\'Or titles.'
    },
    {
      id: 'e2',
      category: Category.CLUBS,
      text: 'Which club has won the most UEFA Champions League titles?',
      options: ['AC Milan', 'Liverpool', 'Real Madrid', 'Bayern Munich'],
      correctAnswer: 'Real Madrid',
      difficulty: 1,
      explanation: 'Real Madrid is the record holder with 15 European titles.'
    },
    {
      id: 'e3',
      category: Category.STADIUMS,
      text: 'In which stadium does FC Barcelona play their home matches?',
      options: ['Santiago Bernabéu', 'Camp Nou', 'San Siro', 'Wembley'],
      correctAnswer: 'Camp Nou',
      difficulty: 1,
      explanation: 'Camp Nou has been the home of Barcelona since 1957.'
    },
    {
      id: 'e4',
      category: Category.NATIONAL_TEAMS,
      text: 'Which national team won the 2022 FIFA World Cup?',
      options: ['France', 'Croatia', 'Argentina', 'Brazil'],
      correctAnswer: 'Argentina',
      difficulty: 2,
      explanation: 'Argentina defeated France in the final after a penalty shootout.'
    },
    {
      id: 'e5',
      category: Category.COACHES,
      text: 'Which coach is famously known as "The Special One"?',
      options: ['Pep Guardiola', 'Jurgen Klopp', 'Jose Mourinho', 'Carlo Ancelotti'],
      correctAnswer: 'Jose Mourinho',
      difficulty: 3,
      explanation: 'Mourinho gave himself this nickname when he joined Chelsea in 2004.'
    }
  ],
  Deutsch: [
    {
      id: 'd1',
      category: Category.PLAYERS,
      text: 'Wer hat die meisten Ballon d\'Or-Auszeichnungen in der Geschichte gewonnen?',
      options: ['Cristiano Ronaldo', 'Lionel Messi', 'Michel Platini', 'Zinedine Zidane'],
      correctAnswer: 'Lionel Messi',
      difficulty: 2,
      explanation: 'Lionel Messi hält den Rekord mit 8 Ballon d\'Or-Titeln.'
    },
    {
      id: 'd2',
      category: Category.CLUBS,
      text: 'Welcher Verein hat die meisten UEFA Champions League-Titel gewonnen?',
      options: ['AC Milan', 'Liverpool', 'Real Madrid', 'Bayern München'],
      correctAnswer: 'Real Madrid',
      difficulty: 1,
      explanation: 'Real Madrid ist Rekordhalter mit 15 europäischen Titeln.'
    },
    {
      id: 'd3',
      category: Category.STADIUMS,
      text: 'In welchem Stadion trägt der FC Barcelona seine Heimspiele aus?',
      options: ['Santiago Bernabéu', 'Camp Nou', 'San Siro', 'Wembley'],
      correctAnswer: 'Camp Nou',
      difficulty: 1,
      explanation: 'Das Camp Nou ist seit 1957 die Heimat von Barcelona.'
    },
    {
      id: 'd4',
      category: Category.NATIONAL_TEAMS,
      text: 'Welche Nationalmannschaft hat die FIFA-Weltmeisterschaft 2022 gewonnen?',
      options: ['Frankreich', 'Kroatien', 'Argentinien', 'Brasilien'],
      correctAnswer: 'Argentinien',
      difficulty: 2,
      explanation: 'Argentinien besiegte Frankreich im Finale nach Elfmeterschießen.'
    },
    {
      id: 'd5',
      category: Category.COACHES,
      text: 'Welcher Trainer ist bekannt als "The Special One"?',
      options: ['Pep Guardiola', 'Jürgen Klopp', 'Jose Mourinho', 'Carlo Ancelotti'],
      correctAnswer: 'Jose Mourinho',
      difficulty: 3,
      explanation: 'Mourinho gab sich diesen Spitznamen selbst, als er 2004 zu Chelsea kam.'
    }
  ]
};
