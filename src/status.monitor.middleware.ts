import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import onHeaders from 'on-headers';
import { StatusMonitoringService } from './status.monitoring.service';
import { STATUS_MONITOR_OPTIONS_PROVIDER } from './status.monitor.constants';
import { StatusMonitorConfiguration } from './config/status.monitor.configuration';
import { IncomingMessage, ServerResponse } from 'http';

@Injectable()
export class StatusMonitorMiddleware implements NestMiddleware {
  constructor(
    private readonly statusMonitoringService: StatusMonitoringService,
    @Inject(STATUS_MONITOR_OPTIONS_PROVIDER)
    private readonly config: StatusMonitorConfiguration,
  ) {}

  use(req: IncomingMessage, res: ServerResponse, next: Function) {
    const url: string =
      (req as any).originalUrl || (req as any)?.raw?.originalUrl || req.url;
    if (
      this.config.ignoreStartsWith &&
      !url.startsWith(this.config.ignoreStartsWith) &&
      !url.startsWith(this.config.path)
    ) {
      const startTime = process.hrtime();
      onHeaders(res, () => {
        this.statusMonitoringService.collectResponseTime(
          res.statusCode,
          startTime,
        );
      });
    }

    next();
  }
}
