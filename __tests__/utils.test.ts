import { DEFAULT_SETTINGS } from '../src/constants';
import { calculateStreak, getDailySummaries, migrateAppState } from '../src/utils';

describe('migrateAppState', () => {
  it('fills in new v1 defaults when loading older state shapes', () => {
    const migrated = migrateAppState({
      xp: 20,
      meals: [{ id: 'm1', name: 'Salad', timestamp: 1_700_000_000_000 }],
    });

    expect(migrated.settings.dailyWaterGoalMl).toBe(DEFAULT_SETTINGS.dailyWaterGoalMl);
    expect(migrated.settings.remindersEnabled).toBe(false);
    expect(migrated.waterEntries).toEqual([]);
    expect(migrated.lastUpdatedAt).toBeGreaterThan(0);
  });
});

describe('calculateStreak', () => {
  it('counts consecutive completed days', () => {
    const now = new Date();
    now.setHours(10, 0, 0, 0);

    const today = now.getTime();
    const yesterday = today - 86400000;
    const twoDaysAgo = today - 86400000 * 2;

    const history = [
      { id: 'a', startTime: today - 16 * 3600000, targetHours: 16, completedAt: today },
      { id: 'b', startTime: yesterday - 16 * 3600000, targetHours: 16, completedAt: yesterday },
      { id: 'c', startTime: twoDaysAgo - 16 * 3600000, targetHours: 16, completedAt: twoDaysAgo },
    ];

    expect(calculateStreak(history)).toBeGreaterThanOrEqual(1);
  });
});

describe('getDailySummaries', () => {
  it('aggregates meals, water, and fasting into daily buckets', () => {
    const now = Date.now();
    const state = migrateAppState({
      fastHistory: [
        {
          id: 'f1',
          startTime: now - 16 * 3600000,
          completedAt: now - 1000,
          targetHours: 16,
        },
      ],
      meals: [
        {
          id: 'm1',
          name: 'Bowl',
          calories: 700,
          timestamp: now - 2000,
        },
      ],
      waterEntries: [
        {
          id: 'w1',
          amountMl: 500,
          timestamp: now - 3000,
        },
      ],
    });

    const latestDay = getDailySummaries(state, now, 1)[0];

    expect(latestDay.calories).toBe(700);
    expect(latestDay.waterMl).toBe(500);
    expect(latestDay.fastingHours).toBeGreaterThan(15);
  });
});
