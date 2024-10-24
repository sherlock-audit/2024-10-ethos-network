import { convertScoreElementToCredibilityFactor } from '../convertScore';
import {
  parensToTree,
  tokenizeScore,
  parseScoreCalculation,
  stringsToElements,
  elementsToCalculationTree,
  parseCustomElementDefinition,
} from '../parseScore';
import { parseScoreConfig } from '../parseScoreConfig';
import {
  type ConstantValueElement,
  type ScoreElement,
  type LookupInterval,
  type LookupNumber,
} from '../score.types';
import { type ScoreCalculation } from '../scoreCalculation';

describe('parseScoreElements', () => {
  it('should handle empty score', () => {
    const score = '';
    expect(parensToTree(score)).toMatchInlineSnapshot(`{}`);
  });

  it('should handle single level score', () => {
    const score = '(A)';
    expect(parensToTree(score)).toMatchInlineSnapshot(`
      {
        "(A)": [
          {
            "A": [
              "A",
            ],
          },
        ],
      }
    `);
  });

  it('should handle multiple levels', () => {
    const score = '(A (B (C))) + ((D (E (F (G)))) + (H (I)))';
    expect(parensToTree(score)).toMatchInlineSnapshot(`
      {
        " + ": [
          "+",
        ],
        "((D (E (F (G)))) + (H (I)))": [
          {
            " + ": [
              "+",
            ],
            "(D (E (F (G))))": [
              {
                "(E (F (G)))": [
                  {
                    "(F (G))": [
                      {
                        "(G)": [
                          {
                            "G": [
                              "G",
                            ],
                          },
                        ],
                        "F ": [
                          "F",
                        ],
                      },
                    ],
                    "E ": [
                      "E",
                    ],
                  },
                ],
                "D ": [
                  "D",
                ],
              },
            ],
            "(H (I))": [
              {
                "(I)": [
                  {
                    "I": [
                      "I",
                    ],
                  },
                ],
                "H ": [
                  "H",
                ],
              },
            ],
          },
        ],
        "(A (B (C)))": [
          {
            "(B (C))": [
              {
                "(C)": [
                  {
                    "C": [
                      "C",
                    ],
                  },
                ],
                "B ": [
                  "B",
                ],
              },
            ],
            "A ": [
              "A",
            ],
          },
        ],
      }
    `);
  });

  it('should parse score elements correctly', () => {
    const score =
      '(1000 * [Ethereum Address Age] * [Twitter Account Age]) + [Ethos Invitation Source Credibility] * 0.5';
    expect(parensToTree(score)).toMatchInlineSnapshot(`
      {
        " + [Ethos Invitation Source Credibility] * 0.5": [
          "+",
          "[Ethos Invitation Source Credibility]",
          "*",
          "0.5",
        ],
        "(1000 * [Ethereum Address Age] * [Twitter Account Age])": [
          {
            "1000 * [Ethereum Address Age] * [Twitter Account Age]": [
              "1000",
              "*",
              "[Ethereum Address Age]",
              "*",
              "[Twitter Account Age]",
            ],
          },
        ],
      }
    `);
  });
});

describe('tokenize', () => {
  it('should tokenize score correctly', () => {
    const score =
      '(1000 * [Ethereum Address Age] * [Twitter Account Age]) + [Ethos Invitation Source Credibility] * 0.5';
    expect(tokenizeScore(score)).toMatchInlineSnapshot(`
      [
        "(",
        "1000",
        "*",
        "[Ethereum Address Age]",
        "*",
        "[Twitter Account Age]",
        ")",
        "+",
        "[Ethos Invitation Source Credibility]",
        "*",
        "0.5",
      ]
    `);
  });
});

describe('stringsToElements', () => {
  const customElements: ScoreElement[] = [
    {
      name: 'Ethereum Address Age',
      type: 'LookupInterval',
      ranges: [],
      outOfRangeScore: 0,
    },
    {
      name: 'Twitter Account Age',
      type: 'LookupInterval',
      ranges: [],
      outOfRangeScore: 0,
    },
  ];
  it('should convert element strings to score elements', () => {
    const elementStrings = ['[Ethereum Address Age]', '+', '1000', '*', '[Twitter Account Age]'];
    expect(stringsToElements(elementStrings, customElements)).toMatchInlineSnapshot(`
      [
        {
          "name": "Ethereum Address Age",
          "outOfRangeScore": 0,
          "ranges": [],
          "type": "LookupInterval",
        },
        {
          "elements": [],
          "name": "+",
          "operation": "+",
          "type": "Calculation",
        },
        {
          "name": "1000",
          "type": "Constant",
          "value": 1000,
        },
        {
          "elements": [],
          "name": "*",
          "operation": "*",
          "type": "Calculation",
        },
        {
          "name": "Twitter Account Age",
          "outOfRangeScore": 0,
          "ranges": [],
          "type": "LookupInterval",
        },
      ]
    `);
  });

  it('should throw an error for invalid element strings', () => {
    const elementStrings = ['[Ethereum Address Age]', '+', 'abc', '*', '[Twitter Account Age]'];
    expect(() => stringsToElements(elementStrings, customElements)).toThrow('Invalid element: abc');
  });
});

