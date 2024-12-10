import { css } from '@emotion/react';
import { isValidAddress } from '@ethos/helpers';
import { Button, Flex, Form, Input, InputNumber, Typography } from 'antd';
import { type Address } from 'viem';
import { useAddInvites } from 'hooks/api/blockchain-manager';

export function AddInvites() {
  const [form] = Form.useForm<{ address: Address; amount: number }>();
  const addInvites = useAddInvites();

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={3}>Add invites</Typography.Title>
      <Form
        form={form}
        name="add_invites"
        layout="vertical"
        onFinish={async () => {
          try {
            await addInvites.mutateAsync(form.getFieldsValue());
            form.resetFields();
          } catch {
            // Nothing to catch here
          }
        }}
      >
        <Form.Item
          name="address"
          label="Address"
          rules={[
            { required: true, message: 'Please input address' },
            {
              async validator(_, value: string) {
                isValidAddress(value)
                  ? await Promise.resolve()
                  : await Promise.reject(new Error('Invalid address'));
              },
            },
          ]}
        >
          <Input placeholder="0x123456..." variant="filled" />
        </Form.Item>
        <Form.Item
          name="amount"
          label="Number of invites to add"
          rules={[{ required: true }]}
          initialValue={1}
        >
          <InputNumber
            css={css`
              width: 100%;
            `}
            variant="filled"
          />
        </Form.Item>
        <Form.Item shouldUpdate>
          {() => (
            <Button
              type="primary"
              htmlType="submit"
              loading={addInvites.isPending}
              disabled={
                !form.isFieldTouched('address') ||
                Boolean(form.getFieldsError().filter(({ errors }) => errors.length).length)
              }
            >
              Add invites
            </Button>
          )}
        </Form.Item>
      </Form>
    </Flex>
  );
}
