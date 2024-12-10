type Code = Uppercase<string>;

export class RouteError extends Error {
  code: Code;
  status: number;

  static BadRequest(
    message: string,
    { code = 'BAD_REQUEST', status = 400 }: { code?: Code; status?: number } = {},
  ): RouteError {
    return new RouteError(message, { code, status });
  }

  static Unauthorized(
    message: string,
    { code = 'UNAUTHORIZED', status = 401 }: { code?: Code; status?: number } = {},
  ): RouteError {
    return new RouteError(message, { code, status });
  }

  static Forbidden(
    message: string,
    { code = 'FORBIDDEN', status = 403 }: { code?: Code; status?: number } = {},
  ): RouteError {
    return new RouteError(message, { code, status });
  }

  constructor(message: string, { code, status }: { code: Uppercase<string>; status: number }) {
    super(message);

    this.code = code;
    this.status = status;
  }

  toJSON(): { code: string; message: string } {
    return {
      code: this.code,
      message: this.message,
    };
  }
}
