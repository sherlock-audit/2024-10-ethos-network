'use client';

import { DisconnectOutlined, XOutlined } from '@ant-design/icons';
import { type AttestationService, type ProfileId } from '@ethos/blockchain-manager';
import { X_SERVICE } from '@ethos/domain';
import { Button, Card, List, Typography, Tooltip } from 'antd';
import { useCallback, useState } from 'react';
import { AttestationLink } from './attestation-link.component';
import { XAttestationModal } from './x-attestation/modal.component';
import { CustomPopover } from 'components/custom-popover/custom-popover.component';
import { LottieLoader } from 'components/loading-wrapper/lottie-loader.component';
import { useArchiveAttestation } from 'hooks/api/blockchain-manager';
import { useExtendedAttestations } from 'hooks/user/lookup';

type Service = {
  // TODO: move these services to a shared location once we support them
  key: AttestationService;
  value: string;
  icon: React.ReactNode;
  disabled: boolean;
};

const serviceList: Service[] = [
  {
    key: X_SERVICE,
    value: X_SERVICE,
    icon: <XOutlined />,
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

  return (
    <>
      <Card title="Social connections">
        <List
          dataSource={serviceList}
          itemLayout="horizontal"
          loading={{ spinning: isLoading, indicator: <LottieLoader size={24} /> }}
          renderItem={(item) => {
            const extendedAttestation = extendedAttestations?.find(
              (a) => a.attestation.service === item.key && !a.attestation.archived,
            );

            return (
              <List.Item
                actions={
                  extendedAttestation
                    ? [
                        <AttestationLink
                          key="attestation-link"
                          attestation={extendedAttestation}
                        />,
                        <Tooltip key="disconnect-tooltip" title="Disconnect">
                          <Button
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
                          />
                        </Tooltip>,
                      ]
                    : !item.disabled
                      ? [
                          <Button
                            key="connect-button"
                            onClick={() => {
                              setActiveAttestationModal(item.key);
                            }}
                          >
                            Connect
                          </Button>,
                        ]
                      : [
                          <CustomPopover
                            key="connect-button"
                            title="Coming soon"
                            trigger="click"
                            content={`Connecting social accounts for ${item.value} is coming soon.`}
                          >
                            <Button>Connect</Button>
                          </CustomPopover>,
                        ]
                }
              >
                <List.Item.Meta
                  avatar={item.icon}
                  title={<Typography.Text>{item.value}</Typography.Text>}
                />
              </List.Item>
            );
          }}
        />
      </Card>
      <XAttestationModal
        isOpen={activeAttestationModal === X_SERVICE}
        close={closeModal}
        profileId={profileId}
      />
    </>
  );
}
