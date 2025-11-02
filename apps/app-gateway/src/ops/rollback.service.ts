import { Injectable } from '@nestjs/common';

@Injectable()
export class RollbackService {
  startRollback() {
    return { status: 'started' };
  }
}

