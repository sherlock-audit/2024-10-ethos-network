import { type z } from 'zod';

type Code = Uppercase<string>;
type Fields = string[] | z.ZodIssue[];

export class ServiceError extends Error {
  code: Code;
  fields?: Fields;
  status?: number;

  static BadRequest(
    message: string,
    { code = 'BAD_REQUEST', fields }: { code?: Code; fields?: Fields } = {},
  ): ServiceError {
    return new ServiceError(message, { code, fields, status: 400 });
  }

  static Unauthorized(
    message: string,
    { code = 'UNAUTHORIZED', fields }: { code?: Code; fields?: Fields } = {},
  ): ServiceError {
    return new ServiceError(message, { code, fields, status: 401 });
  }

  static Forbidden(
    message: string,
    { code = 'FORBIDDEN', fields }: { code?: Code; fields?: Fields } = {},
  ): ServiceError {
    return new ServiceError(message, { code, fields, status: 403 });
  }

  static NotFound(
    message: string,
    { code = 'NOT_FOUND', fields }: { code?: Code; fields?: Fields } = {},
  ): ServiceError {
    return new ServiceError(message, { code, fields, status: 404 });
  }

  static InternalServerError(
    message: string,
    { code = 'INTERNAL_SERVER_ERROR', fields }: { code?: Code; fields?: Fields } = {},
  ): ServiceError {
    return new ServiceError(message, { code, fields, status: 500 });
  }

  constructor(
    message: string,
    { fields, code, status }: { fields?: Fields; code: Code; status?: number },
  ) {
    super(message);

    this.code = code;
    this.status = status;

    if (fields) {
      this.fields = fields;
    }
  }

  toJSON(): { code: Code; fields?: Fields; message: string } {
    return {
      code: this.code,
      fields: this.fields,
      message: this.message,
    };
  }
}
