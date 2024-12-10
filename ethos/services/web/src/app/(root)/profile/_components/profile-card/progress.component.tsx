import Progress, { type ProgressProps } from 'antd/es/progress/progress';
import { useEffect, useRef } from 'react';
import { type SetRequired } from 'type-fest';

export function CircularStepProgress({
  percent,
  steps = {
    count: 5,
    gap: 10,
  },
  strokeColor,
  trailColor,
  children,
  ...props
}: SetRequired<ProgressProps, 'strokeColor' | 'trailColor'>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const circles = ref.current?.querySelectorAll('circle');

    if (!circles?.length || percent === undefined || percent < 0 || percent > 100 || !steps) {
      return;
    }

    let duplicatedCircles: SVGCircleElement[] = [];

    const stepCount = typeof steps === 'object' ? steps.count : steps;

    // Get duplicated circles
    circles.forEach((circle) => {
      if (circle.style.position === 'absolute') {
        duplicatedCircles.push(circle);
      }
    });

    // In case of step change, remove all the duplicated circles
    if (duplicatedCircles.length !== stepCount && duplicatedCircles.length > 0) {
      duplicatedCircles.forEach((circle) => {
        circle.remove();
      });

      duplicatedCircles = [];
    }
    const baseCircleStyles = window.getComputedStyle(circles[0]);

    const initialOffset = parseFloat(baseCircleStyles.getPropertyValue('stroke-dashoffset') || '0');
    const radius = parseFloat(baseCircleStyles.getPropertyValue('r') || '0');
    const circumference = 2 * Math.PI * radius;

    // Create absolutely positioned circles above the track circles
    if (duplicatedCircles.length === 0) {
      circles.forEach((circle) => {
        const clonedCircle = circle.cloneNode(true) as SVGCircleElement;
        clonedCircle.style.position = 'absolute';
        clonedCircle.classList.add('duplicated');
        clonedCircle.style.zIndex = String(1);
        clonedCircle.style.strokeDashoffset = circumference.toString();

        circle.parentNode?.appendChild(clonedCircle);

        duplicatedCircles.push(clonedCircle);
      });
    }

    const targetIndex = Math.floor((percent / 100) * duplicatedCircles.length);

    for (let i = 0; i < duplicatedCircles.length; i++) {
      duplicatedCircles[i].style.strokeDashoffset =
        i <= targetIndex ? initialOffset.toString() : circumference.toString();
      duplicatedCircles[i].style.stroke = i <= targetIndex ? (strokeColor as string) : trailColor;
    }

    if (percent === 100) {
      return;
    }

    const progressPerCircle = 100 / stepCount;
    const normalizedProgress = percent % progressPerCircle;

    const updatedOffset =
      circumference - ((circumference - initialOffset) * normalizedProgress) / progressPerCircle;

    duplicatedCircles[targetIndex].style.strokeDashoffset = updatedOffset.toString();
    duplicatedCircles[targetIndex].style.stroke = strokeColor as string;

    // Override the ant design's way of setting the trail color to the given color if value > 50% of the arc circumference
    circles[targetIndex].style.stroke = trailColor;
  }, [percent, steps, strokeColor, trailColor]);

  return (
    <Progress ref={ref} {...props} percent={percent} trailColor={trailColor} steps={steps}>
      {children}
    </Progress>
  );
}
