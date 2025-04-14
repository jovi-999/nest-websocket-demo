import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: true, // 啟用快照模式
  });
  await app.listen(process.env.PORT ?? 3000); // HTTP 服務監聽 3000 端口
  console.log('App is running on http://localhost:3000');
}

bootstrap();
