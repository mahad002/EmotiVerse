export interface Character {
  id: string;
  name: string;
  description: string;
  apiProvider: 'gemini' | 'openai';
}

export const characters: Character[] = [
  {
    id: 'character-1',
    name: 'Mahad',
    description: 'Powered by Gemini',
    apiProvider: 'gemini',
  },
  {
    id: 'character-2',
    name: 'Sara',
    description: 'Powered by OpenAI',
    apiProvider: 'openai',
  },
];

export const defaultCharacter = characters[0];
