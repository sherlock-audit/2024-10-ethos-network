import { toNumber } from '@ethos/helpers';
import { DEFAULT_STARTING_SCORE } from '@ethos/score';
import { colorsMap, getColorByScore } from '../helpers/components-helper.ts';
import { dataFetchingService } from '../service/data-fetching-service.ts';

export async function getScoresMapForAddresses(addresses: string[]) {
  const addressesData = await Promise.all(
    addresses.map(async (address) => {
      const scoreData = await dataFetchingService.fetchCredibilityScoreFromEthAddress(address);
      const score = toNumber(scoreData.score, DEFAULT_STARTING_SCORE);
      const color = getColorByScore(score);

      return {
        address,
        score,
        color,
      };
    }),
  );

  const scoresForAddressesMap = addressesData.reduce((acc: Record<string, typeof curr>, curr) => {
    acc[curr.address] = curr;

    return acc;
  }, {});

  return scoresForAddressesMap;
}

export async function getScoresMapForEnsNames(ensNames: string[]) {
  const ensNamesData = await Promise.all(
    ensNames.map(async (ensName) => {
      let color = colorsMap.neutral;
      const ethAddress = await dataFetchingService.convertEnsToEthAddress(ensName);
      let score = DEFAULT_STARTING_SCORE;

      if (ethAddress) {
        const scoreData = await dataFetchingService.fetchCredibilityScoreFromEthAddress(ethAddress);
        score = toNumber(scoreData.score, DEFAULT_STARTING_SCORE);
        color = getColorByScore(score);
      }

      return {
        ensName,
        score,
        color,
      };
    }),
  );

  const scoresMapForEnsNames = ensNamesData.reduce((acc: Record<string, typeof curr>, curr) => {
    acc[curr.ensName] = curr;

    return acc;
  }, {});

  return scoresMapForEnsNames;
}
