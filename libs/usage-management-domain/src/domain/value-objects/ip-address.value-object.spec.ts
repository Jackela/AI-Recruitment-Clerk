import { IPAddress } from './ip-address.value-object';

describe('IPAddress', () => {
  describe('constructor', () => {
    it('should create IPAddress with valid IPv4', () => {
      const ip = new IPAddress({ value: '192.168.1.1' });
      expect(ip.getValue()).toBe('192.168.1.1');
    });

    it('should throw error for invalid IPv4', () => {
      expect(() => new IPAddress({ value: 'invalid' })).toThrow(
        'Invalid IPv4 address: invalid',
      );
    });

    it('should throw error for out of range octets', () => {
      expect(() => new IPAddress({ value: '256.0.0.1' })).toThrow(
        'Invalid IPv4 address: 256.0.0.1',
      );
    });

    it('should throw error for incomplete address', () => {
      expect(() => new IPAddress({ value: '192.168.1' })).toThrow(
        'Invalid IPv4 address: 192.168.1',
      );
    });
  });

  describe('getValue', () => {
    it('should return the IP string value', () => {
      const ip = new IPAddress({ value: '10.0.0.1' });
      expect(ip.getValue()).toBe('10.0.0.1');
    });
  });

  describe('valid IPv4 addresses', () => {
    const validIPs = [
      '0.0.0.0',
      '127.0.0.1',
      '192.168.1.1',
      '255.255.255.255',
      '10.0.0.1',
      '172.16.0.1',
    ];

    validIPs.forEach((ipStr) => {
      it(`should accept valid IP: ${ipStr}`, () => {
        expect(() => new IPAddress({ value: ipStr })).not.toThrow();
      });
    });
  });

  describe('invalid IPv4 addresses', () => {
    const invalidIPs = [
      'invalid',
      '256.0.0.1',
      '192.168.1',
      '192.168.1.1.1',
      '192.168.1.-1',
      'abc.def.ghi.jkl',
      '',
    ];

    invalidIPs.forEach((ipStr) => {
      it(`should reject invalid IP: ${ipStr}`, () => {
        expect(() => new IPAddress({ value: ipStr })).toThrow();
      });
    });
  });
});
