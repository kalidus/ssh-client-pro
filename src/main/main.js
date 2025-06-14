const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const { SSHManager } = require('./ssh-manager');
const { ConnectionManager } = require('./connection-manager');

class SSHClientApp {
  constructor() {
    this.mainWindow = null;
    this.sshManager = null;
    this.connectionManager = null;
    this.isDev = process.argv.includes('--dev');
    
    // Inicializar managers con manejo de errores
    try {
      this.sshManager = new SSHManager();
      console.log('SSHManager inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando SSHManager:', error);
    }
    
    try {
      this.connectionManager = new ConnectionManager();
      console.log('ConnectionManager inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando ConnectionManager:', error);
    }
  }

  async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      icon: path.join(__dirname, '../assets/icon.png')
    });

    // Configurar IPC ANTES de cargar el HTML
    this.setupIPC();
    
    await this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Hacer la ventana principal accesible globalmente para el SSH Manager
    global.mainWindow = this.mainWindow;

    if (this.isDev) {
      this.mainWindow.webContents.openDevTools();
    }

    this.setupMenu();
    
    console.log('Ventana creada y configurada correctamente');
  }

  setupMenu() {
    const template = [
      {
        label: 'Archivo',
        submenu: [
          {
            label: 'Nueva Conexión',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.mainWindow.webContents.send('menu-new-connection')
          },
          {
            label: 'Importar Conexiones',
            click: () => this.importConnections()
          },
          {
            label: 'Exportar Conexiones',
            click: () => this.exportConnections()
          },
          { type: 'separator' },
          { role: 'quit', label: 'Salir' }
        ]
      },
      {
        label: 'Editar',
        submenu: [
          { role: 'undo', label: 'Deshacer' },
          { role: 'redo', label: 'Rehacer' },
          { type: 'separator' },
          { role: 'cut', label: 'Cortar' },
          { role: 'copy', label: 'Copiar' },
          { role: 'paste', label: 'Pegar' }
        ]
      },
      {
        label: 'Ver',
        submenu: [
          { role: 'reload', label: 'Recargar' },
          { role: 'forceReload', label: 'Forzar Recarga' },
          { role: 'toggleDevTools', label: 'Herramientas de Desarrollo' },
          { type: 'separator' },
          { role: 'resetZoom', label: 'Zoom Normal' },
          { role: 'zoomIn', label: 'Acercar' },
          { role: 'zoomOut', label: 'Alejar' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Pantalla Completa' }
        ]
      },
      {
      label: 'Terminal',
      submenu: [
      {
      label: 'Nueva Pestaña',
      accelerator: 'CmdOrCtrl+T',
      click: () => this.mainWindow.webContents.send('menu-new-tab')
      },
      {
      label: 'Cerrar Pestaña',
      accelerator: 'CmdOrCtrl+W',
      click: () => this.mainWindow.webContents.send('menu-close-tab')
      },
      {
      label: 'Limpiar Terminal',
      accelerator: 'CmdOrCtrl+K',
      click: () => this.mainWindow.webContents.send('menu-clear-terminal')
      },
        { type: 'separator' },
          {
              label: 'Configuraciones',
              accelerator: 'CmdOrCtrl+,',
              click: () => this.mainWindow.webContents.send('menu-settings')
            }
          ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIPC() {
    console.log('Configurando handlers IPC...');
    
    // Verificar que los managers estén disponibles
    if (!this.connectionManager) {
      console.error('ConnectionManager no está disponible');
      return;
    }
    
    if (!this.sshManager) {
      console.error('SSHManager no está disponible');
      return;
    }
    
    // Gestión de conexiones
    ipcMain.handle('connection-save', async (event, connection) => {
      console.log('Handler connection-save llamado');
      try {
        return await this.connectionManager.saveConnection(connection);
      } catch (error) {
        console.error('Error en connection-save:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('connection-delete', async (event, id) => {
      console.log('Handler connection-delete llamado');
      try {
        return await this.connectionManager.deleteConnection(id);
      } catch (error) {
        console.error('Error en connection-delete:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('connection-get-all', async () => {
      console.log('Handler connection-get-all llamado');
      try {
        return await this.connectionManager.getAllConnections();
      } catch (error) {
        console.error('Error en connection-get-all:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('connection-update-tree', async (event, treeData) => {
      return await this.connectionManager.updateTreeStructure(treeData);
    });

    ipcMain.handle('connection-create-folder', async (event, folderData) => {
      return await this.connectionManager.createFolder(folderData);
    });

    ipcMain.handle('connection-delete-folder', async (event, folderId) => {
      return await this.connectionManager.deleteFolder(folderId);
    });

    ipcMain.handle('items-update', async (event, items) => {
      return await this.connectionManager.updateItems(items);
    });

    // Gestión SSH
    ipcMain.handle('ssh-connect', async (event, connectionId, config) => {
      return await this.sshManager.connect(connectionId, config);
    });

    ipcMain.handle('ssh-disconnect', async (event, connectionId) => {
      return await this.sshManager.disconnect(connectionId);
    });

    ipcMain.handle('ssh-send-data', async (event, connectionId, data) => {
      return await this.sshManager.sendData(connectionId, data);
    });

    ipcMain.handle('ssh-resize', async (event, connectionId, cols, rows) => {
      return await this.sshManager.resize(connectionId, cols, rows);
    });

    // Eventos de ventana
    this.mainWindow.on('closed', () => {
      this.sshManager.disconnectAll();
      this.mainWindow = null;
      global.mainWindow = null;
    });
  }

  async importConnections() {
    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'JSON Files', extensions: ['json'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      try {
        await this.connectionManager.importConnections(result.filePaths[0]);
        this.mainWindow.webContents.send('connections-imported');
      } catch (error) {
        dialog.showErrorBox('Error', 'No se pudieron importar las conexiones');
      }
    }
  }

  async exportConnections() {
    const result = await dialog.showSaveDialog(this.mainWindow, {
      filters: [
        { name: 'JSON Files', extensions: ['json'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      try {
        await this.connectionManager.exportConnections(result.filePath);
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'Éxito',
          message: 'Conexiones exportadas correctamente'
        });
      } catch (error) {
        dialog.showErrorBox('Error', 'No se pudieron exportar las conexiones');
      }
    }
  }
}

const sshApp = new SSHClientApp();

app.whenReady().then(() => {
  sshApp.createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      sshApp.createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  sshApp.sshManager.disconnectAll();
});