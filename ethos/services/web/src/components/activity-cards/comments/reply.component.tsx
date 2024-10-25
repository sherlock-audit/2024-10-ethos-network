import { css } from '@emotion/react';
import { type EthosUserTarget } from '@ethos/domain';
import {
  type FormProps,
  Button,
  Flex,
  Form,
  Input,
  Popconfirm,
  Tag,
  Typography,
  theme,
} from 'antd';
import { type ValidatorRule } from 'rc-field-form/lib/interface';
import { zeroAddress } from 'viem';
import { type CommentsProps } from './comments.component';
import { AuthMiddleware } from 'components/auth/auth-middleware';
import { UserAvatar } from 'components/avatar/avatar.component';
import { PersonName } from 'components/person-name/person-name.component';
import { tokenCssVars } from 'config';
import { useAddReply } from 'hooks/api/blockchain-manager';
import { useActor } from 'hooks/user/activities';

const { useToken } = theme;

const { Text } = Typography;
const { TextArea } = Input;

type Props = {
  fromUser: EthosUserTarget;
  toUser?: EthosUserTarget;
  replyTarget: CommentsProps['target'];
  onRevertTarget: () => void;
  close: () => void;
};

type FieldType = {
  comment: string;
};

const MINIMUM_COMMENT_CHARACTERS = 1;

export function Reply({ fromUser, toUser, replyTarget, onRevertTarget, close }: Props) {
  const { token } = useToken();
  const fromUserActor = useActor(fromUser);
  const toUserActor = useActor(toUser ?? { address: zeroAddress });

  const [form] = Form.useForm();
  const comment = Form.useWatch('comment', form);

  const addReply = useAddReply();
  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    form.resetFields();
    try {
      onRevertTarget();
      await addReply.mutateAsync([replyTarget.contract, replyTarget.id, values.comment]);
    } catch {
      // No special cases to handle
    }
  };

  const validateComment: ValidatorRule['validator'] = (_rule, value, callback) => {
    if (typeof value === 'string' && value.length >= MINIMUM_COMMENT_CHARACTERS) {
      callback();

      return;
    }

    // eslint-disable-next-line n/no-callback-literal
    callback('Invalid comment');
  };

  const onClose = () => {
    form.resetFields();
    onRevertTarget();
    close();
  };

  return (
    <Flex justify="stretch" gap={16}>
      <UserAvatar actor={fromUserActor} />
      <Form
        form={form}
        onFinish={onFinish}
        css={css`
          flex: 1;
        `}
      >
        <Form.Item<FieldType>
          name="comment"
          rules={[
            {
              message: `Minimum ${MINIMUM_COMMENT_CHARACTERS} characters`,
              validateTrigger: 'onBlur',
              validator: validateComment,
            },
          ]}
          css={css`
            margin-bottom: 13px;
          `}
        >
          <Flex
            vertical
            css={css`
              background-color: ${tokenCssVars.colorBgContainer};
              border-radius: ${token.borderRadius}px;
              padding: 11px ${token.controlPaddingHorizontal}px;
            `}
            gap={4}
          >
            {toUser && (
              <Tag
                css={css`
                  display: flex;
                  gap: 2px;
                  align-self: flex-start;
                  border-radius: ${token.borderRadiusSM}px;
                  border: solid ${token.lineWidth}px #d9d9d9;
                  background-color: ${tokenCssVars.colorBgElevated};
                `}
                closeIcon
                onClose={(e) => {
                  e.preventDefault();
                  onRevertTarget();
                }}
              >
                <Text type="secondary">Reply to: </Text>
                <PersonName
                  target={toUserActor}
                  color="colorText"
                  weight="default"
                  ellipsis={true}
                  maxWidth="180px"
                />
              </Tag>
            )}
            <TextArea
              rows={4}
              variant="borderless"
              css={css`
                resize: vertical;
                padding: 0px;
              `}
              placeholder="Add a comment"
            />
          </Flex>
        </Form.Item>
        <Flex justify="flex-end" gap={12}>
          <Popconfirm
            title="Are you sure you want to close?"
            description="All your changes will be lost"
            onConfirm={onClose}
            disabled={!comment}
            okText="Yes"
            cancelText="No"
            placement="topLeft"
          >
            <Button type="default" onClick={comment ? undefined : onClose}>
              Close
            </Button>
          </Popconfirm>
          <AuthMiddleware>
            <Button
              type="primary"
              htmlType="submit"
              loading={addReply.isPending}
              onClick={() => {
                // Workaround to submit the form when the button is wrapped with
                // AuthMiddleware, because it's preventing the button click,
                // checks for the access and then only calls `onClick`. In this
                // case, it wasn't defined, so it didn't work. Adding `onClick`
                // and manually submitting the form works.
                form.submit();
              }}
            >
              Post
            </Button>
          </AuthMiddleware>
        </Flex>
      </Form>
    </Flex>
  );
}
