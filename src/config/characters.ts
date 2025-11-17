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

    description: 'Online',
    apiProvider: 'gemini',
  },
  {
    id: 'character-2',
    name: 'Sara',
    description: 'Online',
    apiProvider: 'openai',
  },
];

export const defaultCharacter = characters[0];
