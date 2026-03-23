export type EstimatedMeal = {
  name: string;
  calories: number;
  note: string;
};

type FoodItem = {
  label: string;
  aliases: string[];
  caloriesPerUnit: number;
  unitLabel?: string;
};

const QUANTITY_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  half: 0.5,
  double: 2,
};

const SIZE_MULTIPLIERS: Record<string, number> = {
  mini: 0.75,
  small: 0.85,
  medium: 1,
  regular: 1,
  large: 1.3,
  xl: 1.5,
};

const FOOD_ITEMS: FoodItem[] = [
  {
    label: 'Greek yogurt',
    aliases: ['greek yogurt'],
    caloriesPerUnit: 130,
    unitLabel: 'cup',
  },
  {
    label: 'Avocado toast',
    aliases: ['avocado toast'],
    caloriesPerUnit: 280,
  },
  {
    label: 'Chicken salad',
    aliases: ['grilled chicken salad', 'chicken salad'],
    caloriesPerUnit: 360,
  },
  {
    label: 'Salmon bowl',
    aliases: ['salmon bowl', 'rice bowl with salmon'],
    caloriesPerUnit: 540,
  },
  {
    label: 'Protein shake',
    aliases: ['protein shake', 'shake'],
    caloriesPerUnit: 220,
  },
  {
    label: 'Rice bowl',
    aliases: ['rice bowl', 'grain bowl'],
    caloriesPerUnit: 560,
  },
  {
    label: 'Burrito',
    aliases: ['burrito'],
    caloriesPerUnit: 620,
  },
  {
    label: 'Sandwich',
    aliases: ['sandwich'],
    caloriesPerUnit: 380,
  },
  {
    label: 'Wrap',
    aliases: ['wrap'],
    caloriesPerUnit: 320,
  },
  {
    label: 'Burger',
    aliases: ['burger'],
    caloriesPerUnit: 520,
  },
  {
    label: 'Pizza slice',
    aliases: ['pizza slice', 'slice of pizza', 'pizza'],
    caloriesPerUnit: 285,
    unitLabel: 'slice',
  },
  {
    label: 'Fries',
    aliases: ['fries', 'french fries'],
    caloriesPerUnit: 365,
  },
  {
    label: 'Oatmeal',
    aliases: ['oatmeal', 'porridge'],
    caloriesPerUnit: 150,
    unitLabel: 'bowl',
  },
  {
    label: 'Salad',
    aliases: ['salad'],
    caloriesPerUnit: 180,
    unitLabel: 'bowl',
  },
  {
    label: 'Soup',
    aliases: ['soup'],
    caloriesPerUnit: 190,
    unitLabel: 'bowl',
  },
  {
    label: 'Pasta',
    aliases: ['pasta'],
    caloriesPerUnit: 420,
    unitLabel: 'bowl',
  },
  {
    label: 'Egg',
    aliases: ['eggs', 'egg'],
    caloriesPerUnit: 78,
  },
  {
    label: 'Toast',
    aliases: ['toast'],
    caloriesPerUnit: 80,
    unitLabel: 'slice',
  },
  {
    label: 'Banana',
    aliases: ['banana'],
    caloriesPerUnit: 105,
  },
  {
    label: 'Apple',
    aliases: ['apple'],
    caloriesPerUnit: 95,
  },
  {
    label: 'Chicken breast',
    aliases: ['chicken breast', 'chicken'],
    caloriesPerUnit: 165,
    unitLabel: 'serving',
  },
  {
    label: 'Rice',
    aliases: ['rice'],
    caloriesPerUnit: 205,
    unitLabel: 'cup',
  },
  {
    label: 'Latte',
    aliases: ['latte'],
    caloriesPerUnit: 190,
  },
  {
    label: 'Coffee',
    aliases: ['coffee', 'black coffee'],
    caloriesPerUnit: 5,
    unitLabel: 'cup',
  },
  {
    label: 'Smoothie',
    aliases: ['smoothie'],
    caloriesPerUnit: 260,
  },
  {
    label: 'Milk',
    aliases: ['milk'],
    caloriesPerUnit: 120,
    unitLabel: 'cup',
  },
  {
    label: 'Orange juice',
    aliases: ['orange juice', 'juice'],
    caloriesPerUnit: 110,
    unitLabel: 'glass',
  },
  {
    label: 'Soda',
    aliases: ['soda', 'cola'],
    caloriesPerUnit: 150,
    unitLabel: 'can',
  },
  {
    label: 'Sparkling water',
    aliases: ['sparkling water'],
    caloriesPerUnit: 0,
    unitLabel: 'can',
  },
  {
    label: 'Water',
    aliases: ['water'],
    caloriesPerUnit: 0,
    unitLabel: 'glass',
  },
  {
    label: 'Nuts',
    aliases: ['nuts'],
    caloriesPerUnit: 170,
    unitLabel: 'handful',
  },
];

