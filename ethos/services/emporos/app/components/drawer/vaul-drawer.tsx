import { FocusScope } from '@radix-ui/react-focus-scope';
import { Button, Typography } from 'antd';
import clsx from 'clsx';
import { Drawer } from 'vaul';
import { CloseIcon } from '../icons/close.tsx';

export function VaulDrawer({
  open,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
  titleSuffix,
  contentCentered,
  headerContent,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  titleSuffix?: React.ReactNode;
  contentCentered?: boolean;
  headerContent?: React.ReactNode;
}) {
  return (
    <Drawer.Root open={open} onClose={onClose}>
      {/* https://docs.privy.io/guide/react/troubleshooting/ui/dialog */}
      <Drawer.Portal>
        <FocusScope trapped={false}>
          <Drawer.Content
            onPointerDownOutside={(e) => {
              e.preventDefault();
            }}
            className={`bg-antd-colorBgElevated fixed inset-x-0 bottom-0 z-50 mt-24 rounded-tr-lg rounded-tl-lg ${className}`}
          >
            {headerContent}
            <div className="my-3 mx-auto h-2 w-[100px] rounded-full bg-colorText-light" />
            <Drawer.Title
              className={clsx(
                'flex items-center px-6 py-4 self-stretch gap-3 border-b border-b-borderSecondary bg-antd-colorBgContainer text-balance',
              )}
            >
              {showCloseButton && (
                <Drawer.Close asChild>
                  <Button icon={<CloseIcon className=" text-base" />} type="text">
                    <span className="sr-only">Close</span>
                  </Button>
                </Drawer.Close>
              )}
              <Typography.Paragraph className="text-base m-0 font-medium font-plex text-center flex-1">
                {title}
              </Typography.Paragraph>
              {titleSuffix}
            </Drawer.Title>
            <div
              className={clsx(
                'flex p-6 items-center justify-center shrink-0 self-stretch gap-6 text-colorText-light',
                contentCentered && 'justify-center',
              )}
            >
              {children}
            </div>
          </Drawer.Content>
          <Drawer.Overlay />
        </FocusScope>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