describe('elementsToCalculationTree', () => {
  it('should convert elements to calculation tree', () => {
    // eth age + 1000 * twitter age
    const elements: ScoreElement[] = [
      {
        name: 'Ethereum Address Age',
        type: 'LookupInterval',
        ranges: [],
        outOfRangeScore: 0,
      },
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      {
        name: '+',
        type: 'Calculation',
        operation: '+',
        elements: [],
      } as ScoreCalculation,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      {
        name: '1000',
        type: 'Constant',
        value: 1000,
      } as ConstantValueElement,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      {
        name: '*',
        type: 'Calculation',
        operation: '*',
        elements: [],
      } as ScoreCalculation,
      {
        name: 'Twitter Account Age',
        type: 'LookupInterval',
        ranges: [],
        outOfRangeScore: 0,
      },
    ];
    expect(elementsToCalculationTree(elements)).toMatchInlineSnapshot(`
      {
        "elements": [
          {
            "name": "Ethereum Address Age",
            "outOfRangeScore": 0,
            "ranges": [],
            "type": "LookupInterval",
          },
          {
            "elements": [
              {
                "name": "1000",
                "type": "Constant",
                "value": 1000,
              },
              {
                "name": "Twitter Account Age",
                "outOfRangeScore": 0,
                "ranges": [],
                "type": "LookupInterval",
              },
            ],
            "name": "*",
            "operation": "*",
            "type": "Calculation",
          },
        ],
        "name": "+",
        "operation": "+",
        "type": "Calculation",
      }
    `);
  });
});

describe('parseScoreCalculation', () => {
  const customElements: ScoreElement[] = [
    {
      name: 'Ethereum Address Age',
      type: 'LookupInterval',
      ranges: [],
      outOfRangeScore: 0,
    },
    {
      name: 'Twitter Account Age',
      type: 'LookupInterval',
      ranges: [],
      outOfRangeScore: 0,
    },
    {
      name: 'Ethos Invitation Source Credibility',
      type: 'LookupNumber',
      range: { min: -400, max: 400 },
    },
  ];
  it('should parse single score calculation', () => {
    const score = '1000 + [Ethereum Address Age]';
    expect(parseScoreCalculation(score, customElements)).toMatchInlineSnapshot(`
      {
        "elements": [
          {
            "elements": [
              {
                "name": "1000",
                "type": "Constant",
                "value": 1000,
              },
              {
                "name": "Ethereum Address Age",
                "outOfRangeScore": 0,
                "ranges": [],
                "type": "LookupInterval",
              },
            ],
            "name": "+",
            "operation": "+",
            "type": "Calculation",
          },
        ],
        "name": "+",
        "operation": "+",
        "type": "Calculation",
      }
    `);
  });

  it('should parse larger score calculations correctly', () => {
    const score =
      '(1000 * [Ethereum Address Age] * [Twitter Account Age]) + [Ethos Invitation Source Credibility] * 0.5';
    expect(parseScoreCalculation(score, customElements)).toMatchInlineSnapshot(`
      {
        "elements": [
          {
            "elements": [
              {
                "elements": [
                  {
                    "name": "1000",
                    "type": "Constant",
                    "value": 1000,
                  },
                  {
                    "elements": [
                      {
                        "name": "Ethereum Address Age",
                        "outOfRangeScore": 0,
                        "ranges": [],
                        "type": "LookupInterval",
                      },
                      {
                        "name": "Twitter Account Age",
                        "outOfRangeScore": 0,
                        "ranges": [],
                        "type": "LookupInterval",
                      },
                    ],
                    "name": "*",
                    "operation": "*",
                    "type": "Calculation",
                  },
                ],
                "name": "*",
                "operation": "*",
                "type": "Calculation",
              },
            ],
            "name": "+",
            "operation": "+",
            "type": "Calculation",
          },
          {
            "elements": [
              {
                "elements": [
                  {
                    "name": "Ethos Invitation Source Credibility",
                    "range": {
                      "max": 400,
                      "min": -400,
                    },
                    "type": "LookupNumber",
                  },
                  {
                    "name": "0.5",
                    "type": "Constant",
                    "value": 0.5,
                  },
                ],
                "name": "*",
                "operation": "*",
                "type": "Calculation",
              },
            ],
            "name": "+",
            "operation": "+",
            "type": "Calculation",
          },
        ],
        "name": "+",
        "operation": "+",
        "type": "Calculation",
      }
    `);
  });
});

