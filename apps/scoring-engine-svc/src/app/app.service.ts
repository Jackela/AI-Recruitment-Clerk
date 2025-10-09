import { Injectable } from '@nestjs/common';

/**
 * Provides app functionality.
 */
@Injectable()
export class AppService {
  /**
   * Retrieves data.
   * @returns The { message: string }.
   */
  getData(): { message: string } {
    return { message: 'Hello API' };
  }
}
