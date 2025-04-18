import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { NinjasModule } from './ninjas/ninjas.module';

@Module({
  imports: [ChatModule, NinjasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
