import { css, type SerializedStyles } from '@emotion/react';
import { notEmpty } from '@ethos/helpers';
import {
  Grid,
  Drawer,
  type DrawerProps,
  Flex,
  theme,
  Typography,
  Button,
  type ButtonProps,
} from 'antd';
import { usePathname } from 'next/navigation';
import { type Key, useEffect, useMemo, useState, type ReactNode, isValidElement } from 'react';
import { tokenCssVars } from 'config';
import { hideOnDesktopCSS, hideOnTabletAndAboveCSS } from 'styles/responsive';

type MobileMenuItem = {
  label?: ReactNode;
  key?: Key;
  icon?: ReactNode;
};

type MobileMenuProps = {
  title: ReactNode;
  selectedKey?: string;
  icon: ReactNode;
  itemSize?: 'large' | 'medium';
  items?: Array<MobileMenuItem | null>;
  itemsContent?: ReactNode;
  hideOnTablet?: boolean;
  wrapperCSS?: SerializedStyles;
  type?: ButtonProps['type'];
} & DrawerProps;
const { useBreakpoint } = Grid;

export function MobileMenu({
  items,
  itemsContent,
  selectedKey,
  title,
  icon,
  itemSize = 'medium',
  hideOnTablet = true,
  type = 'text',
  wrapperCSS,
  ...rest
}: MobileMenuProps) {
  const { lg, xl, xxl } = useBreakpoint();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer when a route url is changed
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if ((lg && hideOnTablet) ?? xl ?? xxl) {
      setOpen(false);
    }
  }, [lg, xl, xxl, hideOnTablet, setOpen]);

  const itemsWithLabel = useMemo(() => items?.filter((i) => notEmpty(i)), [items]);

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
        type={type}
        icon={icon}
        css={css`
          ${hideOnTablet ? hideOnTabletAndAboveCSS : hideOnDesktopCSS}
          ${wrapperCSS}
        `}
      />
      <Drawer
        title={title}
        placement="right"
        styles={{
          wrapper: { width: '100%', maxWidth: '500px' },
        }}
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        css={css`
          & .ant-drawer-header-title {
            flex-direction: row-reverse;
            gap: 12px;
          }
        `}
        {...rest}
      >
        <Flex vertical gap={31}>
          {itemsContent}
          {itemsWithLabel?.map((item) => (
            <MenuItem
              key={item.key}
              item={item}
              itemSize={itemSize}
              selectedKey={selectedKey}
              closeDrawer={() => {
                setOpen(false);
              }}
            />
          ))}
        </Flex>
      </Drawer>
    </>
  );
}

function MenuItem({
  item,
  itemSize,
  selectedKey,
  closeDrawer,
}: Pick<MobileMenuProps, 'itemSize' | 'selectedKey'> & {
  item: MobileMenuItem;
  closeDrawer: () => void;
}) {
  const { token } = theme.useToken();
  const itemColor = item?.key === selectedKey ? tokenCssVars.colorPrimary : tokenCssVars.colorText;
  const linkStyle = css`
    & > a {
      color: ${itemColor};
      &:hover {
        color: ${tokenCssVars.colorPrimaryHover};
      }
    }
  `;

  const onItemClicked = () => {
    // Close the drawer if the item is a link
    // This one closes drawer immediately after clicking on a link
    // Closing on pathname change takes time in slower internet connections
    // We still need pathname change to close the drawer in case of back button
    if (
      isValidElement(item?.label) &&
      item?.label.props.href &&
      item?.label.props.target !== '_blank'
    ) {
      closeDrawer();
    }
  };

  return (
    <Flex gap={10} align="center" onClick={onItemClicked}>
      {item?.icon}
      {itemSize === 'large' ? (
        <Typography.Title
          level={3}
          css={css`
            color: ${itemColor};
            ${linkStyle}
          `}
        >
          {item?.label}
        </Typography.Title>
      ) : (
        <Typography.Text
          css={css`
            font-size: ${token.fontSizeLG}px;
            line-height: 1.5;
            color: ${itemColor};
            ${linkStyle}
          `}
        >
          {item?.label}
        </Typography.Text>
      )}
    </Flex>
  );
}
