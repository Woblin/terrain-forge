import { describe, expect, it } from 'vitest';
import { maxImbalance, readBalance } from './balanceMeter';
import { RULE_IDS } from './fairness';

describe('maxImbalance', () => {
  it('counts the rules R1 to R4 that are on', () => {
    expect(maxImbalance(RULE_IDS)).toBe(4);
    expect(maxImbalance(['coverInReach', 'halfBoard', 'coverage'])).toBe(2);
    expect(maxImbalance(['clearLane', 'coverage'])).toBe(0);
  });
});

describe('readBalance', () => {
  it('places the score on a scale from identical sides to every rule at its limit', () => {
    expect(readBalance(0, RULE_IDS)?.position).toBe(0);
    expect(readBalance(2, RULE_IDS)?.position).toBe(0.5);
    expect(readBalance(1, ['coverInReach', 'halfBoard'])?.position).toBe(0.5);
  });

  it('stops at the ends of the scale', () => {
    expect(readBalance(6, RULE_IDS)?.position).toBe(1);
    expect(readBalance(-0.1, RULE_IDS)?.position).toBe(0);
  });

  it('grades the score', () => {
    expect(readBalance(0.39, RULE_IDS)?.grade).toBe('Nearly even');
    expect(readBalance(0.4, RULE_IDS)?.grade).toBe('Slightly uneven');
    expect(readBalance(1.59, RULE_IDS)?.grade).toBe('Slightly uneven');
    expect(readBalance(1.6, RULE_IDS)?.grade).toBe('Uneven');
    expect(readBalance(2.99, RULE_IDS)?.grade).toBe('Uneven');
    expect(readBalance(3, RULE_IDS)?.grade).toBe('Close to the limit');
  });

  it('has nothing to show when no scored rule is on', () => {
    expect(readBalance(0, ['clearLane'])).toBeNull();
  });
});
