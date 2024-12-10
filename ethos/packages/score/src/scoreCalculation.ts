import { type ScoreElementBase, type ElementInputs, type ScoreElement } from './score.types.js';
import { calculateElement } from './scoreElements.js';

/**
 * Applies a mathematical operation against a set of score components.
 * The operation will be applied to each component in sequence.
 * ScoreCalculations can be nested to represent complex operations and order of operations.
 */
export type ScoreCalculation = {
  operation: ScoreCalculationOperation;
  elements: ScoreElement[];
} & ScoreElementBase;

export function calculateScore(
  rootCalculation: ScoreCalculation,
  inputs: ElementInputs,
): { score: number } {
  const { score } = calculateElement(rootCalculation, inputs);

  if (score < 0) return { score: 0 };

  return { score: Math.round(score) };
}

const validOperations = ['+', '-', '*', '/', '^', 'log', 'sqrt', 'abs', 'ceil', 'floor'] as const;

type ScoreCalculationOperation = (typeof validOperations)[number];

export function isValidOperation(operation: string): operation is ScoreCalculationOperation {
  return validOperations.includes(operation as ScoreCalculationOperation);
}

export function newCalculation(operation: string): ScoreCalculation {
  if (isValidOperation(operation)) {
    return {
      name: operation,
      type: 'Calculation',
      operation,
      elements: [] as ScoreElement[],
    };
  }
  throw new Error(`Invalid operation: ${operation}`);
}

export function applyCalculation(
  calculation: ScoreCalculation,
  inputs: ElementInputs,
): { score: number } {
  switch (calculation.operation) {
    case '+':
      return {
        score: calculation.elements.reduce(
          (sum, element) => sum + calculateElement(element, inputs).score,
          0,
        ),
      };
    case '-':
      return {
        score: calculation.elements.reduce(
          (diff, element) => diff - calculateElement(element, inputs).score,
          0,
        ),
      };
    case '*':
      return {
        score: calculation.elements.reduce(
          (product, element) => product * calculateElement(element, inputs).score,
          1,
        ),
      };
    case '/':
      return {
        score: calculation.elements.reduce(
          (quotient, element) => quotient / calculateElement(element, inputs).score,
          1,
        ),
      };
    case '^':
      return {
        score: calculation.elements.reduce(
          (power, element) => power ** calculateElement(element, inputs).score,
          1,
        ),
      };
    case 'log':
      return { score: Math.log(calculateElement(calculation.elements[0], inputs).score) };
    case 'sqrt':
      return { score: Math.sqrt(calculateElement(calculation.elements[0], inputs).score) };
    case 'abs':
      return { score: Math.abs(calculateElement(calculation.elements[0], inputs).score) };
    case 'ceil':
      return { score: Math.ceil(calculateElement(calculation.elements[0], inputs).score) };
    case 'floor':
      return { score: Math.floor(calculateElement(calculation.elements[0], inputs).score) };
    default:
      throw new Error(`Unsupported operation: ${String(calculation.operation)}`);
  }
}
