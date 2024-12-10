import { CloseOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { type ActivityActor } from '@ethos/domain';
import { formatEth, formatNumber } from '@ethos/helpers';
import { App, Button, Flex, Form, type FormProps, Radio, Typography } from 'antd';
import { useState } from 'react';
import { ProfileItem, ProfilePicker } from './profile-picker.component';
import { useCreateMarket, useMarketConfigs } from 'hooks/market/market.hooks';

type FieldType = {
  configIndex: number;
};

export function MarketAdminCreate() {
  const [selectedProfile, setSelectedProfile] = useState<ActivityActor>();
  const createMarket = useCreateMarket();
  const { data: marketConfigs } = useMarketConfigs();
  const [form] = Form.useForm<FieldType>();
  const { message } = App.useApp();

  // eslint-disable-next-line func-style
  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    if (!selectedProfile) return;

    const config = marketConfigs?.find((c) => c.configIndex === values.configIndex);

    if (!config) return;

    try {
      await createMarket.mutateAsync({
        ownerAddress: selectedProfile.primaryAddress,
        configIndex: values.configIndex,
        initialLiquidity: config.initialLiquidity,
      });
      message.success('Market created successfully');
      form.resetFields();
      setSelectedProfile(undefined);
    } catch (error) {
      message.error('Failed to create market: ' + (error as Error).message);
    }
  };

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={3}>Admin Create Market</Typography.Title>
      <Form<FieldType>
        form={form}
        name="market_create"
        onFinish={onFinish}
        initialValues={{ configIndex: 0 }}
      >
        <Flex vertical gap="middle">
          <div
            css={css`
              min-height: 60px;
            `}
          >
            {!selectedProfile ? (
              <ProfilePicker
                onProfileSelected={(profile) => {
                  setSelectedProfile(profile);
                }}
              />
            ) : (
              <Flex gap="middle" align="center">
                <ProfileItem actor={selectedProfile} size="default" showHoverCard={true} />
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
          </div>

          {marketConfigs && (
            <Form.Item<FieldType>
              label="Config"
              name="configIndex"
              rules={[{ required: true, message: 'Please choose a market config!' }]}
            >
              <Radio.Group buttonStyle="solid">
                <Flex vertical gap="small">
                  {marketConfigs.map((c) => (
                    <Radio key={c.configIndex} value={c.configIndex}>
                      <Flex gap={16}>
                        <pre>
                          💰 Liquidity:
                          {formatEth(c.initialLiquidity, 'wei', { minimumFractionDigits: 3 })}
                        </pre>
                        <pre>🎟️ Votes: {formatNumber(Number(c.initialVotes))}</pre>
                      </Flex>
                    </Radio>
                  ))}
                </Flex>
              </Radio.Group>
            </Form.Item>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMarket.isPending}
              disabled={!selectedProfile}
            >
              Create Market
            </Button>
          </Form.Item>
        </Flex>
      </Form>
    </Flex>
  );
}
