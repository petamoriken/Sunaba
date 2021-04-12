/* eslint-disable @typescript-eslint/ban-types */

interface ErrorConstructor {
  /** Create .stack property on a target object (V8 only) */
  captureStackTrace?(targetObject: object, constructorOpt?: Function): void;
}
