// TODO: Move this component to a shared

import { css } from '@emotion/react';
import { type EthosUserTarget, fromUserKey } from '@ethos/domain';
import { Carousel, Col, Modal, Row, Typography } from 'antd';
import { useState } from 'react';
import { ReviewModal } from '../../../../../../(root)/profile/_components/review-modal/review-modal.component';
import { VouchModal } from '../../../../../../(root)/profile/_components/vouch-modal/vouch-modal.component';
import { ProfileReviewCard } from 'components/profile-review-card/profile-review-card.component';
import { tokenCssVars } from 'config/theme';
import { useInteractedWith, usePeopleToReview } from 'hooks/api/related-profiles.hooks';
import { splitArrayIntoChunks } from 'utils/array-utils';

type Props = {
  actionType: 'review' | 'vouch';
  isOpen: boolean;
  close: () => void;
  stepCompleted: () => void;
};

export function VouchReviewRelatedPeopleModal({ isOpen, close, actionType, stepCompleted }: Props) {
  const [isVouchReviewModalOpen, setIsVouchReviewModalOpen] = useState(false);
  const [currentReviewTarget, setCurrentReviewTarget] = useState<EthosUserTarget | null>(null);

  const { data: actors } = usePeopleToReview();
  const { data: actorsInteracted } = useInteractedWith();
  const groupedActors = splitArrayIntoChunks(actors ?? [], 3);

  const groupedInteractedActors = splitArrayIntoChunks(actorsInteracted ?? [], 3);

  function closeVouchReviewModal(successful: boolean) {
    if (successful) {
      stepCompleted();
    }
    setIsVouchReviewModalOpen(false);
  }

  return (
    <>
      <Modal
        title="Select something or someone to [review/vouch]"
        css={css`
          & .ant-modal-title {
            text-align: center;
          }
        `}
        open={isOpen}
        onCancel={close}
        footer={null}
      >
        <Typography.Text
          css={css`
            text-align: center;
            display: block;
            margin-bottom: 10px;
          `}
        >
          Here’s a list of relevant people we think you
          <br /> might want to [review/vouch].
        </Typography.Text>
        {groupedActors?.length !== 0 && (
          <>
            <Typography.Text
              strong
              css={css`
                text-align: center;
                display: block;
                margin: 10px 0;
              `}
            >
              Notable people
            </Typography.Text>
            <div
              css={css`
                display: block;
              `}
            >
              <Carousel
                css={css`
                  padding-bottom: 25px;

                  & .slick-dots button {
                    background: ${tokenCssVars.colorTextBase};
                  }
                `}
              >
                {groupedActors.map((group, index) => (
                  <div
                    css={css`
                      height: 240px;
                    `}
                    key={index}
                  >
                    <Row
                      wrap={false}
                      gutter={{ xs: 4, sm: 8, lg: 24 }}
                      css={css`
                        overflow: hidden;
                      `}
                    >
                      {group?.map((actor) => (
                        <Col key={actor.userkey} lg={8}>
                          <ProfileReviewCard
                            actor={actor}
                            actionType={actionType}
                            displayReviewStats
                            buttonAction={() => {
                              setCurrentReviewTarget(fromUserKey(actor.userkey));
                              setIsVouchReviewModalOpen(true);
                            }}
                          />
                        </Col>
                      ))}
                    </Row>
                  </div>
                ))}
              </Carousel>
            </div>
          </>
        )}
        {groupedInteractedActors.length !== 0 && (
          <>
            <Typography.Text
              strong
              css={css`
                text-align: center;
                display: block;
                margin: 10px 0;
              `}
            >
              Interacted with
            </Typography.Text>
            <div
              css={css`
                display: block;
              `}
            >
              <Carousel
                css={css`
                  padding-bottom: 25px;

                  & .slick-dots button {
                    background: ${tokenCssVars.colorTextBase};
                  }
                `}
              >
                {groupedInteractedActors.map((group, index) => (
                  <div
                    css={css`
                      height: 240px;
                    `}
                    key={index}
                  >
                    <Row
                      wrap={false}
                      gutter={{ xs: 4, sm: 8, lg: 24 }}
                      css={css`
                        overflow: hidden;
                      `}
                    >
                      {group?.map((actor) => (
                        <Col key={actor.userkey} span={8}>
                          <ProfileReviewCard
                            actor={actor}
                            actionType={actionType}
                            displayTransactionStats
                            buttonAction={() => {
                              setCurrentReviewTarget(fromUserKey(actor.userkey));
                              setIsVouchReviewModalOpen(true);
                            }}
                          />
                        </Col>
                      ))}
                    </Row>
                  </div>
                ))}
              </Carousel>
            </div>
          </>
        )}
      </Modal>
      {actionType === 'review' && currentReviewTarget && (
        <ReviewModal
          target={currentReviewTarget}
          isOpen={isVouchReviewModalOpen}
          close={closeVouchReviewModal}
        />
      )}
      {actionType === 'vouch' && currentReviewTarget && (
        <VouchModal
          target={currentReviewTarget}
          isOpen={isVouchReviewModalOpen}
          close={closeVouchReviewModal}
        />
      )}
    </>
  );
}
