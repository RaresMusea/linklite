import { describe, expect, it } from 'vitest';
import { riskLevelFromScore } from '@/lib/redirect_safety/redirect_scoring_risk_calculator';

describe('riskLevelFromScore', () => {
    it('returns high for scores at or above 5', () => {
        expect(riskLevelFromScore(5)).toBe('high');
        expect(riskLevelFromScore(10)).toBe('high');
    });

    it('Returns medium for scores from 3 up to 4.999...', () => {
        expect(riskLevelFromScore(3)).toBe('medium');
        expect(riskLevelFromScore(4.999)).toBe('medium');
    });

    it('Returns low for scores below 3', () => {
        expect(riskLevelFromScore(2.999)).toBe('low');
        expect(riskLevelFromScore(0)).toBe('low');
        expect(riskLevelFromScore(-1)).toBe('low');
    });
});
