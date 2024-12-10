import { css, type SerializedStyles } from '@emotion/react';
import { theme } from 'antd';
import { type PropsWithChildren, type UIEvent } from 'react';
import { tokenCssVars } from 'config/theme';

export function TableWrapper({
  children,
  wrapperCSS,
}: PropsWithChildren & {
  wrapperCSS?: SerializedStyles;
}) {
  const { token } = theme.useToken();

  return (
    <div
      css={css`
        background-color: ${tokenCssVars.colorBgContainer};
        padding: 0px;
        border-radius: ${token.borderRadiusLG}px;
        overflow: hidden;

        // Add these styles to remove the bottom border of the last row

        & .ant-table-tbody > tr:last-child > td {
          border-bottom: none;
        }

        ${wrapperCSS}
      `}
    >
      {children}
    </div>
  );
}

export function handleInfiniteTableScroll(event: UIEvent<HTMLDivElement>, callback: () => void) {
  const target = event.target as HTMLDivElement;

  if (target.scrollHeight - target.scrollTop === target.clientHeight) {
    callback();
  }
}
