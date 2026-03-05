export interface Character {
  id: string;
  name: string;
  description: string;
  apiProvider: 'gemini' | 'openai' | 'litellm';
}

// Order: Sara first, Mahad second, Code M third (IDs unchanged so chat state keys stay valid)
export const characters: Character[] = [
  {
    id: 'character-2',
    name: 'Sara',
    description: 'Online',
    apiProvider: 'litellm',
  },
  {
    id: 'character-1',
    name: 'Mahad',
    description: 'Online',
    apiProvider: 'litellm',
  },
  {
    id: 'character-3',
    name: 'Code M',
    description: 'Online',
    apiProvider: 'litellm',
  },
];

export const defaultCharacter = characters[0];
