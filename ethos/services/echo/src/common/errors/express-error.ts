export class ExpressError extends Error {
  code?: string;
  expose?: boolean;
  status?: number;
  statusCode?: number;

  constructor(message: string, opts: { code?: string; expose?: boolean; status: number }) {
    super(message);

    Object.assign(this, opts);
  }
}
