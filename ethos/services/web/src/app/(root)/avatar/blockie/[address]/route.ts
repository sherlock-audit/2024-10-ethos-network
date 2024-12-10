import { duration } from '@ethos/helpers';
import makeBlockie from 'ethereum-blockies-base64';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, props: { params: Promise<{ address: string }> }) {
  const params = await props.params;
  const { address } = params;

  try {
    const blockieData = makeBlockie(address);
    const blockieBuffer = Buffer.from(blockieData.split(',')[1], 'base64');

    const response = new NextResponse(blockieBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': `public, max-age=${duration(1, 'year').toSeconds()}, immutable`,
      },
    });

    return response;
  } catch (error) {
    console.error('Error generating blockie:', error);
    // If there's an error, redirect to the placeholder image
    const placeholderUrl = new URL(
      '/assets/images/og/avatar-placeholder.svg',
      request.url,
    ).toString();

    return NextResponse.redirect(placeholderUrl, 307);
  }
}
