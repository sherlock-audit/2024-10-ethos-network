import { css } from '@emotion/react';
import { Flex, List, theme, Typography } from 'antd';
import { type ReactElement } from 'react';
import {
  ArrowDownThinIcon,
  ArrowUpThinIcon,
  Logo,
  ReviewFilled,
  SlashFilled,
  VouchFilled,
} from 'components/icons';
import { tokenCssVars } from 'config';

type ContributionStep = {
  title: string;
  description: string;
  iconBackgroundColor: string;
  sentiment?: 'good' | 'bad';
  scoreIncrease?: number;
  icon: ReactElement;
};

export function ContributionSteps() {
  const { token } = theme.useToken();

  const data: ContributionStep[] = [
    {
      title: 'Vouch',
      description: "Stake your ethereum against someone's name",
      sentiment: 'good',
      icon: (
        <VouchFilled
          css={css`
            color: ${tokenCssVars.colorSuccess};
          `}
        />
      ),
      iconBackgroundColor: 'rgba(18, 127, 49, 0.2)',
    },
    {
      title: 'Review',
      sentiment: 'bad',
      scoreIncrease: 10,
      description: 'Leave a positive, negative or neutral review',
      icon: (
        <ReviewFilled
          css={css`
            color: ${tokenCssVars.colorTextBase};
          `}
        />
      ),
      iconBackgroundColor: 'rgba(31, 33, 38, 0.15)',
    },
    {
      title: 'Slash',
      description: 'Financial downside for bad actors',
      icon: (
        <SlashFilled
          css={css`
            color: ${tokenCssVars.colorError};
          `}
        />
      ),
      iconBackgroundColor: tokenCssVars.colorErrorBgHover,
    },
  ];

  return (
    <div
      css={css`
        background: ${tokenCssVars.colorBgLayout};
        border-radius: 7px;
        text-align: left;
        padding: 10px 20px;

        @media (min-width: ${token.screenMD}px) {
          width: 250px;
          padding: 18px 10px 30px 20px;
        }
        @media (min-width: 990px) and (max-width: 1150px) {
          width: 230px;
        }
      `}
    >
      <Typography.Text strong>
        <Flex gap={6} align="center">
          <Logo /> Ethos mechanisms
        </Flex>
      </Typography.Text>
      <List
        itemLayout="horizontal"
        css={css`
          margin-top: 18px;
        `}
        dataSource={data}
        renderItem={(item) => (
          <>
            <List.Item
              css={css`
                padding: 0;
              `}
            >
              <List.Item.Meta
                avatar={
                  <Flex
                    align="center"
                    justify="center"
                    css={css`
                      background: ${item.iconBackgroundColor};
                      font-size: 25px;
                      border-radius: 50%;
                      width: 60px;
                      height: 60px;
                    `}
                  >
                    {item.icon}
                  </Flex>
                }
                title={item.title}
                description={
                  <div
                    css={css`
                      font-size: 12px;
                    `}
                  >
                    {item.description}
                  </div>
                }
                css={css`
                  margin: 0;
                  align-items: center;
                  & .ant-list-item-meta-title {
                    font-size: ${token.fontSizeHeading5}px;
                    margin-bottom: 2px;
                  }

                  & .ant-list-item-meta-avatar {
                    margin-inline-end: 12px;
                  }
                  & .ant-list-item-meta-description {
                    color: ${tokenCssVars.colorTextSecondary};
                  }
                `}
              />
            </List.Item>
            <List.Item
              css={css`
                padding: 4px 18px 2px;
                font-size: 21px;
                color: ${tokenCssVars.colorTextSecondary};

                @media (max-width: ${token.screenMD}px) {
                  font-size: 14px;
                  padding: 0 22px;
                }
              `}
            >
              <div>
                {item.sentiment === 'good' && (
                  <ArrowUpThinIcon
                    css={css`
                      color: ${tokenCssVars.colorTextQuaternary};
                    `}
                  />
                )}
                {item.sentiment === 'bad' && (
                  <ArrowDownThinIcon
                    css={css`
                      color: ${tokenCssVars.colorTextQuaternary};
                    `}
                  />
                )}
              </div>
            </List.Item>
          </>
        )}
      />
    </div>
  );
}