describe('parseCustomElementDefinition', () => {
  it('should parse custom element definition correctly', () => {
    const customElement = `{
      "Ethereum Address Age": { "Interval": [ "< 5: 0.1", "< 90: 0.5", "/> 90: 1" ] }
    }`;
    const parsed = JSON.parse(customElement);
    expect(parseCustomElementDefinition(parsed)).toMatchInlineSnapshot(`
      [
        {
          "name": "Ethereum Address Age",
          "outOfRangeScore": 0,
          "ranges": [
            {
              "end": 5,
              "score": 0.1,
              "start": undefined,
            },
            {
              "end": 90,
              "score": 0.5,
              "start": 5,
            },
            {
              "end": undefined,
              "score": 1,
              "start": 90,
            },
          ],
          "type": "LookupInterval",
        },
      ]
    `);
  });
});

describe('parseScoreConfig', () => {
  it('should parse JSON score correctly', () => {
    expect(
      parseScoreConfig({
        expression: [
          '(1000 * [Ethereum Address Age] * [Twitter Account Age]) + [Ethos Invitation Source Credibility] * 0.5',
        ],

        elements: {
          'Ethereum Address Age': { Interval: ['< 5: 0.1', '< 90: 0.5', '/> 90: 1'] },
          'Twitter Account Age': { Interval: ['< 30: 0.1', '< 90: 0.5', '/> 90: 1'] },
          'Ethos Invitation Source Credibility': { Range: [-400, 400] },
        },
      }),
    ).toMatchInlineSnapshot(`
      {
        "elementDefinitions": [
          {
            "name": "Ethereum Address Age",
            "outOfRangeScore": 0,
            "ranges": [
              {
                "end": 5,
                "score": 0.1,
                "start": undefined,
              },
              {
                "end": 90,
                "score": 0.5,
                "start": 5,
              },
              {
                "end": undefined,
                "score": 1,
                "start": 90,
              },
            ],
            "type": "LookupInterval",
          },
          {
            "name": "Twitter Account Age",
            "outOfRangeScore": 0,
            "ranges": [
              {
                "end": 30,
                "score": 0.1,
                "start": undefined,
              },
              {
                "end": 90,
                "score": 0.5,
                "start": 30,
              },
              {
                "end": undefined,
                "score": 1,
                "start": 90,
              },
            ],
            "type": "LookupInterval",
          },
          {
            "name": "Ethos Invitation Source Credibility",
            "range": {
              "max": 400,
              "min": -400,
            },
            "type": "LookupNumber",
          },
        ],
        "rootCalculation": {
          "elements": [
            {
              "elements": [
                {
                  "elements": [
                    {
                      "name": "1000",
                      "type": "Constant",
                      "value": 1000,
                    },
                    {
                      "elements": [
                        {
                          "name": "Ethereum Address Age",
                          "outOfRangeScore": 0,
                          "ranges": [
                            {
                              "end": 5,
                              "score": 0.1,
                              "start": undefined,
                            },
                            {
                              "end": 90,
                              "score": 0.5,
                              "start": 5,
                            },
                            {
                              "end": undefined,
                              "score": 1,
                              "start": 90,
                            },
                          ],
                          "type": "LookupInterval",
                        },
                        {
                          "name": "Twitter Account Age",
                          "outOfRangeScore": 0,
                          "ranges": [
                            {
                              "end": 30,
                              "score": 0.1,
                              "start": undefined,
                            },
                            {
                              "end": 90,
                              "score": 0.5,
                              "start": 30,
                            },
                            {
                              "end": undefined,
                              "score": 1,
                              "start": 90,
                            },
                          ],
                          "type": "LookupInterval",
                        },
                      ],
                      "name": "*",
                      "operation": "*",
                      "type": "Calculation",
                    },
                  ],
                  "name": "*",
                  "operation": "*",
                  "type": "Calculation",
                },
              ],
              "name": "+",
              "operation": "+",
              "type": "Calculation",
            },
            {
              "elements": [
                {
                  "elements": [
                    {
                      "name": "Ethos Invitation Source Credibility",
                      "range": {
                        "max": 400,
                        "min": -400,
                      },
                      "type": "LookupNumber",
                    },
                    {
                      "name": "0.5",
                      "type": "Constant",
                      "value": 0.5,
                    },
                  ],
                  "name": "*",
                  "operation": "*",
                  "type": "Calculation",
                },
              ],
              "name": "+",
              "operation": "+",
              "type": "Calculation",
            },
          ],
          "name": "+",
          "operation": "+",
          "type": "Calculation",
        },
      }
    `);
  });
});

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
