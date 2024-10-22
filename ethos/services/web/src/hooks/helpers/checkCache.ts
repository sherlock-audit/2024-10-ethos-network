import { type Query, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { isEqual } from 'lodash-es';

export async function checkCache(queryClient: QueryClient) {
  if (queryClient) {
    const queries = queryClient.getQueryCache().getAll();
    // eslint-disable-next-line no-console
    console.log(`testing: ${queries.length}`);

    let completed = 0;
    const results = await Promise.all(
      queries.map(async (query) => {
        const observers = query.observers;
        query.observers = [];
        const result = await checkQuery(query);
        query.observers = observers;

        completed++;
        // eslint-disable-next-line no-console
        console.log(`tested: ${completed}/${queries.length}`);

        return result;
      }),
    );

    // eslint-disable-next-line no-console
    console.log('failed queries');
    results
      .filter((x) => x && x.type === 'error')
      .forEach((x) => {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(x?.key));
      });

    // eslint-disable-next-line no-console
    console.log('outdated queries');
    results
      .filter((x) => x && x.type === 'outdated')
      .forEach((x) => {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(x?.key));
        // eslint-disable-next-line no-console
        console.log((x as any).current);
        // eslint-disable-next-line no-console
        console.log((x as any).updated);
      });
  }
}

type QueryResult =
  | {
      type: 'outdated';
      key: QueryKey;
      current: any;
      updated: any;
    }
  | {
      type: 'error';
      key: QueryKey;
      err: unknown;
    }
  | null;

async function checkQuery(query: Query): Promise<QueryResult> {
  try {
    const current = query.state.data;
    const updated = await query.fetch();

    if (!isEqual(current, updated)) {
      return {
        type: 'outdated',
        key: query.queryKey,
        current,
        updated,
      };
    }
  } catch (err) {
    return {
      type: 'error',
      key: query.queryKey,
      err,
    };
  }

  return null;
}
