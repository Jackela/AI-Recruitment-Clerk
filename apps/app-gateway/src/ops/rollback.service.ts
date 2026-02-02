import { Injectable } from '@nestjs/common';

@Injectable()
export class RollbackService {
  public startRollback(): { status: string } {
    return { status: 'started' };
  }
}

