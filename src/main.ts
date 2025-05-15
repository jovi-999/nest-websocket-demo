import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io'; // 整合 Socket.IO 庫，啟用 WebSocket 功能

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

  // 動態配置 origin
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://127.0.0.1:5500', 'https://dev.salary2020.tw:50401'];

  // 啟用 CORS
  app.enableCors({
    origin: allowedOrigins, // 允許的前端來源
    methods: ['GET', 'POST'],
    credentials: true,
  });

  // 使用 Socket.IO
  app.useWebSocketAdapter(new IoAdapter(app));

  // 啟動 HTTP 服務，後端運行在 3000 端口，等待來自客戶端的請求（前端發起的 HTTP 或 WebSocket 請求）
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`App is running on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1); // 當發生錯誤時，退出進程，0 表示成功退出（通常用於正常關閉）。1 表示異常退出（通常用於錯誤或異常情況）。
});
