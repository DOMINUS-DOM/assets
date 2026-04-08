export interface AllergenDef {
  id: number;
  key: string;
  icon: string;
}

// EU standard 14 allergens
export const ALLERGENS: AllergenDef[] = [
  { id: 1, key: 'gluten', icon: '🌾' },
  { id: 2, key: 'crustaceans', icon: '🦐' },
  { id: 3, key: 'eggs', icon: '🥚' },
  { id: 4, key: 'fish', icon: '🐟' },
  { id: 5, key: 'peanuts', icon: '🥜' },
  { id: 6, key: 'soy', icon: '🫘' },
  { id: 7, key: 'milk', icon: '🥛' },
  { id: 8, key: 'nuts', icon: '🌰' },
  { id: 9, key: 'celery', icon: '🌿' },
  { id: 10, key: 'mustard', icon: '🟡' },
  { id: 11, key: 'sesame', icon: '🌱' },
  { id: 12, key: 'sulfites', icon: '🍷' },
  { id: 13, key: 'lupin', icon: '🌸' },
  { id: 14, key: 'mollusks', icon: '🐚' },
];
