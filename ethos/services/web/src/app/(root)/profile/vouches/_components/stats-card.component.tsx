import { InfoCircleOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { Card, Flex, Statistic, theme, Tooltip } from 'antd';
import { type ReactNode, type ReactElement } from 'react';
import { TooltipIconWrapper } from 'components/tooltip/tooltip-icon-wrapper';
import { tokenCssVars } from 'config/theme';

type Props = {
  title: string;
  bold?: boolean;
  value: string | number;
  isLoading?: boolean;
  bottomContent?: ReactNode;
  tooltipText?: ReactNode;
  icon?: ReactElement;
};

export function StatusCard({
  title,
  value,
  bold = false,
  bottomContent,
  isLoading,
  tooltipText,
  icon,
}: Props) {
  const { token } = theme.useToken();

  return (
    <Card
      loading={isLoading}
      css={css`
        height: 100%;
        display: flex;
        flex-direction: column;
      `}
    >
      <Flex
        justify="space-between"
        css={css`
          height: 100%;
        `}
      >
        <div
          css={css`
            width: 100px;
          `}
        >
          {icon && (
            <Flex
              justify="center"
              align="center"
              css={css`
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background-color: ${tokenCssVars.colorBgBase};
              `}
            >
              <span
                css={css`
                  color: ${tokenCssVars.colorPrimary};
                  font-size: 24px;
                `}
              >
                {icon}
              </span>
            </Flex>
          )}
        </div>
        <div>
          <Flex vertical align="end">
            <div
              css={css`
                height: 30px;
              `}
            >
              {tooltipText && (
                <Tooltip title={tooltipText}>
                  <TooltipIconWrapper>
                    <InfoCircleOutlined
                      css={css`
                        font-size: 14px;
                        color: ${tokenCssVars.colorText};
                      `}
                    />
                  </TooltipIconWrapper>
                </Tooltip>
              )}
            </div>
            <Statistic
              title={title}
              value={value}
              valueStyle={{
                color: tokenCssVars.colorText,
                fontFamily: 'var(--font-queens), sans-serif',
                fontSize: 58,
                fontWeight: bold ? 700 : 400,
              }}
              css={css`
                text-align: right;
                background: ${tokenCssVars.colorBgContainer};
                border-radius: ${token.borderRadiusLG}px;
              `}
            />
          </Flex>
          {bottomContent && <Flex justify="flex-end">{bottomContent}</Flex>}
        </div>
      </Flex>
    </Card>
  );
}
