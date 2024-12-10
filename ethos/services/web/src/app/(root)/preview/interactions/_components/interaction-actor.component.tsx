import { type ActivityActor, type Relationship } from '@ethos/domain';
import { Flex } from 'antd';
import { UserAvatar } from 'components/avatar/avatar.component';
import { PersonName } from 'components/person-name/person-name.component';

export function InteractionActor({
  relationship,
  actor,
}: {
  relationship: Relationship;
  actor: ActivityActor;
}) {
  if (actor.name?.includes('...')) {
    if (relationship.transactions.length > 0) {
      if (relationship.transactions[0].to_address_label) {
        actor.name = relationship.transactions[0].to_address_label;
      }
      if (relationship.transactions[0].from_address_label) {
        actor.name = relationship.transactions[0].from_address_label;
      }
    }
  }

  const blockieData = 'data:image/png;base64';

  if (!actor.avatar || actor.avatar.startsWith(blockieData)) {
    if (relationship.transactions.length > 0) {
      if (relationship.transactions[0].to_address_entity_logo) {
        actor.avatar = relationship.transactions[0].to_address_entity_logo;
      }
      if (relationship.transactions[0].from_address_entity_logo) {
        actor.avatar = relationship.transactions[0].from_address_entity_logo;
      }
    }
  }

  return (
    <Flex gap={12} align="center">
      <UserAvatar actor={actor} />
      <Flex vertical>
        <PersonName size="large" target={actor} />
      </Flex>
    </Flex>
  );
}
