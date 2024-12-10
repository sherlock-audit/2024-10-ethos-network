import { SearchOutlined } from '@ant-design/icons';
import { useDebouncedValue } from '@ethos/common-ui';
import { Link, useFetcher, useNavigate, useSearchParams } from '@remix-run/react';
import { AutoComplete, Flex, Form, Input, Skeleton, Typography, type InputRef } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { MarketAvatar } from '../avatar/market-avatar.component.tsx';
import { MarketUserAvatar } from '../avatar/user-avatar.component.tsx';
import { CalendarMonthIcon } from '../icons/calendar-month.tsx';
import { HandshakeIcon } from '../icons/handshake.tsx';
import { RelativeDateTime } from '../relative-time.component.tsx';
import { type loader as searchLoader } from '~/routes/search/route.tsx';
import { type Market } from '~/types/markets.ts';
import { type MarketUser } from '~/types/user.ts';
import { percentToTailwindTextClass } from '~/utils/percent.utils.ts';

export function SearchBar() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const debouncedQuery = useDebouncedValue(query, 500);
  const fetcher = useFetcher<typeof searchLoader>();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  useEffect(() => {
    if (fetcher.state !== 'idle') return;
    const queryParams = new URLSearchParams();
    queryParams.set('q', debouncedQuery);
    fetcher.load(`/search?${queryParams.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const inputRef = useRef<InputRef>(null);

  useHotkeys(
    'mod+k',
    () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    { preventDefault: true },
  );

  const loadingOptions = [
    {
      value: '',
      type: 'loading',
      label: <AutoCompleteSkeleton />,
    },
  ];

  const resultOptions = useMemo(() => {
    const { markets = [], users = [] } = fetcher.data?.results ?? {};

    return [
      ...markets.map((market) => ({
        value: String(market.profileId),
        type: 'market',
        label: <AutocompleteMarketOption market={market} />,
      })),
      ...users.map((user) => ({
        value: user.address,
        type: 'user',
        label: <AutocompleteUserOption user={user} />,
      })),
    ];
  }, [fetcher.data?.results]);

  function onSelect(value: string, option: (typeof resultOptions)[number]) {
    if (option.type === 'loading') return;
    if (option.type === 'market') {
      navigate(`/market/${value}`);
    } else {
      navigate(`/profile/${value}`);
    }

    form.resetFields();
    setQuery('');
  }

  return (
    <Form form={form} method="get" action="/search">
      <AutoComplete
        id="header-search"
        defaultActiveFirstOption={true}
        popupMatchSelectWidth={false}
        value={query}
        className="md:max-w-56 placeholder:text-antd-colorTextSecondary placeholder:text-sm"
        onSelect={onSelect}
        options={fetcher.state === 'loading' ? loadingOptions : resultOptions}
        notFoundContent={
          !resultOptions.length || debouncedQuery?.trim() ? 'No markets or users found' : null
        }
      >
        <Input
          prefix={<SearchOutlined />}
          size="middle"
          value={query}
          placeholder="Search"
          ref={inputRef}
          name="q"
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          spellCheck="false"
          autoCorrect="off"
        />
      </AutoComplete>
    </Form>
  );
}

function AutoCompleteSkeleton() {
  return <Skeleton avatar paragraph={{ rows: 1 }} active title={false} />;
}

function AutocompleteMarketOption({ market }: { market: Market }) {
  return (
    <Link to={`/market/${market.profileId}`} className="relative">
      <Flex align="center" justify="left" gap={16} className="p-2">
        <MarketAvatar avatarUrl={market.avatarUrl} size="xs" />
        <Flex vertical justify="space-between">
          <Typography.Text
            type="secondary"
            className={percentToTailwindTextClass(market.trustPercentage)}
          >
            <span>
              <HandshakeIcon /> {Math.round(market.trustPercentage)}% Trust in
            </span>
          </Typography.Text>
          <Typography.Title level={5}>{market.name}</Typography.Title>
        </Flex>
      </Flex>
    </Link>
  );
}

function AutocompleteUserOption({ user }: { user: MarketUser }) {
  return (
    <Link to={`/profile/${user.address}`} className="relative">
      <Flex align="center" justify="left" gap={16} className="p-2">
        <MarketUserAvatar
          avatarUrl={user.avatarUrl}
          size="xs"
          ethosScore={user.ethosInfo.score}
          address={user.address}
          showLink={false}
        />
        <Flex vertical justify="space-between">
          <Typography.Text type="secondary">
            {user.username} - {user.name}
          </Typography.Text>
          <span>
            <CalendarMonthIcon className="opacity-65 text-antd-colorTextSecondary" />
            {user.createdDate && (
              <Typography.Text type="secondary" className="text-xs whitespace-nowrap">
                <RelativeDateTime timestamp={user.createdDate} verbose />
              </Typography.Text>
            )}
          </span>
        </Flex>
      </Flex>
    </Link>
  );
}
