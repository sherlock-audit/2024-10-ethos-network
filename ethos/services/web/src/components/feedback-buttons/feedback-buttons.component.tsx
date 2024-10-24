import { css } from '@emotion/react';
import { type Review } from '@ethos/blockchain-manager';
import { Button, Flex, Tag, theme, Tooltip } from 'antd';
import { useCallback } from 'react';
import { FLOAT_BTN_SIZE, FloatButton } from 'components/float-button/float-button.component';
import { ArrowDropDown, Close } from 'components/icons';
import { tokenCssVars } from 'config';
import { useScoreIconAndColor } from 'hooks/user/useScoreIconAndColor';

type ActionButtonProps = {
  id: string;
  tooltip?: string;
  selected?: boolean;
};

const getScoreType = (score: string): Review['score'] => {
  switch (score) {
    case '0':
      return 'negative';
    case '1':
      return 'neutral';
    case '2':
      return 'positive';
    default:
      return 'neutral';
  }
};

const ICON_FONT_SIZE = 18;
function ActionButton({ id, tooltip, selected }: ActionButtonProps) {
  const { ICON_BY_SCORE } = useScoreIconAndColor(ICON_FONT_SIZE);

  return (
    <Tooltip title={tooltip}>
      <Tag
        icon={ICON_BY_SCORE[getScoreType(id)]}
        color={tokenCssVars.colorBgLayout}
        css={css`
          display: flex;
          justify-content: center;
          align-items: center;
          width: ${FLOAT_BTN_SIZE}px;
          height: ${FLOAT_BTN_SIZE}px;
          flex-shrink: 0;
          margin: 0;
          box-shadow: ${selected ? 'none' : tokenCssVars.boxShadowSecondary};
          &:hover {
            cursor: pointer;
          }
        `}
      />
    </Tooltip>
  );
}

type UserActionButtonsProps = {
  onChange: (value: number) => void;
  value: string | null;
};

export function FeedbackButtons({ onChange, value }: UserActionButtonsProps) {
  const { token } = theme.useToken();

  // memoize the callback, otherwise watching form value is going into infinite loop
  const handleChange = useCallback(
    (value: string) => {
      onChange(Number(value));
    },
    [onChange],
  );

  return (
    <Flex align="flex-start" justify="flex-end">
      <FloatButton
        setSelectedActionType={handleChange}
        selectedActionType={value}
        iconOpened={
          <Button
            css={css`
              width: ${FLOAT_BTN_SIZE}px;
              height: ${FLOAT_BTN_SIZE}px;
              background: ${tokenCssVars.colorBgLayout};
              border: 1px solid transparent;
              border-radius: ${token.borderRadius}px;
              box-shadow: ${tokenCssVars.boxShadowSecondary};
            `}
            icon={
              <Close
                css={css`
                  color: ${tokenCssVars.colorText};
                  font-size: ${ICON_FONT_SIZE}px;
                `}
              />
            }
          />
        }
        iconClosed={
          <ArrowDropDown
            css={css`
              color: ${tokenCssVars.colorText};
              font-size: ${ICON_FONT_SIZE}px;
            `}
          />
        }
      >
        <ActionButton selected={value === '2'} tooltip="Positive review" id="2" />
        <ActionButton selected={value === '1'} tooltip="Neutral review" id="1" />
        <ActionButton selected={value === '0'} tooltip="Negative review" id="0" />
      </FloatButton>
    </Flex>
  );
}
