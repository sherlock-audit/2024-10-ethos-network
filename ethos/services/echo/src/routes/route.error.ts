export class RouteError extends Error {
  code: string;
  status: number;

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
