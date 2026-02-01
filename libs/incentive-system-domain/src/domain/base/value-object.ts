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
