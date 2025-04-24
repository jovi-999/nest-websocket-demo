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

  // 儲存 socket 連線
  public connectedClients: Map<string, Socket> = new Map();
  // 儲存使用者和其所有的 socket 連線
  private userSockets: Map<string, Set<Socket>> = new Map();

  constructor(
    @Inject(forwardRef(() => NinjasService))
    private readonly ninjasService: NinjasService,
  ) {} // 注入 NinjasService

  // 戶端（例如瀏覽器分頁）建立 WebSocket 連線時觸發，前端執行 const socket = io('http://localhost:81') 並成功連線時，自動觸發(Socket.IO 的內建行為)
  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, client);
  }

  // 處理前端發送的 'userConnect' 事件，用來註冊使用者的自定義 ID（customId）// 客戶端連線時觸發
  @SubscribeMessage('userConnect')
  handleUserConnection(
    client: Socket,
    payload: { customId: string; clientId: string },
  ): void {
    const { customId, clientId } = payload;

    // 將 socket 加入到使用者的連線集合中
    if (!this.userSockets.has(customId)) {
      this.userSockets.set(customId, new Set());
    }
    const userSocketSet = this.userSockets.get(customId);
    if (userSocketSet) {
      userSocketSet.add(client);
    }

    // 回傳 'connectionConfirmed' 事件給該客戶端，確認連線成功
    client.emit('connectionConfirmed', {
      customId,
      clientId,
    });

    //  更新在線使用者列表
    this.broadcastOnlineUsers();
    // 廣播某人上線的通知
    this.broadcastUserGoingOnline(customId);
  }

  // 客戶端斷線時觸發(自動觸發，當客戶端關閉分頁、網路中斷或手動斷開連線時，Socket.IO 的內建行為)
  handleDisconnect(client: Socket) {
    // 從所有使用者的 socket 集合中移除此連線
    for (const [customId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client)) {
        sockets.delete(client);
        if (sockets.size === 0) {
          this.userSockets.delete(customId);
        }
        break;
      }
    }

    this.connectedClients.delete(client.id);
    this.broadcastOnlineUsers();
  }

  // 處理前端發送的 'sendPrivateMessage' 事件，用來發送私訊給特定使用者
  @SubscribeMessage('sendPrivateMessage')
  handlePrivateMessage(
    client: Socket,
    payload: { targetUserId: string; message: string; fromUserId: string }
  ): void {
    const { targetUserId, message, fromUserId } = payload;
    const targetSockets = this.userSockets.get(targetUserId);

    if (targetSockets && targetSockets.size > 0) {
      // 發送給目標使用者的所有連線
      targetSockets.forEach((socket) => {
        socket.emit('privateMessage', {
          from: fromUserId,
          message: message,
          timestamp: new Date(),
        });
      });
    } else {
      // 使用者不在線上
      client.emit('errorMessage', `User ${targetUserId} is not online.`);
    }
  }

  // 廣播在線使用者列表 (內部輔助函數，被其他方法呼叫)
  private broadcastOnlineUsers(): void {
    // 從 userSockets 取出所有 customId（在線使用者的 ID）
    const onlineUsers = Array.from(this.userSockets.keys()).map((customId) => ({
      customId,
      connectionCount: this.userSockets.get(customId)?.size || 0, // 使用者的連線數量(分頁數)
    }));
    this.server.emit('onlineUsers', onlineUsers);
  }

  // 廣播上線通知 (內部輔助函數，被其他方法呼叫)
  private broadcastUserGoingOnline(customId: string): void {
    this.server.emit('sysMessage', `${customId} 上線了`);
  }

  // 處理前端發送的 'sendMessage' 事件，用來廣播公開訊息
  @SubscribeMessage('sendMessage')
  handleMessage(client: Socket, payload: string): void {
    console.log(`Message from ${client.id}: ${payload}`);
    // 廣播訊息給所有連線的客戶端
    this.server.emit('message', `${client.id} says: ${payload}`);
  }

  // 處理前端發送的 'getAllClientIds' 事件，回傳所有連線的 clientId 列表
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

  // 處理前端發送的 'getMyData' 事件，取得資料並回傳給請求的客戶端
  @SubscribeMessage('getMyData')
  async handleGetMyData(client: Socket, payload: { clientId: string }) {
    const data = await this.ninjasService.getSingleUserData(payload.clientId);
    client.emit('myData', data);
  }

  // 新增方法：處理忍者創建
  // @SubscribeMessage('createNinja')
  // handleCreateNinja(
  //   client: Socket,
  //   payload: { name: string; age: number },
  // ): void {
  //   console.log(`Creating ninja for client ${client.id}:`, payload);
  //   // 在這裡可以將客戶端 ID 和忍者資料關聯起來
  //   // 例如，可以將客戶端 ID 存儲在忍者資料中
  //   const ninjaData = {
  //     ...payload,
  //     clientId: client.id,
  //   };
  //   // 發送忍者創建事件
  //   this.server.emit('ninjaCreated', ninjaData);
  //   // 更新在線忍者列表
  //   this.server.emit('onlineNinjas', this.ninjasService.getOnlineNinjas());
  // }
}
