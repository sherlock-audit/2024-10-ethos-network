import { type ReactNode } from 'react';
import { MainLayout } from '../../components/layout/layout.component';

export default function Layout({ children }: React.PropsWithChildren): ReactNode {
  return <MainLayout>{children}</MainLayout>;
}
