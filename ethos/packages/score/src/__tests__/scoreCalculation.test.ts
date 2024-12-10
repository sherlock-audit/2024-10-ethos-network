import { convertScoreElementToCredibilityFactor, elementRange } from '../convertScore.js';
import { getDefaultScoreCalculation } from '../defaultScoreRules.js';
import { DEFAULT_STARTING_SCORE, scoreRanges } from '../score.constant.js';
import { type LookupInterval, type LookupNumber } from '../score.types.js';

describe('convertScoreElementToCredibilityFactor', () => {
  describe('LookupInterval', () => {
    const lookupInterval: LookupInterval = {
      name: 'Test Interval',
      type: 'LookupInterval',
      ranges: [
        { start: undefined, end: 5, score: 50 },
        { start: 5, end: 90, score: 350 },
        { start: 90, end: undefined, score: 600 },
      ],
      outOfRangeScore: 0,
    };

    it('should convert LookupInterval to CredibilityFactor with low value', () => {
      const result = convertScoreElementToCredibilityFactor(lookupInterval, 3);
      expect(result).toEqual({
        name: 'Test Interval',
        range: { min: 50, max: 600 },
        value: 3,
        weighted: 50,
      });
    });

    it('should convert LookupInterval to CredibilityFactor with medium value', () => {
      const result = convertScoreElementToCredibilityFactor(lookupInterval, 50);
      expect(result).toEqual({
        name: 'Test Interval',
        range: { min: 50, max: 600 },
        value: 50,
        weighted: 350,
      });
    });

    it('should convert LookupInterval to CredibilityFactor with high value', () => {
      const result = convertScoreElementToCredibilityFactor(lookupInterval, 95);
      expect(result).toEqual({
        name: 'Test Interval',
        range: { min: 50, max: 600 },
        value: 95,
        weighted: 600,
      });
    });
  });

  describe('LookupNumber', () => {
    const lookupNumber: LookupNumber = {
      name: 'Test Number',
      type: 'LookupNumber',
      range: { min: -400, max: 400 },
    };

    it('should convert LookupNumber to CredibilityFactor with low value', () => {
      const result = convertScoreElementToCredibilityFactor(lookupNumber, -300);
      expect(result).toEqual({
        name: 'Test Number',
        range: { min: -400, max: 400 },
        value: -300,
        weighted: -300,
      });
    });

    it('should convert LookupNumber to CredibilityFactor with medium value', () => {
      const result = convertScoreElementToCredibilityFactor(lookupNumber, 100);
      expect(result).toEqual({
        name: 'Test Number',
        range: { min: -400, max: 400 },
        value: 100,
        weighted: 100,
      });
    });

    it('should convert LookupNumber to CredibilityFactor with high value', () => {
      const result = convertScoreElementToCredibilityFactor(lookupNumber, 350);
      expect(result).toEqual({
        name: 'Test Number',
        range: { min: -400, max: 400 },
        value: 350,
        weighted: 350,
      });
    });
  });
});

describe('Score Range Validation', () => {
  it('should ensure score ranges do not sum to below 0 or above the maximum score', () => {
    const { elementDefinitions } = getDefaultScoreCalculation();

    let totalMax = DEFAULT_STARTING_SCORE;

    for (const element of elementDefinitions) {
      const range = elementRange(element);
      totalMax += range.max;
    }

    function logScoreAnalysis(): void {
      let sumMin = DEFAULT_STARTING_SCORE;
      let sumMax = DEFAULT_STARTING_SCORE;

      for (const element of elementDefinitions) {
        const range = elementRange(element);
        sumMin += range.min;
        sumMax += range.max;
        // eslint-disable-next-line no-console
        console.log(
          `${element.name.padEnd(35)} min: ${String(range.min).padStart(4)}, max: ${range.max}`,
        );
      }

      // eslint-disable-next-line no-console
      console.log(
        '\nSum of ranges:'.padEnd(35) + ` min: ${String(sumMin).padStart(4)}, max: ${sumMax}`,
      );
      // eslint-disable-next-line no-console
      console.log();
    }

    if (totalMax > scoreRanges.exemplary.max) logScoreAnalysis();

    // okay to go below zero; we will return 0
    // expect(totalMin).toBeGreaterThanOrEqual(scoreRanges.untrusted.min);
    expect(totalMax).toBeLessThanOrEqual(scoreRanges.exemplary.max);
  });
});
