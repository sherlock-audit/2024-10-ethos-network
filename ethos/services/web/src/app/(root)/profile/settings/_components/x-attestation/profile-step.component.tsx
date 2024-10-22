import { LoadingOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { xComHelpers } from '@ethos/attestation';
import { duration } from '@ethos/helpers';
import { Form, Input, Space, Typography } from 'antd';
import { useEffect } from 'react';
import { zeroAddress } from 'viem';
import { UserAvatar } from 'components/avatar/avatar.component';
import { useTwitterProfile } from 'hooks/api/echo.hooks';
import { useDebouncedValue } from 'hooks/useDebounce';

const { Text } = Typography;

type FieldType = {
  username: string;
};

type TwitterProfile = ReturnType<typeof useTwitterProfile>['data'];

const DEBOUNCE_DELAY = duration(1, 'second').toMilliseconds();

export function ProfileStep({
  onChange,
  onTwitterProfileLoad,
  value,
}: {
  onChange: (value: string) => void;
  onTwitterProfileLoad: (profile: TwitterProfile) => void;
  value: string;
}) {
  const username = xComHelpers.extractAccount(value);
  const debouncedUsername = useDebouncedValue(username, DEBOUNCE_DELAY);
  const { data: twitterProfile, isPending } = useTwitterProfile({ username: debouncedUsername });

  useEffect(() => {
    onTwitterProfileLoad(twitterProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onTwitterProfileLoad, twitterProfile?.id]);

  return (
    <Form
      layout="vertical"
      onValuesChange={(changedValues: FieldType) => {
        onChange(changedValues.username);
      }}
      initialValues={{ username: value }}
    >
      <Form.Item<FieldType>
        label="x.com username or profile URL"
        name="username"
        rules={[{ required: true, message: 'Please input your x.com username' }]}
        validateStatus={username ? 'success' : undefined}
        help={
          <Space
            css={css`
              padding-block: 4px;
            `}
          >
            <HelpMessage
              username={debouncedUsername}
              isPending={isPending}
              twitterProfile={twitterProfile}
            />
          </Space>
        }
      >
        {/*
          Added span so the Input doesn't change the DOM structure and keeps the focus
          https://ant.design/components/input#why-input-lose-focus-when-change-prefixsuffixshowcount
        */}
        <Input placeholder="user_handle" suffix={isPending ? <LoadingOutlined spin /> : <span />} />
      </Form.Item>
    </Form>
  );
}

function HelpMessage({
  username,
  isPending,
  twitterProfile,
}: {
  username: string;
  isPending: boolean;
  twitterProfile: TwitterProfile;
}) {
  if (!username || isPending) {
    return undefined;
  }

  if (!twitterProfile) {
    return `Couldn’t find a Twitter profile @${username}`;
  }

  return (
    <Text
      css={css`
        display: flex;
        gap: 4px;
        align-items: center;
      `}
    >
      Found{' '}
      <UserAvatar
        actor={{
          avatar: twitterProfile.avatar,
          name: `@${twitterProfile.name}`,
          userkey: '',
          score: 0,
          primaryAddress: zeroAddress,
        }}
        size="small"
        renderAsLink={false}
        showHoverCard={false}
      />{' '}
      @{twitterProfile.name}
    </Text>
  );
}
