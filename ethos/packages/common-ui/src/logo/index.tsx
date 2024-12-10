'use client';
import Icon from '@ant-design/icons';
import { type CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { LogoSvg, LogoFullSvg, LogoInvertedSvg } from './logos.js';

export function Logo(props: Partial<CustomIconComponentProps>) {
  return <Icon component={LogoSvg} {...props} />;
}

export function LogoFull(props: Partial<CustomIconComponentProps>) {
  return <Icon component={LogoFullSvg} {...props} />;
}

export function LogoInverted(props: Partial<CustomIconComponentProps>) {
  return <Icon component={LogoInvertedSvg} {...props} />;
}
