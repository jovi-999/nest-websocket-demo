import { Injectable, Inject, forwardRef } from '@nestjs/common';
// import { CreateNinjaDto } from './dto/create-ninja.dto';
// import { UpdateNinjaDto } from './dto/update-ninja.dto';
import { ChatGateway } from 'src/chat/chat.gateway';
import { CreatePrivateMessageDto } from './dto/create-private-message.dto';

// Define a type for the fetched data
interface Post {
  userId: number;
  id: number;
  title: string;
  body: string;
}

@Injectable()
export class NinjasService {
  // 私有陣列，用來儲存所有忍者資料
  // private readonly ninjas: CreateNinjaDto[] = [];

  constructor(
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {} // 注入 ChatGateway

  // 獲取在線上的忍者資料
  getOnlineNinjas() {
    const onlineClientIds = Array.from(
      this.chatGateway['connectedClients'].keys(),
    );
    console.log('在線客戶端 ID:', onlineClientIds);

    return onlineClientIds.map((clientId) => ({
      id: clientId,
      name: clientId,
    }));
  }

  createPrivateMessage(createPrivateMessageDto: CreatePrivateMessageDto) {
    return this.chatGateway.server.emit(
      'privateMessage',
      `這是私訊 ${createPrivateMessageDto.message}`,
    );
  }

  // 取得 API 資料給特定 id
  async getSingleUserData(clientId: string): Promise<Post[]> {
    const data: Post[] = await fetch(
      'https://jsonplaceholder.typicode.com/posts',
    ).then((res) => res.json() as Promise<Post[]>);
    const targetClient = this.chatGateway['connectedClients'].get(clientId);
    if (targetClient) {
      targetClient.emit('myData', data);
    }
    return data;
  }
}
