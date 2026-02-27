/**
 * Generic type for restore data used by ValueObject.restore() methods.
 * This is a type alias that represents the raw data structure needed
 * to reconstruct a ValueObject from persistence.
 *
 * @template T - The props type of the ValueObject
 *
 * @example
 * // For a ValueObject with props { value: string }
 * type MyIdRestoreData = RestoreData<{ value: string }>;
 *
 * // For complex ValueObjects with nested objects
 * interface UserProps { name: string; email: string; }
 * type UserRestoreData = RestoreData<UserProps>;
 */
export type RestoreData<T> = T;

/**
 * Generic type for restore data that may contain serialized Date strings
 * instead of Date objects. Useful for data coming from JSON persistence.
 *
 * @template T - The props type of the ValueObject
 */
export type SerializedRestoreData<T> = {
  [K in keyof T]: T[K] extends Date ? string | Date : T[K];
};

/**
 * Represents the value value object.
 */
export abstract class ValueObject<T> {
  protected readonly props: T;

  /**
   * Initializes a new instance of the Value Object.
   * @param props - The props.
   */
  constructor(props: T) {
    this.props = Object.freeze(props);
  }

  /**
   * Performs the equals operation.
   * @param vo - The vo.
   * @returns The boolean value.
   */
  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}
