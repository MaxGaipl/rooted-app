export interface Prompt {
  id: string;
  category: 'growth' | 'relationships' | 'career' | 'health' | 'mindset';
  question: string;
}

export const DAILY_PROMPTS: Prompt[] = [
  {
    id: 'growth_1',
    category: 'growth',
    question: 'Welche Angst oder Unsicherheit hast du heute gespürt, und was sagt sie über deine aktuellen Bedürfnisse aus?'
  },
  {
    id: 'growth_2',
    category: 'growth',
    question: 'In welchem Bereich hast du heute etwas Neues gelernt oder eine neue Perspektive eingenommen?'
  },
  {
    id: 'relationships_1',
    category: 'relationships',
    question: 'Welche Begegnung oder welches Gespräch hat dir heute ein Gefühl von Verbindung oder Freude geschenkt?'
  },
  {
    id: 'relationships_2',
    category: 'relationships',
    question: 'Gibt es eine Person in deinem Leben, der du heute gerne deine Wertschätzung gezeigt hättest? Was hält dich zurück?'
  },
  {
    id: 'career_1',
    category: 'career',
    question: 'Bringt dich das, worauf du heute deine Energie verwendet hast, deinen langfristigen Zielen oder Träumen näher?'
  },
  {
    id: 'career_2',
    category: 'career',
    question: 'Wie bist du heute mit Herausforderungen oder Stress bei der Arbeit/deinen Aufgaben umgegangen? Was lief gut?'
  },
  {
    id: 'health_1',
    category: 'health',
    question: 'Wie hast du heute für deinen Körper gesorgt (Schlaf, Ernährung, Bewegung)? Was hat sich gut angefühlt?'
  },
  {
    id: 'health_2',
    category: 'health',
    question: 'Hast du heute Signale deines Körpers (Müdigkeit, Anspannung, Hunger) ignoriert? Warum?'
  },
  {
    id: 'mindset_1',
    category: 'mindset',
    question: 'In welcher Situation warst du heute besonders geduldig, mitfühlend oder gelassen mit dir selbst?'
  },
  {
    id: 'mindset_2',
    category: 'mindset',
    question: 'Wann hast du dich heute ganz im gegenwärtigen Moment gefühlt, ohne an Gestern oder Morgen zu denken?'
  },
  {
    id: 'mindset_3',
    category: 'mindset',
    question: 'Was hat dir heute Energie geraubt, und wie kannst du diese Quelle morgen bewusster meiden oder verändern?'
  },
  {
    id: 'growth_3',
    category: 'growth',
    question: 'Wenn der heutige Tag ein Kapitel in einem Buch wäre, welchen Titel würde es tragen?'
  }
];

export function getPromptForDate(dateStr: string): Prompt {
  // Use the date string hash to select a prompt so it is stable for the same day
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DAILY_PROMPTS.length;
  return DAILY_PROMPTS[index];
}
