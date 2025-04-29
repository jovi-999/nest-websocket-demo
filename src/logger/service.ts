// 定義錯誤日誌，供 全域使用
import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

// 使用 LoggerService
// 1. import { LoggerService } from '../logger/service'; // 在要使用的地方 import LoggerService
// 2. constructor 中注入 LoggerService
// constructor(
//  private readonly logger: LoggerService, // 注入 LoggerService
// ) {}
// 3. 要使用時，直接呼叫 logger.error() 方法
// this.logger.error('錯誤訊息', { '附加資訊' });

@Injectable()
export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'error',
      exitOnError: false, // 不因 logger 內部錯誤終止程式

      exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' }),
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' }),
      ],

      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          handleExceptions: true, // 捕捉異常，避免未處理例外
          datePattern: 'YYYY-MM-DD',
          zippedArchive: false,
          maxSize: '20m',
          maxFiles: '14d',
        }),
        new winston.transports.Console(),
      ],
    });
  }

  async error(message: string, meta?: any): Promise<void> {
    return new Promise((resolve) => {
      try {
        this.logger.error(message, meta, (err) => {
          if (err) {
            console.error('Failed to log error with winston:', err);
          }
          resolve(); // 無論是否發生錯誤，都解析 Promise
        });
      } catch (err) {
        console.error('Failed to log error with winston:', err);
        resolve(); // 同步錯誤也解析 Promise
      }
    });
  }
}
