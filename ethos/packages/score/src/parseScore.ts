import { type LookupInterval, type IntervalRange, type ScoreElement } from './score.types';
import { type ScoreCalculation, isValidOperation, newCalculation } from './scoreCalculation';
import { newConstantElement, newLookupNumber } from './scoreElements';
/**
 * OVERVIEW
 *
 * This file contains functions for parsing arbitrary YAML score configurations into general form.
 * This allows users to define arbitrary score calculations using the same on-chain behavior used to
 * calculate all Ethos scores.
 *
 * Example:
 * (1000 * [Ethereum Address Age] * [Twitter Account Age]) + [Ethos Invitation Source Credibility] * 0.5
 *
 * becomes:
 * (root node): +
 *              |  *
 *              |  | 1000
 *              |  | [Ethereum Address Age]
 *              |  | [Twitter Account Age]
 *              |
 *              |  *
 *                 | [Ethos Invitation Source Credibility]
 *                 | 0.5
 *
 * The tree structure allows for the order of operations to be preserved.
 * ScoreElements refer to mathematical operations, constants, and custom elements (e.g. Ethereum Address Age).
 * ScoreCalculations are a subtype of ScoreElement, so they can be nested within each other and applied recursively.
 * Only ScoreCalculations are always nodes of the tree; other ScoreElements are always leaves.
 */

/**
 * Parses score calculation YAML into a tree structure describing the corresponding
 *  operations, elements, and values.
 * @param score - The score calculation string.
 * @param elements - The array of score elements.
 * @returns The ScoreCalculation object.
 */
export function parseScoreCalculation(score: string, elements: ScoreElement[]): ScoreCalculation {
  return walkTree(parensToTree(score), elements);
}

/**
 * Parses the custom element definitions from the JSON into an array of custom elements
 * @param elements - The custom element definitions.
 * @returns An array of ScoreElement objects.
 * @throws Error if an unsupported element type is encountered.
 */
export function parseCustomElementDefinition(elements: any): ScoreElement[] {
  const se: ScoreElement[] = [];

  for (const name in elements) {
    const definition: Record<string, unknown> = elements[name];
    const elementType = Object.keys(definition)[0];
    const elementConfig = definition[elementType];
    switch (elementType) {
      case 'Interval':
        se.push(parseIntervalDefinition(name, validateIntervalConfig(name, elementConfig)));
        break;
      case 'Range':
        se.push(newLookupNumber(name, validateRangeConfig(name, elementConfig)));
        break;
      default:
        throw new Error(`Unsupported element type: ${elementType}`);
    }
  }

  return se;
}

/**
 * Parses JSON output into a Custom Element of type Interval.
 * @param name - The name of the interval.
 * @param intervals - The interval definition as the result of parsing.
 * @returns The Interval object.
 * @throws Error if an unsupported operator is encountered.
 */
