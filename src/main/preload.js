const { contextBridge, ipcRenderer } = require('electron');

// API segura para el renderer
const electronAPI = {
  // Gestión de conexiones
  connections: {
    save: (connection) => ipcRenderer.invoke('connection-save', connection),
    delete: (id) => ipcRenderer.invoke('connection-delete', id),
    getAll: () => ipcRenderer.invoke('connection-get-all'),
    updateTree: (treeData) => ipcRenderer.invoke('connection-update-tree', treeData),
    createFolder: (folderData) => ipcRenderer.invoke('connection-create-folder', folderData),
    saveFolder: (folderData) => ipcRenderer.invoke('folder-save', folderData),
    deleteFolder: (folderId) => ipcRenderer.invoke('connection-delete-folder', folderId),
    updateItems: (items) => ipcRenderer.invoke('items-update', items)
  },

  // Gestión SSH
  ssh: {
    connect: (connectionId, config) => ipcRenderer.invoke('ssh-connect', connectionId, config),
    disconnect: (connectionId) => ipcRenderer.invoke('ssh-disconnect', connectionId),
    sendData: (connectionId, data) => ipcRenderer.invoke('ssh-send-data', connectionId, data),
    resize: (connectionId, cols, rows) => ipcRenderer.invoke('ssh-resize', connectionId, cols, rows)
  },

  // Event listeners
  on: {
    sshData: (callback) => {
      ipcRenderer.on('ssh-data', (event, connectionId, data) => callback(connectionId, data));
    },
    sshClosed: (callback) => {
      ipcRenderer.on('ssh-closed', (event, connectionId) => callback(connectionId));
    },
    menuNewConnection: (callback) => {
      ipcRenderer.on('menu-new-connection', callback);
    },
    menuNewTab: (callback) => {
      ipcRenderer.on('menu-new-tab', callback);
    },
    menuCloseTab: (callback) => {
      ipcRenderer.on('menu-close-tab', callback);
    },
    menuClearTerminal: (callback) => {
      ipcRenderer.on('menu-clear-terminal', callback);
    },
    menuSettings: (callback) => {
      ipcRenderer.on('menu-settings', callback);
    },
    connectionsImported: (callback) => {
      ipcRenderer.on('connections-imported', callback);
    }
  },

  // Remover listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // Utilidades del sistema
  platform: process.platform,
  version: process.versions
};

// Exponer API al contexto del renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Configurar el entorno para Material Design
window.addEventListener('DOMContentLoaded', () => {
  // Configurar tema oscuro/claro basado en preferencias del sistema
  const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
  if (savedSettings.theme && savedSettings.theme !== 'auto') {
    // El usuario ha elegido explícitamente un tema; respétalo y no escuches cambios del sistema
    document.documentElement.setAttribute('data-theme', savedSettings.theme);
    return; // no registrar listener
  }

  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');  
  const updateTheme = (e) => {
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  };
  
  darkModeQuery.addEventListener('change', updateTheme);
  updateTheme(darkModeQuery);
});

// Prevenir drag & drop de archivos en la ventana principal
window.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
});