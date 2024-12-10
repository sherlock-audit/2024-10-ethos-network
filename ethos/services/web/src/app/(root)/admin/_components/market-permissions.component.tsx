import { CloseOutlined } from '@ant-design/icons';
import { type ActivityActor } from '@ethos/domain';
import { Button, Checkbox, Flex, Form, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { ProfileItem, ProfilePicker } from './profile-picker.component';
import { useIsMarketCreationAllowed, useSetMarketCreationAllowed } from 'hooks/market/market.hooks';

export function MarketAdmin() {
  const [selectedProfile, setSelectedProfile] = useState<ActivityActor>();
  const [form] = Form.useForm<{ isAllowed: boolean }>();
  const allowMarketCreation = useSetMarketCreationAllowed();
  const { data: isMarketCreationAllowed } = useIsMarketCreationAllowed(selectedProfile?.profileId);

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={3}>Self-Creation Permission</Typography.Title>
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
        <Flex vertical gap="middle">
          {!selectedProfile && (
            <ProfilePicker
              onProfileSelected={(actor) => {
                setSelectedProfile(actor);
              }}
            />
          )}
          {selectedProfile && (
            <Flex gap="middle" align="center">
              <ProfileItem actor={selectedProfile} size="default" showHoverCard={true} />
              {isMarketCreationAllowed !== undefined &&
                (isMarketCreationAllowed ? (
                  <Typography.Text type="success">Currently Allowed</Typography.Text>
                ) : (
                  <Typography.Text type="danger">Currently Not Allowed</Typography.Text>
                ))}
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