type MatchedComponent = {
  item: FoodItem;
  quantity: number;
  source: string;
  showQuantity: boolean;
};

const normalizePhrase = (value: string) =>
  value
    .toLowerCase()
    .replace(/[_/]/g, ' ')
    .replace(/[^\w\s.+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const titleCase = (value: string) =>
  value.replace(/\b\w/g, (character) => character.toUpperCase());

const parseQuantity = (segment: string) => {
  const compact = segment.trim();
  const numberMatch = compact.match(/(^|\s)(\d+(?:\.\d+)?)(?=\s|$)/);

  if (numberMatch) {
    const numeric = Number.parseFloat(numberMatch[2]);

    if (Number.isFinite(numeric) && numeric > 0) {
      return {
        value: numeric,
        explicit: true,
      };
    }
  }

  for (const [word, value] of Object.entries(QUANTITY_WORDS)) {
    if (new RegExp(`(^|\\s)${word}(?=\\s|$)`).test(compact)) {
      return {
        value,
        explicit: true,
      };
    }
  }

  return {
    value: 1,
    explicit: false,
  };
};

const parseSizeMultiplier = (segment: string) => {
  const compact = segment.trim();

  for (const [word, value] of Object.entries(SIZE_MULTIPLIERS)) {
    if (new RegExp(`(^|\\s)${word}(?=\\s|$)`).test(compact)) {
      return value;
    }
  }

  return 1;
};

const formatComponentLabel = (component: MatchedComponent) => {
  if (!component.showQuantity) {
    return component.item.label;
  }

  const roundedQuantity =
    component.quantity % 1 === 0
      ? String(component.quantity)
      : component.quantity.toFixed(1).replace(/\.0$/, '');

  if (component.quantity === 1) {
    return component.item.label;
  }

  const label =
    component.item.label === 'Egg'
      ? 'Eggs'
      : component.item.label === 'Pizza slice'
        ? 'Pizza slices'
        : component.item.label;

  return `${roundedQuantity} ${label}`;
};

const matchSegment = (segment: string) => {
  const normalized = normalizePhrase(segment);

  if (!normalized) {
    return null;
  }

  const sortedItems = [...FOOD_ITEMS].sort((left, right) => {
    const leftLongest = Math.max(...left.aliases.map((alias) => alias.length));
    const rightLongest = Math.max(...right.aliases.map((alias) => alias.length));
    return rightLongest - leftLongest;
  });

  const item = sortedItems.find((candidate) =>
    candidate.aliases.some((alias) => normalized.includes(alias)),
  );

  if (!item) {
    return null;
  }

  const quantityInfo = parseQuantity(normalized);
  const quantity = quantityInfo.value * parseSizeMultiplier(normalized);

  return {
    item,
    quantity,
    source: normalized,
    showQuantity: quantityInfo.explicit && quantity !== 1,
  } satisfies MatchedComponent;
};

export const estimateMealFromWords = (input: string): EstimatedMeal | null => {
  const normalized = normalizePhrase(input);

  if (!normalized) {
    return null;
  }

  const parts = normalized
    .split(/\s(?:and|with)\s|,|\+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const segments = parts.length > 0 ? parts : [normalized];
  const matches = segments
    .map((segment) => matchSegment(segment))
    .filter((match): match is MatchedComponent => match !== null);

  if (matches.length === 0) {
    return null;
  }

  const calories = Math.round(
    matches.reduce(
      (total, component) => total + component.item.caloriesPerUnit * component.quantity,
      0,
    ),
  );
  const name =
    matches.length === 1
      ? formatComponentLabel(matches[0])
      : matches.map((component) => formatComponentLabel(component)).join(' + ');
  const originalPhrase = input.trim().replace(/\s+/g, ' ');

  return {
    name: titleCase(name),
    calories,
    note: `Estimated from words: ${originalPhrase}.`,
  };
};
