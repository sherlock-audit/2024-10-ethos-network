import { CloseOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { fromUserKey, type ActivityActor } from '@ethos/domain';
import { shortenHash } from '@ethos/helpers';
import { AutoComplete, Button, Checkbox, Flex, Form, Space, Tooltip, Typography } from 'antd';
import { type AvatarSize } from 'antd/es/avatar/AvatarContext';
import { useMemo, useState } from 'react';
import { UserAvatar } from 'components/avatar/avatar.component';
import { useSearchQuery } from 'hooks/api/echo.hooks';
import { useIsMarketCreationAllowed, useSetMarketCreationAllowed } from 'hooks/market/market.hooks';
import { useDebouncedValue } from 'hooks/useDebounce';
import { placeholderActor } from 'hooks/user/activities';

const { Text } = Typography;

export function MarketAdmin() {
  const [selectedProfile, setSelectedProfile] = useState<ActivityActor>();
  const [form] = Form.useForm<{ isAllowed: boolean }>();
  const allowMarketCreation = useSetMarketCreationAllowed();
  const { data: isMarketCreationAllowed } = useIsMarketCreationAllowed(selectedProfile?.profileId);

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={3}>Market Creation</Typography.Title>
      <Form
        form={form}
        name="allow_market_creation"
        layout="vertical"
        onFinish={async () => {
          if (!selectedProfile?.profileId) return;
          await allowMarketCreation.mutateAsync(
            {
              profileId: selectedProfile.profileId,
              ...form.getFieldsValue(),
            },
            {
              onSuccess: () => {
                setSelectedProfile(undefined);
                form.resetFields();
              },
            },
          );
        }}
      >
        <Flex
          vertical
          gap="middle"
          css={css`
            min-height: 60px;
          `}
        >
          {!selectedProfile && (
            <ProfilePicker
              onProfileSelected={(actor) => {
                setSelectedProfile(actor);
              }}
            />
          )}
          {selectedProfile && (
            <Flex gap="middle" align="center">
              <ProfileItem
                actor={selectedProfile}
                size="default"
                showHoverCard={true}
                isMarketCreationAllowed={isMarketCreationAllowed}
              />
              <Button
                danger
                type="dashed"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => {
                  setSelectedProfile(undefined);
                }}
              />
            </Flex>
          )}
        </Flex>
        <Form.Item name="isAllowed" valuePropName="checked" initialValue={false}>
          <Checkbox disabled={!selectedProfile}>
            <Tooltip title="Grant this profile the permission to create a Reputation Market.">
              Allow
            </Tooltip>
          </Checkbox>
        </Form.Item>
        <Form.Item shouldUpdate>
          {() => (
            <Button
              type="primary"
              htmlType="submit"
              loading={allowMarketCreation.isPending}
              disabled={
                !selectedProfile ||
                Boolean(form.getFieldsError().filter(({ errors }) => errors.length).length)
              }
            >
              Update Create Permission
            </Button>
          )}
        </Form.Item>
      </Form>
    </Flex>
  );
}

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

function ProfileItem({
  actor = placeholderActor({ profileId: 0 }),
  size = 'default',
  showHoverCard = false,
  isMarketCreationAllowed,
}: {
  actor?: ActivityActor;
  size?: AvatarSize;
  showHoverCard?: boolean;
  isMarketCreationAllowed?: boolean;
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
        {isMarketCreationAllowed !== undefined &&
          (isMarketCreationAllowed ? (
            <Typography.Text type="success">Currently Allowed</Typography.Text>
          ) : (
            <Typography.Text type="danger">Currently Not Allowed</Typography.Text>
          ))}
      </Space>
    </Flex>
  );
}
