import { scoreRanges } from '@ethos/score';

export const scoreRangeData = [
  {
    id: 'Untrusted',
    label: `${scoreRanges.untrusted.min}-${scoreRanges.untrusted.max}`,
    value: scoreRanges.untrusted.max - scoreRanges.untrusted.min,
  },
  {
    id: 'Questionable',
    label: `${scoreRanges.questionable.min}-${scoreRanges.questionable.max}`,
    value: scoreRanges.questionable.max - scoreRanges.questionable.min,
  },
  {
    id: 'Neutral',
    label: `${scoreRanges.neutral.min}-${scoreRanges.neutral.max}`,
    value: scoreRanges.neutral.max - scoreRanges.neutral.min,
  },
  {
    id: 'Reputable',
    label: `${scoreRanges.reputable.min}-${scoreRanges.reputable.max}`,
    value: scoreRanges.reputable.max - scoreRanges.reputable.min,
  },
  {
    id: 'Exemplary',
    label: `${scoreRanges.exemplary.min}-${scoreRanges.exemplary.max}`,
    value: scoreRanges.exemplary.max - scoreRanges.exemplary.min,
  },
];
