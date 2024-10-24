import { type KeysOfUnion, type Simplify } from 'type-fest';

type UnionOptionalInner<
  BaseType extends object,
  EveryKey extends KeysOfUnion<BaseType> = KeysOfUnion<BaseType>,
> = Simplify<
  // 1. For each member of the union (Note: `T extends any` is distributive)
  BaseType extends object
    ? // 2. Preserve the original type
      BaseType & { [K in Exclude<EveryKey, keyof BaseType>]?: undefined } // 3. And map other keys to `{ key?: undefined }`
    : never
>;

/**
 * TypeScript unions got you down? Having to write dozens of `"key" in obj`?
 *
 * This preserves the union, but makes all of those "Property does not exist on
 * type" errors go away by marking them as `{ key?: undefined }`.
 *
 * Source: https://x.com/buildsghost/status/1843513210001138076
 */
export type UnionOptional<BaseType extends object> = UnionOptionalInner<BaseType>;
