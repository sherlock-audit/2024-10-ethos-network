import { css } from '@emotion/react';
import { Button, Flex, Badge, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import { tokenCssVars } from 'config';

type FloatButtonProps = {
  iconClosed: React.ReactNode;
  iconOpened: React.ReactNode;
  children: Array<React.ReactElement<{ id: string }>>;
  setSelectedActionType: (childId: string) => void;
  selectedActionType: string | null;
};

export const FLOAT_BTN_SIZE = 40;
const FLOAT_BTN_GAP = 16;

export function FloatButton({
  iconClosed,
  iconOpened,
  children,
  setSelectedActionType,
  selectedActionType,
}: FloatButtonProps) {
  const { token } = theme.useToken();

  const [visible, setVisible] = useState(true);

  const handleButtonClick = (childId: string | null) => {
    setSelectedActionType(childId ?? '-1');
    setVisible((prevState) => !prevState);
  };

  useEffect(() => {
    if (visible) {
      setSelectedActionType('-1');
    }
  }, [visible, setSelectedActionType]);

  const DefaultButton = () => (
    <Button
      icon={visible ? iconOpened : iconClosed}
      css={css`
        width: ${FLOAT_BTN_SIZE}px;
        height: ${FLOAT_BTN_SIZE}px;
        background: ${tokenCssVars.colorBgLayout};
        border: 1px solid transparent;
        border-radius: ${token.borderRadius}px;
        color: ${tokenCssVars.colorText};
        box-shadow: ${tokenCssVars.boxShadowSecondary};
      `}
    />
  );

  const selectedActionButton = children.find(
    (child: React.ReactElement) => child.props.id === selectedActionType,
  ) ?? (
    <Badge
      dot
      css={css`
        & .ant-badge .ant-badge-dot {
          box-shadow: ${tokenCssVars.boxShadowSecondary};
        }
      `}
    >
      <DefaultButton />
    </Badge>
  );

  return (
    <Flex vertical align="flex-start">
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          setVisible((prevState) => !prevState);
        }}
      >
        {!visible ? (
          <Flex>{selectedActionButton}</Flex>
        ) : (
          <Badge
            dot
            css={css`
              & .ant-badge .ant-badge-dot {
                box-shadow: ${tokenCssVars.boxShadowSecondary};
              }
            `}
          >
            <DefaultButton />
          </Badge>
        )}
      </div>

      {visible && (
        <Flex
          vertical
          align="center"
          css={css`
            position: absolute;
            top: ${FLOAT_BTN_SIZE + FLOAT_BTN_GAP}px;
          `}
          gap={FLOAT_BTN_GAP}
        >
          {React.Children.map(children, (child: React.ReactElement<{ id: string }>) => {
            const { id } = child.props;

            return (
              <div
                role="button"
                tabIndex={0}
                key={id}
                onClick={() => {
                  handleButtonClick(id);
                }}
              >
                {child}
              </div>
            );
          })}
        </Flex>
      )}
    </Flex>
  );
}
