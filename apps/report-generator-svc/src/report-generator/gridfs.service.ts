import { Injectable } from '@nestjs/common';

@Injectable()
export class GridFsService {
  async saveReport(_markdown: string): Promise<string> {
    throw new Error('GridFsService.saveReport not implemented');
  }
}
