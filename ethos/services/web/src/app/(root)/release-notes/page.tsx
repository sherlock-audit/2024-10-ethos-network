'use client';

import { ReleasedScript } from '../../_scripts/released.script';
import { ReleaseNotesPanel } from './_components/release-notes-panel.component';
import { BasicPageWrapper } from 'components/basic-page-wrapper/basic-page-wrapper.component';

export default function Page() {
  return (
    <>
      <ReleasedScript />
      <BasicPageWrapper title="Release Notes">
        <ReleaseNotesPanel />
      </BasicPageWrapper>
    </>
  );
}
