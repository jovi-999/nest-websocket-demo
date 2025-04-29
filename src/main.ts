import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import * as fs from 'fs/promises';
import * as path from 'path';

// 在應用啟動時創建 logs/ 目錄
async function ensureLogDirectory() {
  const logDir = path.join(__dirname, '..', 'logs');
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create logs directory:', err);
  }
}

async function bootstrap() {
  // 確保 logs 目錄存在
  await ensureLogDirectory();

  const app = await NestFactory.create(AppModule, {
    snapshot: true, // 啟用快照模式
  });
  await app.listen(process.env.PORT ?? 3000); // HTTP 服務監聽 3000 端口
  console.log('App is running on http://localhost:3000');
}

bootstrap();
