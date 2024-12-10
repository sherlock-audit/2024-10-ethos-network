import { NotFound } from 'components/error/not-found';
import { tokenCssVars } from 'config/theme';

export default function NotFoundPage() {
  return (
    <NotFound description="Invalid invite link" height={tokenCssVars.fullHeight} withErrorHeader />
  );
}
