import { Layout as AntLayout } from 'antd';
import { type ReactNode } from 'react';

export default function Layout({ children }: React.PropsWithChildren): ReactNode {
  return <AntLayout>{children}</AntLayout>;
}
