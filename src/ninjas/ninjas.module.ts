import { Module, forwardRef } from '@nestjs/common';
import { NinjasService } from './ninjas.service';
import { NinjasController } from './ninjas.controller';
// import { ChatGateway } from 'src/chat/chat.gateway'; //將 ChatGateway 加入模組，讓它可以被注入到 NinjasService 中。
import { ChatModule } from '../chat/chat.module'; // 引入 ChatModule

@Module({
  imports: [
    forwardRef(() => ChatModule), // 處理可能的循環依賴
  ],
  controllers: [NinjasController],
  providers: [NinjasService],
  exports: [NinjasService], // 將 NinjasService 匯出，讓其他模組可以使用
})
export class NinjasModule {}
