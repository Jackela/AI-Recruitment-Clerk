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
