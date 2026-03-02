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
 * Represents the incentive domain value object.
 */
export abstract class ValueObject<T> {
  protected readonly props: T;

  /**
   * Initializes a new instance of the Value Object.
   * @param props - The props.
   */
  constructor(props: T) {
    this.props = Object.freeze({ ...props });
  }

  /**
   * Determines whether the provided value object is equal to the current instance.
   * @param other - The other value object.
   * @returns The boolean value.
   */
  public equals(other?: ValueObject<T>): boolean {
    if (!other) {
      return false;
    }

    if (!other.props) {
      return false;
    }

    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
