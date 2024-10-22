import { useCallback, useEffect, useRef, useState } from 'react';
import { type CountUpProps, useCountUp } from 'react-countup';
import { tokenCssVars } from 'config';

// Define a type for animation variants
type AnimationVariant = 'color' | 'scale' | 'combined' | 'none';

// Update AnimatedNumberProps to include animationVariant
type AnimatedNumberProps = {
  target: number;
  animationDuration?: number;
  animationDelay?: number;
  animationVariant?: AnimationVariant;
  numberFormatter?: CountUpProps['formattingFn'];
  firstAnimationFromZero?: boolean;
};

export function AnimatedNumber({
  target,
  animationDuration = 1,
  animationDelay = 0.1,
  animationVariant = 'combined',
  numberFormatter,
  firstAnimationFromZero,
}: AnimatedNumberProps) {
  const prevTargetRef = useRef(firstAnimationFromZero ? 0 : target);
  const currentTargetRef = useRef(target);
  const [blinkColor, setBlinkColor] = useState('unset');
  const [scale, setScale] = useState(1);
  const elementRef = useRef<HTMLElement>(null);

  const handleEnd = useCallback(() => {
    prevTargetRef.current = currentTargetRef.current;
    setScale(1);
    setBlinkColor('unset');
  }, []);

  const { update } = useCountUp({
    ref: elementRef,
    formattingFn: numberFormatter,
    start: prevTargetRef.current,
    end: currentTargetRef.current,
    useEasing: false,
    delay: 0,
    duration: animationDuration,
    onEnd: handleEnd,
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (animationVariant === 'color' || animationVariant === 'combined') {
        if (target > currentTargetRef.current) {
          setBlinkColor(tokenCssVars.colorSuccess);
        } else if (target < currentTargetRef.current) {
          setBlinkColor(tokenCssVars.colorError);
        }
      } else {
        setBlinkColor('unset');
      }

      if (animationVariant === 'scale' || animationVariant === 'combined') {
        if (target > currentTargetRef.current) {
          setScale(1.1);
        } else if (target < currentTargetRef.current) {
          setScale(0.9);
        }
      } else {
        setScale(1);
      }

      currentTargetRef.current = target;
      update(target);
    }, animationDelay * 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [target, update, animationDelay, animationVariant]);

  return (
    <span
      css={{
        color: blinkColor,
        transform: `scale(${scale})`,
        transition: `transform ${animationDuration}s ease, color ${animationDuration}s ease`,
        display: 'inline-block',
      }}
    >
      <span ref={elementRef} />
    </span>
  );
}

type AnimatedScoreProps = {
  score: number;
  animationVariant?: AnimationVariant;
  firstAnimationFromZero?: boolean;
};

export function AnimatedScore({
  score,
  animationVariant,
  firstAnimationFromZero,
}: AnimatedScoreProps) {
  const numberFormatterRef = useRef((number: number) => String(number));

  return (
    <AnimatedNumber
      target={score}
      animationVariant={animationVariant}
      firstAnimationFromZero={firstAnimationFromZero}
      animationDelay={0.1}
      animationDuration={1}
      numberFormatter={numberFormatterRef.current}
    />
  );
}
