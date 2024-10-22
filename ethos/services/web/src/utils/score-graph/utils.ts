import * as d3 from 'd3';
import { SVG_HEIGHT, SVG_OPACITY, SVG_WIDTH } from './constants';

export function fallbackScoreGraph(color: string) {
  const svg = `
      <svg width="640" height="400" preserveAspectRatio="none" fill="${color}" viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M640,218.182C426.675,218.182,213.349,218.182,0.024,218.182C0.016,218.182,0.008,218.182,0,218.182L0,1309.091C0.008,1309.091,0.016,1309.091,0.024,1309.091C213.349,1309.091,426.675,1309.091,640,1309.091Z"
          opacity="${SVG_OPACITY}"
        />
      </svg>
    `;

  return `"data:image/svg+xml;base64,${btoa(svg)}"`;
}

export function getSvgElement(area: string | null, scoreColor: string) {
  // Create the SVG container.
  const svg = d3
    .create('svg')
    .attr('width', SVG_WIDTH)
    .attr('height', SVG_HEIGHT)
    .attr('preserveAspectRatio', 'none')
    .attr('fill', scoreColor)
    .attr('viewBox', `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`);

  svg.append('path').attr('d', area).attr('opacity', SVG_OPACITY);

  // Return the SVG element.
  return svg.node();
}

export function svg2Blob(svg: SVGSVGElement) {
  const serializer = new XMLSerializer();
  const xmlString = serializer.serializeToString(svg);

  return new Blob([xmlString], { type: 'image/svg+xml' });
}
