'use client';

import {
  DisconnectOutlined,
  DiscordOutlined,
  GithubFilled,
  LinkedinFilled,
  QuestionOutlined,
  XOutlined,
} from '@ant-design/icons';
import { css } from '@emotion/react';
import { type AttestationService, type ProfileId } from '@ethos/blockchain-manager';
import { X_SERVICE } from '@ethos/domain';
import { Button, Card, Typography, Col, Row, Flex } from 'antd';
import { useCallback, useState } from 'react';
import { useIntercom } from 'react-use-intercom';
import { AttestationLink } from './attestation-link.component';
import { XAttestationModal } from './x-attestation/modal.component';
import { FarcasterFilled } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { useArchiveAttestation } from 'hooks/api/blockchain-manager';
import { useExtendedAttestations } from 'hooks/user/lookup';

type Service = {
  // TODO: move these services to a shared location once we support them
  key: string;
  value: string;
  icon: React.ReactNode;
  disabled: boolean;
  attestationService?: AttestationService;
};

/*
 * I am locally defining some of these since they are placeholders and not actual services that are supported yet.
 */
const serviceList: Service[] = [
  {
    key: 'x.com',
    value: X_SERVICE,
    icon: <XOutlined />,
    disabled: false,
    attestationService: X_SERVICE,
  },
  {
    key: 'discord',
    value: 'Discord',
    icon: <DiscordOutlined />,
    disabled: true,
  },
  {
    key: 'farcaster',
    value: 'Farcaster',
    icon: <FarcasterFilled />,
    disabled: true,
  },
  {
    key: 'github',
    value: 'GitHub',
    icon: <GithubFilled />,
    disabled: true,
  },
  {
    key: 'linkedin',
    value: 'LinkedIn',
    icon: <LinkedinFilled />,
    disabled: true,
  },
  {
    key: 'suggest',
    value: 'Suggest',
    icon: <QuestionOutlined />,
    disabled: false,
  },
];

type Props = {
  profileId: ProfileId;
};

export function Attestations({ profileId }: Props) {
  const { data: extendedAttestations, isLoading } = useExtendedAttestations({ profileId });
  const [activeAttestationModal, setActiveAttestationModal] = useState<Service['key'] | null>(null);

  const closeModal = useCallback(() => {
    setActiveAttestationModal(null);
  }, []);

  const archiveAttestation = useArchiveAttestation();

  const { showNewMessage } = useIntercom();

  return (
    <Row gutter={[22, 22]}>
      {serviceList.map((item) => {
        const extendedAttestation = extendedAttestations?.find(
          (a) => a.attestation.service === item.attestationService && !a.attestation.archived,
        );

        return (
          <Col key={item.key} xs={12} sm={8} md={6} lg={5}>
            <Card loading={isLoading} css={{ minHeight: 220 }}>
              <Flex vertical align="center" gap={12}>
                <Flex
                  align="center"
                  justify="center"
                  css={css`
                    width: 64px;
                    height: 64px;
                    background-color: ${tokenCssVars.colorBgLayout};
                    border-radius: 50%;
                    font-size: 24px;
                  `}
                >
                  {item.icon}
                </Flex>
                <Typography.Title level={5}>{item.value}</Typography.Title>
                {extendedAttestation ? (
                  <Typography.Text type="secondary" css={{ textAlign: 'center' }}>
                    Connected to
                    <br />
                    <AttestationLink
                      linkColor="primary"
                      key="attestation-link"
                      attestation={extendedAttestation}
                    />
                  </Typography.Text>
                ) : (
                  <Typography.Text type="secondary" css={{ textAlign: 'center' }}>
                    {item.key === 'suggest'
                      ? 'What else would you like to see here? Let us know.'
                      : `Connect ${item.value} to your Ethos profile.`}
                  </Typography.Text>
                )}
                {extendedAttestation
                  ? [
                      <Button
                        key="disconnect-button"
                        type="text"
                        danger
                        icon={<DisconnectOutlined />}
                        onClick={async () => {
                          try {
                            await archiveAttestation.mutateAsync({
                              service: extendedAttestation.attestation.service,
                              account: extendedAttestation.attestation.account,
                              profileId: extendedAttestation.attestation.profileId,
                            });
                          } catch {
                            // No special cases to handle
                          }
                        }}
                        loading={archiveAttestation.isPending}
                      >
                        Disconnect
                      </Button>,
                    ]
                  : item.key === 'suggest'
                    ? [
                        <Button
                          key="suggest-button"
                          type="primary"
                          onClick={() => {
                            showNewMessage(
                              "I'd like to see a new social connection for my Ethos profile and it is:\n\n",
                            );
                          }}
                        >
                          I’d like to see...
                        </Button>,
                      ]
                    : !item.disabled
                      ? [
                          <Button
                            key="connect-button"
                            onClick={() => {
                              setActiveAttestationModal(item.attestationService ?? '');
                            }}
                            type="primary"
                          >
                            Connect
                          </Button>,
                        ]
                      : [
                          <Button key="coming-soon" disabled>
                            Coming soon
                          </Button>,
                        ]}
              </Flex>
            </Card>
          </Col>
        );
      })}
      <XAttestationModal
        isOpen={activeAttestationModal === X_SERVICE}
        close={closeModal}
        profileId={profileId}
      />
    </Row>
  );
}
