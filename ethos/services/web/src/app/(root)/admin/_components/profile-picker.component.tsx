import { css } from '@emotion/react';
import { useDebouncedValue } from '@ethos/common-ui';
import { type ActivityActor, fromUserKey } from '@ethos/domain';
import { shortenHash } from '@ethos/helpers';
import { Form, AutoComplete, Flex, Space, Tooltip, Typography } from 'antd';
import { type AvatarSize } from 'antd/es/avatar/AvatarContext';
import { useMemo } from 'react';
import { UserAvatar } from 'components/avatar/avatar.component';
import { useSearchQuery } from 'hooks/api/echo.hooks';
import { placeholderActor } from 'hooks/user/activities';

const { Text } = Typography;

type ProfileIdPickerProps = {
  onProfileSelected: (profile: ActivityActor) => void;
};

export function ProfilePicker({ onProfileSelected }: ProfileIdPickerProps) {
  const form = Form.useFormInstance();
  const value: string = Form.useWatch('profileSearch', form);
  const debouncedValue = useDebouncedValue(value, 400, true);

  const { data } = useSearchQuery(debouncedValue?.trim());
  const profiles = useMemo(() => {
    if (!data) return [];

    return data.values.filter((actor) => actor.profileId);
  }, [data]);

  return (
    <Form.Item name="profileSearch">
      <AutoComplete
        id="profile-search"
        variant="outlined"
        onSelect={(value) => {
          const profile = profiles.find((actor) => actor.profileId === Number(value));

          if (profile) {
            onProfileSelected(profile);
          }
          form.resetFields(['profileSearch']);
        }}
        allowClear={true}
        options={profiles.map((actor) => ({
          value: String(actor.profileId),
          label: <ProfileItem actor={actor} key={actor.userkey} />,
        }))}
        placeholder="Search for a profile"
        notFoundContent={<div>No results</div>}
      />
    </Form.Item>
  );
}

export function ProfileItem({
  actor = placeholderActor({ profileId: 0 }),
  size = 'default',
  showHoverCard = false,
}: {
  actor?: ActivityActor;
  size?: AvatarSize;
  showHoverCard?: boolean;
}) {
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
      justify="space-between"
      align="middle"
      gap="small"
      css={css`
        margin-bottom: 4px;
      `}
    >
      <UserAvatar size={size} actor={actor} showHoverCard={showHoverCard} renderAsLink={false} />
      <Space direction="vertical" size={0} align="end">
        <Tooltip title={`ProfileId: ${actor.profileId}`}>
          <Text strong>{actor.name}</Text>
        </Tooltip>
        {actor.name !== short && <Typography.Text type="secondary">{short}</Typography.Text>}
      </Space>
    </Flex>
  );
}
