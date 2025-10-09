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
    this.props = props;
  }

  protected equals(other: ValueObject<T>): boolean {
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
