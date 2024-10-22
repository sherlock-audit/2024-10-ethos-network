import { formatDate, formatNumber, getDateFromUnix } from '@ethos/helpers';
import { truncate } from 'lodash-es';
import { type ReactNode } from 'react';
import { TestnetMark } from '../../_components/testnet-mark.component';
import { Avatar } from 'app/og/_components/avatar.component';
import { Button } from 'app/og/_components/button.component';
import { Card } from 'app/og/_components/card.component';
import { TestnetWarning } from 'app/og/_components/testnet-warning.component';
import { ArrowDownSvg } from 'components/icons/arrow-down.svg';
import { ArrowUpSvg } from 'components/icons/arrow-up.svg';
import { CommentSvg } from 'components/icons/comment.svg';
import { LogoFullSvg } from 'components/icons/logo.svg';
import { lightTheme } from 'config';

type ActivityCardProps = {
  activityTypeIcon: ReactNode;
  authorName: string | null;
  authorAvatar: string | null;
  authorScore: number;
  subjectName: string | null;
  subjectAvatar: string | null;
  action: string;
  /**
   * Unix timestamp
   */
  timestamp: number;
  title: string;
  description?: string;
  statusBadge: ReactNode;
  replies: number;
  votes: number;
};

const colorTextSecondary = lightTheme.token.colorTextSecondary;

export function ActivityCard({
  activityTypeIcon,
  authorName,
  authorAvatar,
  authorScore,
  subjectName,
  subjectAvatar,
  action,
  timestamp,
  title,
  description,
  statusBadge,
  replies,
  votes,
}: ActivityCardProps) {
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Header
          activityTypeIcon={activityTypeIcon}
          authorName={authorName ?? 'Unknown'}
          subjectName={subjectName ?? 'Unknown'}
          subjectAvatar={subjectAvatar}
          action={action}
          timestamp={timestamp}
        />
        <Body
          authorAvatar={authorAvatar}
          authorScore={authorScore}
          title={title}
          description={description}
          statusBadge={statusBadge}
          replies={replies}
          votes={votes}
        />
        <TestnetMark />
        <Footer />
      </div>
    </Card>
  );
}

function Header({
  activityTypeIcon,
  timestamp,
  authorName,
  subjectName,
  subjectAvatar,
  action,
}: {
  activityTypeIcon: ReactNode;
  timestamp: number;
  authorName: string;
  subjectName: string;
  subjectAvatar: string | null;
  action: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '96px',
        borderBottom: `2px solid ${lightTheme.token.colorBgLayout}`,
        width: '100%',
        padding: '27px 35px',
        fontSize: '23px',
      }}
    >
      <span
        style={{ display: 'flex', alignItems: 'center', gap: '11px', color: colorTextSecondary }}
      >
        <span style={{ fontSize: '41px' }}>{activityTypeIcon}</span>
        <span style={{ fontWeight: 700 }}>{authorName}</span>
        <span>{action}</span>
        <Avatar avatar={subjectAvatar} size="39px" />
        <span style={{ fontWeight: 700 }}>{subjectName}</span>
      </span>
      <span style={{ color: lightTheme.token.colorTextTertiary }}>
        {formatDate(getDateFromUnix(timestamp), { dateStyle: 'medium' })}
      </span>
    </div>
  );
}

function Body({
  authorAvatar,
  authorScore,
  title,
  description,
  statusBadge,
  replies,
  votes,
}: {
  authorAvatar: string | null;
  authorScore: number;
  title: string;
  statusBadge: ReactNode;
  description?: string;
  replies: number;
  votes: number;
}) {
  return (
    <div
      style={{
        padding: '22px 35px',
        flexGrow: 1,
        display: 'flex',
        justifyContent: 'space-between',
        gap: '35px',
      }}
    >
      <Avatar avatar={authorAvatar} size="126px" score={authorScore} />
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '30px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              fontFamily: 'Queens',
              fontSize: '39px',
              flexGrow: 1,
              maxWidth: '800px',
              wordBreak: 'break-all',
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: 'flex',
              backgroundColor: lightTheme.token.colorBgLayout,
              padding: '19px',
              borderRadius: '12px',
              fontSize: '36px',
            }}
          >
            {statusBadge}
          </div>
        </div>
        {description ? (
          <div
            style={{
              maxWidth: '916px',
              color: colorTextSecondary,
              lineHeight: '39px',
              fontSize: '23px',
            }}
          >
            {truncate(description, { length: 240 })}
          </div>
        ) : null}
        <Stats replies={replies} votes={votes} />
      </div>
    </div>
  );
}

function Stats({ replies, votes }: { replies: number; votes: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div
        style={{
          display: 'flex',
          gap: '40px',
          color: lightTheme.token.colorTextTertiary,
          fontSize: '27px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '13px',
          }}
        >
          <ArrowUpSvg />
          {formatNumber(votes, { maximumFractionDigits: 1 })}
          <ArrowDownSvg />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '13px',
          }}
        >
          <CommentSvg />
          {formatNumber(replies, { maximumFractionDigits: 1 })}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '100px',
        padding: '0 35px',
        backgroundColor: lightTheme.token.colorBgLayout,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          fontSize: '45px',
          fontFamily: 'queens',
          color: lightTheme.token.colorText,
        }}
      >
        <LogoFullSvg />
      </div>
      <TestnetWarning />
      <Button color={lightTheme.token.colorPrimary} width="261px" height="61px">
        Read More
      </Button>
    </div>
  );
}
