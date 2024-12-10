import { css } from '@emotion/react';

type CentredBackgroundImageProps = {
  image: string;
  imageSize: string;
  opacity?: number;
};

export function CentredBackgroundImage({
  image,
  imageSize,
  opacity = 1,
}: CentredBackgroundImageProps) {
  return (
    <div
      css={css({
        position: 'absolute',
        top: `calc((100% - ${imageSize}) / 2)`,
        left: `calc((100% - ${imageSize}) / 2)`,
        width: imageSize,
        height: imageSize,
        backgroundImage: `url('${image}')`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
        opacity,
        zIndex: 0,
      })}
    />
  );
}
