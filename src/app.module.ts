import { Module, Global } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { NinjasModule } from './ninjas/ninjas.module';
import { LoggerService } from './logger/service'; // 引入 LoggerService，記錄錯誤日誌

// 加上 @Global() 裝飾器，讓 LoggerService 變成全域服務
@Global()
@Module({
  imports: [ChatModule, NinjasModule],
  controllers: [AppController],
  providers: [AppService, LoggerService],
})
export class AppModule {}
