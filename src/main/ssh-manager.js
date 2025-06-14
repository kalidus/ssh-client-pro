const { Client } = require('ssh2');
const { EventEmitter } = require('events');

class SSHConnection extends EventEmitter {
  constructor(id, config) {
    super();
    this.id = id;
    this.config = config;
    this.sshClient = new Client();
    this.shell = null;
    this.isConnected = false;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.sshClient.on('ready', () => {
      console.log(`SSH conexión lista para: ${this.config.host}`);
      this.requestShell();
    });

    this.sshClient.on('error', (err) => {
      console.error(`Error SSH para ${this.config.host}:`, err);
      this.emit('error', err);
    });

    this.sshClient.on('close', () => {
      console.log(`SSH conexión cerrada para: ${this.config.host}`);
      this.isConnected = false;
      this.emit('close');
    });
  }

  requestShell() {
    this.sshClient.shell((err, stream) => {
      if (err) {
        this.emit('error', err);
        return;
      }

      this.shell = stream;
      this.isConnected = true;
      // Configurar tipo de terminal
      this.shell.write('export TERM=xterm-256color\n');
      

      
      this.shell.on('data', (data) => {
        this.emit('data', data.toString());
      });

      this.shell.on('close', () => {
        this.isConnected = false;
        this.emit('close');
      });

      this.shell.stderr.on('data', (data) => {
        this.emit('data', data.toString());
      });

      this.emit('ready');
    });
  }

  connect() {
    const connectionConfig = {
      host: this.config.host,
      port: this.config.port || 22,
      username: this.config.username,
      readyTimeout: 20000,
      keepaliveInterval: 10000,
      algorithms: {
        kex: ['diffie-hellman-group-exchange-sha256', 'diffie-hellman-group14-sha256'],
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
        hmac: ['hmac-sha2-256', 'hmac-sha2-512'],
        compress: ['none']
      }
    };

    // Configurar autenticación
    if (this.config.password) {
      connectionConfig.password = this.config.password;
    } else if (this.config.privateKey) {
      connectionConfig.privateKey = this.config.privateKey;
      if (this.config.passphrase) {
        connectionConfig.passphrase = this.config.passphrase;
      }
    }

    this.sshClient.connect(connectionConfig);
  }

  sendData(data) {
    if (this.shell && this.isConnected) {
      this.shell.write(data);
    }
  }

  resize(cols, rows) {
    if (this.shell && this.isConnected) {
      this.shell.setWindow(rows, cols);
    }
  }

  disconnect() {
    if (this.shell) {
      this.shell.end();
    }
    if (this.sshClient) {
      this.sshClient.end();
    }
    this.isConnected = false;
  }
}

class SSHManager {
  constructor() {
    this.connections = new Map();
  }

  async connect(connectionId, config) {
    if (this.connections.has(connectionId)) {
      throw new Error('Ya existe una conexión con este ID');
    }

    const connection = new SSHConnection(connectionId, config);
    this.connections.set(connectionId, connection);

    return new Promise((resolve, reject) => {
      connection.on('ready', () => {
        resolve({ success: true, connectionId });
      });

      connection.on('error', (error) => {
        this.connections.delete(connectionId);
        reject(error);
      });

      connection.on('data', (data) => {
        // Enviar datos al renderer
        if (global.mainWindow) {
          global.mainWindow.webContents.send('ssh-data', connectionId, data);
        }
      });

      connection.on('close', () => {
        this.connections.delete(connectionId);
        if (global.mainWindow) {
          global.mainWindow.webContents.send('ssh-closed', connectionId);
        }
      });

      connection.connect();

      // Timeout de conexión
      setTimeout(() => {
        if (!connection.isConnected) {
          connection.disconnect();
          this.connections.delete(connectionId);
          reject(new Error('Timeout de conexión'));
        }
      }, 30000);
    });
  }

  async disconnect(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.disconnect();
      this.connections.delete(connectionId);
      return { success: true };
    }
    return { success: false, error: 'Conexión no encontrada' };
  }

  async sendData(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.isConnected) {
      connection.sendData(data);
      return { success: true };
    }
    return { success: false, error: 'Conexión no encontrada o no conectada' };
  }

  async resize(connectionId, cols, rows) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.isConnected) {
      connection.resize(cols, rows);
      return { success: true };
    }
    return { success: false, error: 'Conexión no encontrada o no conectada' };
  }

  disconnectAll() {
    for (const [connectionId, connection] of this.connections) {
      connection.disconnect();
    }
    this.connections.clear();
  }

  getConnectionStatus(connectionId) {
    const connection = this.connections.get(connectionId);
    return connection ? connection.isConnected : false;
  }

  getAllConnections() {
    const status = {};
    for (const [connectionId, connection] of this.connections) {
      status[connectionId] = {
        isConnected: connection.isConnected,
        host: connection.config.host,
        username: connection.config.username
      };
    }
    return status;
  }
}

module.exports = { SSHManager, SSHConnection };