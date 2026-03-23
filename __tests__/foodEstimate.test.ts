import { estimateMealFromWords } from '../src/services/foodEstimate';

describe('estimateMealFromWords', () => {
  it('estimates a simple multi-item phrase', () => {
    expect(estimateMealFromWords('2 eggs and toast')).toEqual({
      name: '2 Eggs + Toast',
      calories: 236,
      note: 'Estimated from words: 2 eggs and toast.',
    });
  });

  it('applies size multipliers to drinks', () => {
    expect(estimateMealFromWords('large latte')).toEqual({
      name: 'Latte',
      calories: 247,
      note: 'Estimated from words: large latte.',
    });
  });

  it('returns null when the phrase cannot be mapped confidently', () => {
    expect(estimateMealFromWords('something mysterious')).toBeNull();
  });
});
