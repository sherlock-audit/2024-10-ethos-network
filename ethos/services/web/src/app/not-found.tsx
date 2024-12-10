import { NotFound } from 'components/error/not-found';
import { MainLayout } from 'components/layout/layout.component';

export default function NotFoundPage() {
  return (
    <MainLayout>
      <NotFound />
    </MainLayout>
  );
}
