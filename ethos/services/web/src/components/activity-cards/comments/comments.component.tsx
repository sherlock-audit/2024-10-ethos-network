import { css } from '@emotion/react';
import { discussionContractName } from '@ethos/contracts';
import { Divider, Flex } from 'antd';
import React from 'react';
import { type CommentProps, CommentCard } from './comment.component';
import { type CommentTarget } from './comment.types';
import { LoadingWrapper } from 'components/loading-wrapper/loading-wrapper.component';
import { tokenCssVars } from 'config/theme';
import { useBlockchainManager } from 'contexts/blockchain-manager.context';
import { useReplyInfinite } from 'hooks/api/echo.hooks';

export type CommentsProps = {
  target: CommentTarget;
} & Pick<CommentProps, 'onReplyTargetChanged' | 'depth'>;

export function Comments({ target, onReplyTargetChanged, depth = 0 }: CommentsProps) {
  const { blockchainManager } = useBlockchainManager();
  const { data, isPending } = useReplyInfinite({
    parentIds: [target.id],
    targetContract: blockchainManager.getContractAddress(target.contract),
    pagination: { limit: 10, offset: 0 },
  });

  const repliesPaginated = data?.values;

  return (
    <LoadingWrapper
      type="loading"
      isLoading={isPending}
      isEmpty={!repliesPaginated?.length}
      emptyDescription="No comments yet"
    >
      <Flex flex={1} vertical>
        {repliesPaginated?.map((x, i) => (
          <React.Fragment key={x.id}>
            {i !== 0 && target.contract !== discussionContractName && (
              <Divider
                css={css`
                  border-color: ${tokenCssVars.colorFillSecondary};
                  margin: 20px 0;
                `}
              />
            )}
            <CommentCard
              comment={{
                author: x.authorProfileId,
                target: {
                  contract: discussionContractName,
                  id: Number(x.id),
                },
                text: x.content,
                timestamp: Number(x.createdAt),
              }}
              depth={depth}
              onReplyTargetChanged={onReplyTargetChanged}
            />
          </React.Fragment>
        ))}
      </Flex>
    </LoadingWrapper>
  );
}
