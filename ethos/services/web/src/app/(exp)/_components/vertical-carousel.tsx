import { css } from '@emotion/react';
import { Carousel, type CarouselProps } from 'antd';
import { type CarouselRef } from 'antd/es/carousel';
import { type PropsWithChildren, useEffect, useRef } from 'react';

export type VerticalCarouselProps = Omit<
  CarouselProps,
  'verticalSwiping' | 'vertical' | 'afterChange'
>;

export function VerticalCarousel(props: PropsWithChildren<VerticalCarouselProps>) {
  const carouselDivElementRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<CarouselRef>(null);

  const activeStepRef = useRef<number>(0);

  useEffect(() => {
    // Prevent pull to refresh on mobile devices when the carousel is not at the top
    function preventPullToRefresh(e: TouchEvent) {
      if (activeStepRef.current !== 0 && window.scrollY === 0 && e.touches[0].clientY > 0) {
        e.preventDefault();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        carouselRef.current?.next();
      } else if (e.key === 'ArrowUp') {
        carouselRef.current?.prev();
      }
    }

    const element = carouselDivElementRef.current;

    if (element) {
      element.addEventListener('touchmove', preventPullToRefresh, { passive: false });
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      element?.removeEventListener('touchmove', preventPullToRefresh);
      window?.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={carouselDivElementRef} css={css({ overflow: 'hidden' })}>
      <Carousel
        ref={carouselRef}
        afterChange={(step) => (activeStepRef.current = step)}
        vertical={true}
        verticalSwiping={true}
        dotPosition="left"
        infinite={false}
        swipeToSlide={true}
        draggable={true}
        arrows={true}
        slidesToScroll={1}
        {...props}
      >
        {props.children}
      </Carousel>
    </div>
  );
}
