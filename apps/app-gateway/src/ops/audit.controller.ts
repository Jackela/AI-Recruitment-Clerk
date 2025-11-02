import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OpsGuard } from './ops.guard';
import { OpsPermissionsGuard } from './ops-permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@ai-recruitment-clerk/shared-dtos';
import fs from 'fs';
import path from 'path';

@Controller('ops/audit')
@UseGuards(OpsGuard, OpsPermissionsGuard)
export class AuditController {
  @Get('export')
  @Permissions(Permission.VIEW_LOGS)
  export(@Query('date') date?: string) {
    const d = (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : new Date().toISOString().slice(0,10);
    const file = path.resolve('tools/logs/audit', `audit-${d}.jsonl`);
    if (!fs.existsSync(file)) return { date: d, entries: [] };
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).slice(-1000);
    const entries = lines.map(l => { try { return JSON.parse(l); } catch { return { raw: l }; } });
    return { date: d, entries };
  }
}
