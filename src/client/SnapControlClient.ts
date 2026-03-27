export type JsonRpcRequest = {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: number | string;
};

export type JsonRpcResponse = {
  jsonrpc: '2.0';
  result?: any;
  error?: any;
  id: number | string;
};

export type JsonRpcNotification = {
  jsonrpc: '2.0';
  method: string;
  params: any;
};

export class SnapControlClient extends EventTarget {
  private socket: WebSocket | null = null;
  private nextId = 1;
  private pendingRequests = new Map<number | string, { resolve: (val: any) => void, reject: (err: any) => void }>();

  constructor(public baseUrl: string) {
    super();
  }

  public async connect(): Promise<void> {
    const wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/jsonrpc';
    this.socket = new WebSocket(wsUrl);

    return new Promise((resolve, reject) => {
      this.socket!.onopen = () => {
        this.dispatchEvent(new CustomEvent('connected'));
        resolve();
      };
      this.socket!.onerror = (err) => reject(err);
      this.socket!.onmessage = (msg) => this.handleMessage(msg);
      this.socket!.onclose = () => this.dispatchEvent(new CustomEvent('disconnected'));
    });
  }

  private handleMessage(ev: MessageEvent) {
    const data = JSON.parse(ev.data);
    if ('id' in data && data.id !== null) {
      // Response
      const res = data as JsonRpcResponse;
      const pending = this.pendingRequests.get(res.id);
      if (pending) {
        this.pendingRequests.delete(res.id);
        if (res.error) {
          pending.reject(res.error);
        } else {
          pending.resolve(res.result);
        }
      }
    } else {
      // Notification
      const note = data as JsonRpcNotification;
      this.dispatchEvent(new CustomEvent('notification', { detail: note }));
      this.dispatchEvent(new CustomEvent(note.method, { detail: note.params }));
    }
  }

  public async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }

    const id = this.nextId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.socket!.send(JSON.stringify(request));
    });
  }

  // Server Commands
  public async getStatus(): Promise<any> {
    return this.sendRequest('Server.GetStatus');
  }

  public async getRPCVersion(): Promise<any> {
    return this.sendRequest('Server.GetRPCVersion');
  }

  // Client Commands
  public async setClientVolume(id: string, percent: number, muted = false): Promise<any> {
    return this.sendRequest('Client.SetVolume', { id, volume: { percent, muted } });
  }

  public async setClientLatency(id: string, latency: number): Promise<any> {
    return this.sendRequest('Client.SetLatency', { id, latency });
  }

  public async setClientName(id: string, name: string): Promise<any> {
    return this.sendRequest('Client.SetName', { id, name });
  }

  public async deleteClient(id: string): Promise<any> {
    return this.sendRequest('Server.DeleteClient', { id });
  }

  // Group Commands
  public async setGroupMute(id: string, mute: boolean): Promise<any> {
    return this.sendRequest('Group.SetMute', { id, mute });
  }

  public async setGroupStream(id: string, stream_id: string): Promise<any> {
    return this.sendRequest('Group.SetStream', { id, stream_id });
  }

  public async setGroupClients(id: string, clients: string[]): Promise<any> {
    return this.sendRequest('Group.SetClients', { id, clients });
  }

  public async setGroupName(id: string, name: string): Promise<any> {
    return this.sendRequest('Group.SetName', { id, name });
  }

  // Stream Commands
  public async controlStream(id: string, command: string, params: any = {}): Promise<any> {
    return this.sendRequest('Stream.Control', { id, command, params });
  }

  public async setStreamProperty(id: string, property: string, value: any): Promise<any> {
    return this.sendRequest('Stream.SetProperty', { id, property, value });
  }

  public async addStream(streamUri: string): Promise<any> {
    return this.sendRequest('Stream.AddStream', { streamUri });
  }

  public async removeStream(id: string): Promise<any> {
    return this.sendRequest('Stream.RemoveStream', { id });
  }

  public disconnect() {
    this.socket?.close();
  }
}
