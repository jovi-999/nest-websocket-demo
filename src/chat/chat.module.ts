// 聊天功能的模組
import { Module, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { NinjasModule } from '../ninjas/ninjas.module'; // 引入 NinjasModule
import { LoggerService } from 'src/logger/service';

@Module({
  imports: [
    forwardRef(() => NinjasModule), // 處理可能的循環依賴
  ],
  providers: [ChatGateway, LoggerService],
  exports: [ChatGateway],
})
export class ChatModule {}
