import { ValueObject } from './base/value-object.js';

/**
 * Represents the ip address.
 */
export class IPAddress extends ValueObject<{ value: string }> {
  /**
   * Initializes a new instance of the IP Address.
   * @param props - The props.
   */
  constructor(props: { value: string }) {
    if (!IPAddress.isValidIPv4(props.value)) {
      throw new Error(`Invalid IPv4 address: ${props.value}`);
    }
    super(props);
  }

  private static isValidIPv4(ip: string): boolean {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  /**
   * Retrieves value.
   * @returns The string value.
   */
  getValue(): string {
    return this.props.value;
  }
}
