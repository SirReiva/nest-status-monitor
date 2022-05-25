import {
  Get,
  Controller,
  HttpCode,
  Inject,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { HealthCheckService } from './health.check.service';
import { PATH_METADATA } from '@nestjs/common/constants';
import { STATUS_MONITOR_OPTIONS_PROVIDER } from './status.monitor.constants';
import { StatusMonitorConfiguration } from './config/status.monitor.configuration';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { from, interval, map, of, switchMap } from 'rxjs';
import { StatusMonitoringService } from './status.monitoring.service';

@Controller()
export class StatusMonitorController {
  data: any;
  render: HandlebarsTemplateDelegate;

  constructor(
    private readonly healtCheckService: HealthCheckService,
    @Inject(STATUS_MONITOR_OPTIONS_PROVIDER) config: StatusMonitorConfiguration,
    private readonly statusMonitoringService: StatusMonitoringService,
  ) {
    const bodyClasses = Object.keys(config.chartVisibility)
      .reduce((accumulator, key) => {
        if (config.chartVisibility[key] === false) {
          accumulator.push(`hide-${key}`);
        }
        return accumulator;
      }, [])
      .join(' ');

    this.data = {
      title: config.pageTitle,
      port: config.port,
      bodyClasses: bodyClasses,
      script: readFileSync(join(__dirname, '../src/public/javascripts/app.js')),
      style: readFileSync(
        join(__dirname, '../src/public/stylesheets/style.css'),
      ),
    };

    const htmlTmpl = readFileSync(
      join(__dirname, '../src/public/index.html'),
    ).toString();

    this.render = Handlebars.compile(htmlTmpl, { strict: true });
  }

  public static forRoot(rootPath: string = 'monitor') {
    Reflect.defineMetadata(PATH_METADATA, rootPath, StatusMonitorController);
    return StatusMonitorController;
  }

  @Get()
  @HttpCode(200)
  async root() {
    const healtData = await this.healtCheckService.checkAllEndpoints();
    this.data.healthCheckResults = healtData;
    return this.render(this.data);
  }

  @Sse('stream')
  eventSource() {
    return interval(5000).pipe(
      switchMap(() => of(this.statusMonitoringService.getData())),
      map((data) => ({ data } as MessageEvent)),
    );
  }
}
