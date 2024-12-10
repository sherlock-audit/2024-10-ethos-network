import { LoadingOutlined, SearchOutlined } from '@ant-design/icons';
import { css, type SerializedStyles } from '@emotion/react';
import { useDebouncedValue } from '@ethos/common-ui';
import { type ActivityActor, fromUserKey } from '@ethos/domain';
import { shortenHash } from '@ethos/helpers';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { AutoComplete, Flex, Form, Input, type InputRef, Space, Spin, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { type SubmitHandler } from 'react-hook-form';
import { useHotkeys } from 'react-hotkeys-hook';
import { UserAvatar } from 'components/avatar/avatar.component';
import { useSearchQuery } from 'hooks/api/echo.hooks';
import { getRouteTo } from 'hooks/user/hooks';

const { Text } = Typography;

type Inputs = {
  search: string;
};

async function routeToProfile(
  userkey: string,
  router: ReturnType<typeof useRouter>,
  queryClient: QueryClient,
) {
  const target = fromUserKey(userkey);
  const targetRouteTo = await getRouteTo(queryClient, target);
  router.push(targetRouteTo.profile);
}

function renderOption(actor: ActivityActor, isStale = false) {
  const target = fromUserKey(actor.userkey, true);
  let short = actor.name;

  if ('service' in target && actor.username) {
    short = `${target.service}/${actor.username}`;
  }
  if ('address' in target) {
    short = shortenHash(target.address);
  }

  return (
    <Flex
      align="middle"
      gap="small"
      css={css`
        width: 100%;
        margin-bottom: 4px;
        opacity: ${isStale ? 0.5 : 1};
      `}
    >
      <UserAvatar actor={actor} showHoverCard={false} renderAsLink={false} />
      <Space direction="vertical" size={0}>
        <Text strong ellipsis={{ suffix: '' }}>
          {actor.name}
        </Text>
        {actor.name !== short && <Typography.Text type="secondary">{short}</Typography.Text>}
      </Space>
    </Flex>
  );
}

export function SearchBar({
  isFullWidth = false,
  wrapperCSS,
}: {
  isFullWidth?: boolean;
  wrapperCSS?: SerializedStyles;
}) {
  const router = useRouter();
  const [form] = Form.useForm();
  const inputRef = useRef<InputRef>(null);
  const queryClient = useQueryClient();

  // "mod" is Cmd on macOS and Ctrl on Windows
  useHotkeys(
    'mod+k',
    () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    { preventDefault: true },
  );

  const value: string = Form.useWatch('search', form);
  const debouncedValue = useDebouncedValue(value, 200, true);

  const { data, isFetching } = useSearchQuery(debouncedValue?.trim());

  const actors: ActivityActor[] = data?.values ?? [];
  const sortedActors = [...actors].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // eslint-disable-next-line func-style
  const onSubmit: SubmitHandler<Inputs> = async ({ search }) => {
    form.resetFields();
    await routeToProfile(search, router, queryClient);
  };

  return (
    <Form form={form} onFinish={onSubmit} css={wrapperCSS}>
      <Form.Item
        name="search"
        css={css`
          margin: 0;
        `}
      >
        <AutoComplete
          id="header-search"
          popupMatchSelectWidth={false}
          css={css`
            height: auto;
            width: ${isFullWidth ? '100%' : '215px'};
          `}
          onSelect={async (newValue: string) => {
            if (!newValue?.trim()) return;

            form.resetFields();
            await routeToProfile(newValue, router, queryClient);
          }}
          options={sortedActors.map((actor) => ({
            value: actor.userkey,
            label: renderOption(actor, isFetching),
          }))}
          notFoundContent={
            !sortedActors.length || debouncedValue?.trim() ? 'No results found' : null
          }
        >
          <Input
            prefix={<SearchOutlined />}
            suffix={isFetching ? <Spin indicator={<LoadingOutlined spin />} /> : <div />}
            size="middle"
            placeholder="Search"
            ref={inputRef}
            spellCheck="false"
            autoCorrect="off"
          />
        </AutoComplete>
      </Form.Item>
    </Form>
  );
}
