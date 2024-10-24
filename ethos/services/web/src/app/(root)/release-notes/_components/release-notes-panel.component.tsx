import { Card } from 'antd';
import { useThemeMode } from 'contexts/theme-manager.context';

function ReleasedPage(props: {
  channelId: string;
  title: string;
  topOffset: string;
  header: string;
  modules: string;
  colorPrimary: string;
  colorScheme: string;
  subTitle: string;
}) {
  const html = `
    <released-page
      channel-id="${props.channelId}"
      title="${props.title}"
      top-offset="${props.topOffset}"
      header="${props.header}"
      modules="${props.modules}"
      color-primary="${props.colorPrimary}"
      color-scheme="${props.colorScheme}"
      sub-title="${props.subTitle}"
    ></released-page>
  `;

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export function ReleaseNotesPanel() {
  const mode = useThemeMode();

  return (
    <Card>
      <ReleasedPage
        channelId="e82710e0-4930-43a3-a51a-655b92a3ceaa"
        title="Ethos Release Notes"
        topOffset="60"
        header="false"
        modules="changelog"
        colorPrimary="#00000000"
        colorScheme={mode}
        subTitle="The latest updates and improvements."
      />
    </Card>
  );
}
