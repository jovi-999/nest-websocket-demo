// WebSocket 的入口點

import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NinjasService } from '../ninjas/ninjas.service';
import { Inject, forwardRef } from '@nestjs/common';

// 定義 WebSocket 服務的入口，指定監聽端口和配置（如 CORS）
// @WebSocketGateway(81, { cors: { origin: '*' } }) // 監聽端口 81，允許跨域
@WebSocketGateway(81, { cors: { origin: '*' }, transports: ['websocket'] }) // 監聽端口 81，允許跨域 只使用 WebSocket
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() // 注入 socket.io 的 Server 實例，用於廣播訊息
  server: Server; // 定義 WebSocket 伺服器實例

  // 公開 connectedClients，讓其他服務可以存取
  public connectedClients: Map<string, Socket> = new Map();
  constructor(
    @Inject(forwardRef(() => NinjasService))
    private readonly ninjasService: NinjasService,
  ) {} // 注入 NinjasService

  // 客戶端連線時觸發
  handleConnection(client: Socket) {
    console.log(`Attempting connection for clientId 🆔: ${client.id}`);
    if (this.connectedClients.has(client.id)) {
      console.log(`Client ${client.id} already connected, skipping...`);
      return;
    }
    console.log(`Client connected, clientId 🆔: ${client.id}`);
    this.connectedClients.set(client.id, client); // 儲存連線的客戶端
    this.server.emit('message', `歡迎 👏🏻👏🏻, ${client.id}`);
    this.server.emit('sysMessage', `${client.id} 上線了，快來騷擾他🫢`);
    // 發送在線忍者資料
    this.server.emit('onlineNinjas', this.ninjasService.getOnlineNinjas());
  }

  // 客戶端斷線時觸發，用於清理或記錄。
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.server.emit('sysMessage', `${client.id} 下線了，別為難他了😢`);
    this.connectedClients.delete(client.id); // 移除斷線的客戶端
    // 發送更新後的在線忍者資料
    this.server.emit('onlineNinjas', this.ninjasService.getOnlineNinjas());
  }

  // 監聽客戶端發送的 'sendMessage' 事件，payload 是客戶端傳來的資料。
  @SubscribeMessage('sendMessage')
  handleMessage(client: Socket, payload: string): void {
    console.log(`Message from ${client.id}: ${payload}`);
    // 廣播訊息給所有連線的客戶端
    this.server.emit('message', `${client.id} says: ${payload}`);
  }

  // 新增方法：處理忍者創建
  @SubscribeMessage('createNinja')
  handleCreateNinja(
    client: Socket,
    payload: { name: string; age: number },
  ): void {
    console.log(`Creating ninja for client ${client.id}:`, payload);
    // 在這裡可以將客戶端 ID 和忍者資料關聯起來
    // 例如，可以將客戶端 ID 存儲在忍者資料中
    const ninjaData = {
      ...payload,
      clientId: client.id,
    };
    // 發送忍者創建事件
    this.server.emit('ninjaCreated', ninjaData);
    // 更新在線忍者列表
    this.server.emit('onlineNinjas', this.ninjasService.getOnlineNinjas());
  }

  // 接收前端的 'getAllClientIds' 事件
  @SubscribeMessage('getAllClientIds')
  getAllClientIds(client: Socket): void {
    const ids = Array.from(this.connectedClients.keys());
    client.emit('clientIds', ids); // 發送給請求的客戶端
    console.log(
      `Client ${client.id} ，取得所有連線的客戶端🆔: ${ids.join(', ')}`,
    );
  }

  // 新增方法：發送訊息給特定 ID 的客戶端
  @SubscribeMessage('sendToSpecificId')
  sendToSpecificId(
    client: Socket,
    payload: { targetId: string; message: string },
  ) {
    const { targetId, message } = payload;
    console.log(`傳訊息給特定人 ${targetId}: ${message}`);
    const targetClient = this.connectedClients.get(targetId);
    if (targetClient) {
      targetClient.emit(
        'privateMessage',
        ` ${client.id} 私訊你 💌  ${message}`,
      );
    } else {
      client.emit('errorMessage', `Client with ID ${targetId} not found.`);
    }
  }

  @SubscribeMessage('getMyData')
  async handleGetMyData(client: Socket, payload: { clientId: string }) {
    const data = await this.ninjasService.getSingleUserData(payload.clientId);
    client.emit('myData', data);
  }
}
