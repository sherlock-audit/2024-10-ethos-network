import { useDebouncedValue } from '@ethos/common-ui';
import { duration } from '@ethos/helpers';
import { type HeadersFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { data, Form, type MetaFunction, useLoaderData, useSubmit } from '@remix-run/react';
import { Input, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { SearchIcon } from '~/components/icons/search.tsx';
import { MarketUserCard } from '~/components/markets/market-user-card.component.tsx';
import { SmallMarketCard } from '~/components/markets/small-market-card.component.tsx';
import { getTopVolumeMarkets, search } from '~/services.server/markets.ts';

// eslint-disable-next-line func-style
export const headers: HeadersFunction = ({ loaderHeaders }) => ({
  'Cache-Control': loaderHeaders.get('Cache-Control') ?? '',
});

// eslint-disable-next-line func-style
export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: data?.query?.length ? `Search results for "${data?.query}"` : 'Ethos Markets - Search',
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? '';

  if (!query) {
    const emptyState = await getTopVolumeMarkets(
      new Date(Date.now() - duration(1, 'day').toMilliseconds()),
      3,
    ).then((markets) => ({ users: [], markets }));

    return data(
      { resultType: 'suggestions', results: emptyState, query },
      // Cache the data when it's just the suggestions for the empty state.
      { headers: { 'Cache-Control': 'public, max-age=300' } },
    );
  }

  const results = await search(query);

  return { resultType: 'search', results, query };
}

export default function Search() {
  const { resultType, results, query } = useLoaderData<typeof loader>();
  const { markets, users } = results;
  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);
  const [input, setInput] = useState(query);
  const debouncedInput = useDebouncedValue(input, 500);

  useEffect(() => {
    submit(formRef.current);
  }, [debouncedInput, formRef, submit]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <Typography.Title level={3} className="block md:hidden">
        Search
      </Typography.Title>
      <Form ref={formRef} className="mb-4 mt-2">
        <Input
          name="q"
          size="large"
          autoFocus={true}
          placeholder="Look for markets or users..."
          prefix={<SearchIcon className="text-gray-400" />}
          onChange={(e) => {
            setInput(e.target.value);
          }}
          className="max-w-2xl md:hidden"
          allowClear={true}
          value={input}
        />
      </Form>

      <div className="grid gap-2 md:gap-4">
        <Typography.Title level={4}>
          {resultType === 'suggestions' ? 'Suggestions' : `Markets (${markets.length})`}
        </Typography.Title>
        {markets.length > 0 && markets.map((m) => <SmallMarketCard key={m.profileId} market={m} />)}
        {users.length > 0 && (
          <Typography.Title level={4}>{`Users (${users.length})`}</Typography.Title>
        )}
        {users.length > 0 && users.map((u) => <MarketUserCard key={u.address} user={u} />)}
      </div>
    </div>
  );
}