function parseIntervalDefinition(name: string, intervals: string[]): LookupInterval {
  const ranges: IntervalRange[] = [];

  for (const record of intervals) {
    const spec = record.split(' ');
    const operator = spec[0];
    const num = parseFloat(spec[1]);
    const score = parseFloat(spec[2]);

    const range: IntervalRange = {
      score,
      start: undefined,
      end: undefined,
    };
    switch (operator) {
      case '<':
        range.end = num;
        break;
      case '/>':
        range.start = num;
        break;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
    ranges.push(range);
  }

  resolveOverlaps(ranges);
  const x: LookupInterval = {
    name,
    type: 'LookupInterval',
    ranges,
    outOfRangeScore: 0,
  };

  return x;
}

/**
 * For Interval custom elements, traverse the specified ranges
 * and set start/end values so that there are no overlaps.
 * @param ranges - The array of IntervalRange objects.
 */
function resolveOverlaps(ranges: IntervalRange[]): void {
  for (const outer of ranges) {
    for (const inner of ranges) {
      if (outer === inner) {
        continue;
      }
      if (outer.start === undefined && inner.start === undefined) {
        if (outer.end === undefined || inner.end === undefined) {
          continue;
        }
        if (outer.end > inner.end) {
          outer.start = inner.end;
        }
        if (inner.end > outer.end) {
          inner.start = outer.end;
        }
      }
      if (outer.end === undefined && inner.end === undefined) {
        if (outer.start === undefined || inner.start === undefined) {
          continue;
        }
        if (outer.start < inner.start) {
          outer.end = inner.start;
        }
        if (inner.start < outer.start) {
          inner.end = outer.start;
        }
      }
    }
  }
}

// custom nested interface for forming element trees
type NestedElements = {
  [key: string]: NestedElements[] | string[];
};

/**
 * Parses an array of strings into Score Elements by name, operation, or numerical value.
 * It will replace any [named elements] with CustomElements provided in the original YAML.
 * @param elementStrings - The array of element strings.
 * @param customElements - The array of custom ScoreElement objects.
 * @returns An array of ScoreElement objects.
 * @throws Error if a custom element is not found or if an invalid element is encountered.
 */
export function stringsToElements(
  elementStrings: string[],
  customElements: ScoreElement[],
): ScoreElement[] {
  const elements: ScoreElement[] = [];

  // convert each value into a score element
  for (const v of elementStrings) {
    // lookups are contained in brackets ex: [Ethereum Address Age]
    if (v.startsWith('[') && v.endsWith(']')) {
      // find the custom element by name
      const customElement = customElements.find((e) => e.name === v.slice(1, -1));

      if (!customElement) {
        throw new Error(`Custom element not found: ${v}`);
      }
      elements.push(customElement);
    }
    // math operators are contained in the set validOperations
    else if (isValidOperation(v)) {
      elements.push(newCalculation(v));
    }
    // constants are numbers
    else if (!isNaN(parseFloat(v))) {
      elements.push(newConstantElement(v, parseFloat(v)));
    }
    // if it's none of the above, it's invalid
    else {
      throw new Error(`Invalid element: ${v}`);
    }
  }

  return elements;
}

/**
 * Translates a sequential mathematical operations into a nested tree of ScoreCalculation objects.
 * This allows specifying the order of operations and grouping elements together using parenthesis.
 * Non-mathematical operations form the final layer of leaves on the tree.
 * @param elements - The array of ScoreElement objects.
 * @returns The root ScoreCalculation object.
 */
export function elementsToCalculationTree(elements: ScoreElement[]): ScoreCalculation {
  let rootCalculation = newCalculation('+'); // default to addition
  const queue: ScoreElement[] = [];
  let topCalculation = rootCalculation;
  let first = true;

  for (const element of elements) {
    // if it's not a calculation, add it to the queue
    if (element.type !== 'Calculation') {
      queue.push(element);
      continue;
    }

    // add all previous elements as the first children
    element.elements.push(...queue);
    queue.length = 0; // empty the queue

    // if this is the first operation, set it as root
    if (first) {
      rootCalculation = element;
      topCalculation = element;
      first = false;
      continue;
    }
    // otherwise
    topCalculation.elements.push(element); // add this calculation to the top calculation
    topCalculation = element; // set this as the new top calculation
  }
  // add any remaining elements to the last calculation
  topCalculation.elements.push(...queue);

  return rootCalculation;
}

/**
 * Walks the nexted elements tree and converts each node to a ScoreCalculation and each
 * leaf to a ScoreElement. It will insert any CustomElements provided in the original YAML
 * into the appropriate leaf nodes as declared by [element name].
 * @param tree - The nested elements tree.
 * @param customElements - The array of custom ScoreElement objects.
 * @returns The root ScoreCalculation object.
 */
function walkTree(tree: NestedElements, customElements: ScoreElement[]): ScoreCalculation {
  const rootCalculation = newCalculation('+');

  for (const key in tree) {
    const value = tree[key];

    // if the value is []string then convert to elements
    if (Array.isArray(value) && typeof value[0] === 'string') {
      const elements = stringsToElements(value as string[], customElements);
      const calculations = elementsToCalculationTree(elements);
      rootCalculation.elements.push(calculations);
    }
    // if the value is []nestedElements then walk the tree and add as children to the root calculation
    else if (Array.isArray(value) && typeof value[0] === 'object') {
      rootCalculation.elements.push(walkTree(value[0], customElements));
    }
  }

  return rootCalculation;
}

/**
 * Converts a score calculation string with parentheses to a nested elements tree.
 * @param score - The score calculation string.
 * @returns The nested elements tree.
 */
export function parensToTree(score: string): NestedElements {
  const levels: NestedElements = {};
  let depth = 0;
  let currentString = '';

  for (const c of score) {
    if (c === '(') {
      if (depth === 0) {
        if (currentString.length > 0) {
          levels[currentString] = tokenizeScore(currentString);
        }
        currentString = '';
      }
      depth++;
    }
    currentString += c;

    if (c === ')') {
      depth--;

      if (depth === 0) {
        const substring = currentString.slice(1, -1);
        levels[currentString] = [parensToTree(substring)];
        currentString = '';
      }
    }
  }

  if (currentString.length > 0) {
    levels[currentString] = tokenizeScore(currentString);
  }

  return levels;
}

/**
 * Tokenizes a score calculation string and returns an array of individual element strings.
 * @param score - The score calculation string.
 * @returns An array of elements.
 */
export function tokenizeScore(score: string): string[] {
  return score
    .split(/([+*/^()])/)
    .filter((s) => s.trim() !== '')
    .map((t) => t.trim());
}

function validateRangeConfig(name: string, config: unknown): [number, number] {
  if (
    Array.isArray(config) &&
    config.length === 2 &&
    typeof config[0] === 'number' &&
    typeof config[1] === 'number'
  ) {
    return [config[0], config[1]];
  }
  throw new Error(`Invalid Range configuration for element: ${name}`);
}

function validateIntervalConfig(name: string, config: unknown): string[] {
  if (Array.isArray(config) && config.every((item) => typeof item === 'string')) {
    return config;
  }
  throw new Error(`Invalid Interval configuration for element: ${name}`);
}
