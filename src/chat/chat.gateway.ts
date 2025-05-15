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

import { LoggerService } from '../logger/service'; // 引入 LoggerService，記錄錯誤日誌

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

  private ipConnections: Map<string, number> = new Map();
  private ipTimeoutMap: Map<string, NodeJS.Timeout> = new Map(); // 儲存 IP 對應的計時器

  constructor(
    @Inject(forwardRef(() => NinjasService))
    private readonly ninjasService: NinjasService,
    private readonly logger: LoggerService,
  ) {}

  // 統一 IP 地址格式
  private normalizeIp(ip: string): string {
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      return '127.0.0.1'; // 統一為 IPv4 格式
    }
    return ip;
  }

  // 新增方法：模擬斷開所有連線
  @SubscribeMessage('simulateDisconnect')
  handleSimulateDisconnect(client: Socket): void {
    console.log('Simulating server disconnect for all clients');
    this.server.emit('sysMessage', '伺服器即將斷開所有連線');
    // 斷開所有連線
    this.server.sockets.sockets.forEach((socket) => {
      socket.emit('errorMessage', '伺服器模擬斷線');
      socket.disconnect(true);
    });
  }

  // client端（例如瀏覽器分頁）建立 WebSocket 連線時觸發，前端執行 const socket = io('http://localhost:81') 並成功連線時，自動觸發(Socket.IO 的內建行為)
  async handleConnection(client: Socket) {
    const rawIp = client.handshake.address;
    const ip = this.normalizeIp(rawIp);
    const count = this.ipConnections.get(ip) || 0;
    const limitCount = 3;

    if (count > limitCount) {
      // 先發送錯誤消息
      client.emit('errorMessage', '8️⃣8️⃣6️⃣ 連線數超過限制');

      // TODO(目前測不出來): 這裡開啟畫面會一直 reload，暫時先註解掉，不記錄錯誤
      // try {
      //   this.logger.error('連線數超過限制', {
      //     clientId: client.id,
      //     ip: ip,
      //     connectionCount: count + 1,
      //   });
      // } catch (err) {
      //   // 這裡至少要記錄到 console，避免錯誤被吞掉
      //   console.error('Logger error:', err);
      // }

      // 立即斷開連線
      client.disconnect(true);
      return;
    }

    const time = 1000 * 60 * 10; // 10 分鐘(1000 毫秒 × 60 秒 × 10 分鐘 = 600,000 毫秒)
    // 設置 ? 後自動斷開連線
    const timeout = setTimeout(() => {
      console.log(`連線超時，自動斷開 client from IP: ${client.id} due to timeout`);
      client.emit('errorMessage', '連線超時，自動斷開');
      client.disconnect(true);
    }, time);

    this.ipTimeoutMap.set(client.id, timeout); // 儲存計時器
    this.ipConnections.set(ip, count + 1);
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
    const rawIp = client.handshake.address;
    const ip = this.normalizeIp(rawIp); // 統一 IP 格式
    // const ip = client.handshake.address;
    const count = this.ipConnections.get(ip) || 0;
    this.ipConnections.set(ip, Math.max(0, count - 1));

    // 清理計時器
    const timeout = this.ipTimeoutMap.get(client.id);
    if (timeout) {
      clearTimeout(timeout);
      this.ipTimeoutMap.delete(client.id);
      console.log(`清理計時器: ${client.id}`);
    }

    // 從所有使用者的 socket 集合中移除此連線
    let removedCustomId: string | null = null;
    for (const [customId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client)) {
        sockets.delete(client);
        if (sockets.size === 0) {
          this.userSockets.delete(customId);
          removedCustomId = customId;
        }
        break;
      }
    }

    this.connectedClients.delete(client.id);
    this.broadcastOnlineUsers();

    // 如果該使用者已無連線，廣播下線通知
    if (removedCustomId) {
      this.server.emit('sysMessage', `${removedCustomId} 下線了`);
    }
  }

  // 處理前端發送的 'sendPrivateMessage' 事件，用來發送私訊給特定使用者
  @SubscribeMessage('sendPrivateMessage')
  handlePrivateMessage(
    client: Socket,
    payload: { targetUserId: string; message: string; fromUserId: string },
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
      client.emit('errorMessage', `User ${targetUserId} 不在線上.`);
      void this.logger.error(`User ${targetUserId} 不在線上.`, {
        clientId: client.id,
        targetUserId,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 廣播在線使用者列表 (內部輔助函數，被其他方法呼叫)
  private broadcastOnlineUsers(): void {
    const onlineUsers = Array.from(this.userSockets.entries()).map(([customId, sockets]) => ({
      customId,
      connectionCount: sockets.size, // 確保使用當前連線數
    }));
    console.log('Broadcasting online users:', onlineUsers); // 添加日誌
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
      client.emit('errorMessage', `找不到 targetId ${targetId}.`);
      void this.logger.error(`找不到 targetId ${targetId}`, {
        clientId: client.id,
        targetId,
        message,
        timestamp: new Date().toISOString(),
      });
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
