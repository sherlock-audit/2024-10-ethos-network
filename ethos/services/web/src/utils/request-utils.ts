import { JsonHelper } from '@ethos/helpers';
import { cloneDeep, merge } from 'lodash-es';

export class NetError extends Error {
  status: number;
  body: any;
  code?: string;

  constructor(
    message: string,
    { status, body, code }: { status: number; body: any; code?: string },
  ) {
    super(message);

    this.status = status;
    this.body = body;

    if (code) {
      this.code = code;
    }
  }
}

export function getApi(origin: string, defaultOptions?: RequestInit) {
  return async function request<R>(pathname: string, options?: RequestInit): Promise<R> {
    const url = new URL(pathname, origin);

    const response = await fetch(url, merge(cloneDeep(defaultOptions), options));

    const isJSON = response.headers.get('Content-Type')?.includes('application/json');

    const body = isJSON
      ? await response.text().then((x) => JSON.parse(x, JsonHelper.reviver))
      : await response.text();

    if (response.status > 399) {
      const code = isJSON ? body?.error?.code : undefined;

      throw new NetError(`${response.status}: ${response.statusText}`, {
        status: response.status,
        body,
        code,
      });
    }

    return body as R;
  };
}
