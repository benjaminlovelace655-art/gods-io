class Network {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.playerId = null;
    this.latency = 0;
    this.pingInterval = null;
  }

  connect(url, onOpen, onMessage, onClose) {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected = true;
      onOpen?.();
    };

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage?.(data);
      } catch {}
    };

    this.ws.onclose = () => {
      this.connected = false;
      onClose?.();
    };

    this.ws.onerror = () => {};
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  join(name) {
    this.send({ type: 'join', name });
  }

  sendInput(input) {
    this.send({ type: 'input', input });
  }

  attack(attackType, targetX, targetY) {
    this.send({ type: 'attack', attackType, targetX, targetY });
  }

  summon(companionType) {
    this.send({ type: 'summon', companionType });
  }

  chat(message) {
    this.send({ type: 'chat', message });
  }

  changePower(power) {
    this.send({ type: 'changePower', power });
  }

  disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.ws?.close();
  }
}

const net = new Network();
