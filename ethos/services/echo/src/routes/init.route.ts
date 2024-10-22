import { type RequestHandler } from 'express';
import { type Route } from './route.base';

// It allows to extract methods from a class. This was copied from
// https://github.com/sindresorhus/type-fest/pull/4/files and slightly modified.
// Unfortunately, the proposal was rejected so I couldn't import it from type-fest.
type ExtractMethods<ObjectType> = Pick<
  ObjectType,
  {
    [Method in keyof ObjectType]: ObjectType[Method] extends (...args: any[]) => unknown
      ? Method
      : never;
  }[keyof ObjectType]
>;

/**
 * Function to initialize a route handler.
 * @param RouteClass Route class that extends the base Route class.
 * @param method Method on that route class to be called.
 * @returns Express request handler.
 */
export function route<T extends Route>(
  RouteClass: new () => T,
  method: Exclude<keyof ExtractMethods<T>, 'initService'>,
): RequestHandler {
  if (typeof method !== 'string') {
    throw new Error(`Method ${method.toString()} is not a string`);
  }

  const route = new RouteClass();

  if (typeof route[method] !== 'function') {
    throw new Error(`Method ${method} is not implemented in ${RouteClass.name}`);
  }

  // Assign the correct context to the method so it doesn't use `this` from this function.
  const fn = route[method].bind(route);

  return (req, res, next) => {
    fn(req, res, next).catch((err: unknown) => {
      if (next) {
        next(err);
      } else {
        req.logger.error({ err }, 'Error in route handler');

        throw err;
      }
    });
  };
}
