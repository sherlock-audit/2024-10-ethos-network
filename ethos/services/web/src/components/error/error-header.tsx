import { LogoFull } from 'components/icons';
import { tokenCssVars } from 'config/theme';

export const ERROR_HEADER_HEIGHT = 91;

export function ErrorHeader() {
  return (
    <header
      css={{
        height: ERROR_HEADER_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tokenCssVars.colorBgBase,
        color: tokenCssVars.colorTextBase,
      }}
    >
      <LogoFull width="auto" height={26} />
    </header>
  );
}
