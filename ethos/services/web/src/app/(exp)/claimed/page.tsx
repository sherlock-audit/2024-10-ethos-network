'use client';
import { VerticalCarousel } from '../_components/vertical-carousel';
import { StepOne } from './steps/step-one.component';
import { StepThree } from './steps/step-three.component';
import { StepTwo } from './steps/step-two.component';
import { FeatureGatedPage } from 'components/feature-gate/feature-gate-route';
import { tokenCssVars } from 'config/theme';

export default function Page() {
  return (
    <FeatureGatedPage featureGate="showExpClaimPage" height={tokenCssVars.fullHeight}>
      <VerticalCarousel>
        <StepOne />
        <StepTwo />
        <StepThree />
      </VerticalCarousel>
    </FeatureGatedPage>
  );
}
