import { LargeMarketCard } from './large-market-card.component.tsx';
import { MediumMarketCard, type MediumMarketCardProps } from './medium-market-card.component.tsx';
import { SmallMarketCard } from './small-market-card.component.tsx';
import { type MarketWithStats } from '~/types/markets.ts';

export type BaseMarketCardsProps = {
  market: MarketWithStats;
};

type MarketCardSize = 'large' | 'medium' | 'small';
const CardSizeMap: Record<MarketCardSize, React.FC<BaseMarketCardsProps>> = {
  large: LargeMarketCard,
  medium: MediumMarketCard,
  small: SmallMarketCard,
};

type MarketCardProps = BaseMarketCardsProps &
  ({ size: 'large' | 'small' } | ({ size: 'medium' } & MediumMarketCardProps));

export function MarketCard(props: MarketCardProps) {
  const Component = CardSizeMap[props.size];

  return <Component {...props} />;
}
