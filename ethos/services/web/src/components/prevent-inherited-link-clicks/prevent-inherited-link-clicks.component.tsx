import { type PropsWithChildren } from 'react';

export function PreventInheritedLinkClicks({ children }: PropsWithChildren) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      {children}
    </div>
  );
}
