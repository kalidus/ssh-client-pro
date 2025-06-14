// Aplicación principal SSH Client Pro
class SSHClientApp {
  constructor() {
    this.isInitialized = false;
    this.settings = {
      theme: 'auto',
      fontSize: 15,
      fontFamily: 'JetBrains Mono',
      autoConnect: false,
      keepAlive: true
    };
  }

  async init() {
    if (this.isInitialized) return;

    try {
      // Mostrar loading inicial
      Utils.showLoading('Inicializando aplicación...');

      // Cargar configuraciones
      await this.loadSettings();
      // Aplicar tema seleccionado (claro, oscuro o auto)
      this.applyTheme(this.settings.theme);

      // Inicializar componentes principales
      await this.initializeComponents();

      // Configurar eventos globales
      this.setupGlobalEvents();

      // Configurar interfaz inicial
      this.setupInitialUI();

      // Cargar estado anterior si existe
      await this.restoreAppState();

      this.isInitialized = true;
      
      Utils.hideLoading();
      console.log('SSH Client Pro inicializado correctamente');

    } catch (error) {
      console.error('Error inicializando aplicación:', error);
      Utils.hideLoading();
      Utils.showNotification('Error inicializando aplicación', 'error');
    }
  }

  async loadSettings() {
    // Las configuraciones ahora las maneja SettingsManager
    if (window.settingsManager) {
      // Sincronizar configuraciones con settings manager
      // Clonar todas las settings actuales para no perder ninguna clave (p.ej. primaryColor)
      this.settings = { ...window.settingsManager.currentSettings };
    } else {
      // Fallback si SettingsManager no está disponible aún
      const savedSettings = Utils.loadFromStorage('appSettings', {});
      this.settings = { ...this.settings, ...savedSettings };
    }
  }

  async initializeComponents() {
    // Los componentes ya se inicializan automáticamente
    // Aquí podemos hacer configuraciones adicionales

    // Verificar que todos los componentes estén disponibles
    const components = [
      'connectionTree',
      'tabManager', 
      'terminalManager',
      'connectionModal',
      'folderModal',
      'settingsManager'
    ];

    for (const component of components) {
      if (!window[component]) {
        throw new Error(`Componente ${component} no disponible`);
      }
    }
    
    // Configurar terminal manager con configuraciones guardadas
    if (window.terminalManager && window.settingsManager) {
      const fontConfig = window.settingsManager.getCurrentFontConfig();
      const terminalTheme = window.settingsManager.getCurrentTerminalTheme();
      
      window.terminalManager.updateTerminalConfigs({
        fontSize: fontConfig.fontSize,
        fontFamily: fontConfig.fontFamily,
        lineHeight: fontConfig.lineHeight
      });
      
      window.terminalManager.setTheme(terminalTheme);
    }
  }

  setupGlobalEvents() {
    // Eventos de redimensionamiento de ventana
    window.addEventListener('resize', Utils.debounce(() => {
      if (window.terminalManager) {
        window.terminalManager.resizeAllTerminals();
      }
    }, 250));

    // Eventos de visibilidad de la página
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // La página se volvió visible, refrescar conexiones
        this.refreshConnectionStatus();
      }
    });

    // Eventos de enfoque de la ventana
    window.addEventListener('focus', () => {
      this.refreshConnectionStatus();
    });

    // Eventos antes de cerrar la ventana
    window.addEventListener('beforeunload', (e) => {
      this.saveAppState();
    });

    // Eventos de teclado globales (ya manejados en Utils)
    // Eventos personalizados de la aplicación
    this.setupCustomEvents();
  }

  setupCustomEvents() {
    // Eventos de pantalla de bienvenida
    document.getElementById('btn-welcome-new-connection')?.addEventListener('click', () => {
      window.connectionModal.show();
    });

    document.getElementById('btn-welcome-import')?.addEventListener('click', () => {
      // Trigger import desde el menú principal
      // El import se maneja en el proceso principal
      Utils.showNotification('Usa el menú Archivo > Importar Conexiones', 'info');
    });

    // Eventos de notificaciones
    document.addEventListener('connection-status-changed', (e) => {
      const { connectionId, status } = e.detail;
      this.handleConnectionStatusChange(connectionId, status);
    });
  }

  setupInitialUI() {
    // Configurar sidebar resizable
    this.setupResizableSidebar();

    // Configurar tema según preferencias del sistema
    this.setupThemeDetection();

    // Mostrar pantalla de bienvenida inicialmente
    const welcomeScreen = document.getElementById('welcome-screen');
    if (welcomeScreen) {
      welcomeScreen.style.display = 'flex';
    }

    // Configurar tooltips (si se implementa)
    this.setupTooltips();
  }

  setupResizableSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !mainContent) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    // Crear handle de redimensionamiento
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      width: 4px;
      height: 100%;
      cursor: ew-resize;
      background: transparent;
      z-index: 10;
    `;

    sidebar.style.position = 'relative';
    sidebar.appendChild(resizeHandle);

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = sidebar.offsetWidth;
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    });

    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const diff = e.clientX - startX;
      const newWidth = Math.max(250, Math.min(500, startWidth + diff));
      
      sidebar.style.width = `${newWidth}px`;
      
      // Redimensionar terminales después del resize
      Utils.debounce(() => {
        if (window.terminalManager) {
          window.terminalManager.resizeAllTerminals();
        }
      }, 100)();
    };

    const handleMouseUp = () => {
      isResizing = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Guardar ancho en settings
      this.settings.sidebarWidth = sidebar.offsetWidth;
      this.saveSettings();
    };

    // Restaurar ancho guardado
    if (this.settings.sidebarWidth) {
      sidebar.style.width = `${this.settings.sidebarWidth}px`;
    }
  }

  setupThemeDetection() {
    // Detectar cambios en el tema del sistema sólo cuando el usuario tenga "auto"
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = () => {
      if (this.settings.theme === 'auto') {
        this.applyTheme('auto');
      }
    };
    darkModeQuery.addEventListener('change', updateSystemTheme);
    // (no vuelvas a llamar applyTheme aquí; ya se llamó tras loadSettings)
  }

  setupTooltips() {
    // Implementación básica de tooltips
    const elementsWithTooltips = document.querySelectorAll('[title]');
    
    elementsWithTooltips.forEach(element => {
      const originalTitle = element.getAttribute('title');
      element.removeAttribute('title');
      
      let tooltip = null;
      
      element.addEventListener('mouseenter', () => {
        tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = originalTitle;
        tooltip.style.cssText = `
          position: absolute;
          background: var(--md-surface-container-highest);
          color: var(--md-on-surface);
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          box-shadow: var(--md-elevation-2);
          z-index: 10000;
          pointer-events: none;
          white-space: nowrap;
        `;
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${rect.bottom + 8}px`;
      });
      
      element.addEventListener('mouseleave', () => {
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }
      });
    });
  }

  applyTheme(theme) {
    const html = document.documentElement;
    
    switch (theme) {
      case 'dark':
        html.setAttribute('data-theme', 'dark');
        break;
      case 'light':
        html.setAttribute('data-theme', 'light');
        break;
      case 'auto':
      default:
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.setAttribute('data-theme', isDark ? 'dark' : 'light');
        break;
    }
    
    this.settings.theme = theme;
    // Reaplicar color primario si settingsManager está disponible; evita que los estilos por tema lo sobrescriban
    if (window.settingsManager) {
      const color = window.settingsManager.getSetting('primaryColor');
      window.settingsManager.applyPrimaryColor(color);
    }
  }

  saveSettings() {
    // Unir con las guardadas previamente para no descartar claves que esta instancia no maneja
    const prev = Utils.loadFromStorage('appSettings', {});
    Utils.saveToStorage('appSettings', { ...prev, ...this.settings });
  }

  async saveAppState() {
    // Guardar estado de pestañas
    if (window.tabManager) {
      window.tabManager.saveTabsState();
    }

    // Guardar configuraciones
    this.saveSettings();

    // Guardar estado de carpetas expandidas
    const expandedFolders = Array.from(window.connectionTree?.expandedFolders || []);
    Utils.saveToStorage('expandedFolders', expandedFolders);
  }

  async restoreAppState() {
    // Restaurar carpetas expandidas
    const expandedFolders = Utils.loadFromStorage('expandedFolders', []);
    if (window.connectionTree && expandedFolders.length > 0) {
      window.connectionTree.expandedFolders = new Set(expandedFolders);
    }

    // Restaurar estado de pestañas
    if (window.tabManager) {
      window.tabManager.restoreTabsState();
    }
  }

  handleConnectionStatusChange(connectionId, status) {
    // Actualizar UI basado en cambios de estado de conexión
    if (window.tabManager) {
      window.tabManager.updateConnectionStatus(connectionId, status);
    }

    if (window.connectionTree) {
      window.connectionTree.updateConnectionStatus(connectionId, status);
    }

    // Mostrar notificación para cambios importantes
    if (status === 'error') {
      Utils.showNotification('Conexión perdida', 'error', 3000);
    } else if (status === 'connected') {
      Utils.showNotification('Conectado', 'success', 2000);
    }
  }

  refreshConnectionStatus() {
    // Refrescar el estado de todas las conexiones
    if (window.terminalManager) {
      window.terminalManager.getAllTerminals().forEach(({ id, isConnected }) => {
        const status = isConnected ? 'connected' : 'disconnected';
        this.handleConnectionStatusChange(id, status);
      });
    }
  }

  // Métodos públicos para configuración
  setTheme(theme) {
    this.applyTheme(theme);
    this.saveSettings();
  }

  setFontSize(size) {
    this.settings.fontSize = size;
    if (window.terminalManager) {
      window.terminalManager.setFontSize(size);
    }
    this.saveSettings();
  }

  setFontFamily(family) {
    this.settings.fontFamily = family;
    if (window.terminalManager) {
      window.terminalManager.setFontFamily(family);
    }
    this.saveSettings();
  }

  // Métodos de utilidad
  getAppInfo() {
    return {
      version: '1.0.0',
      platform: window.electronAPI?.platform || 'unknown',
      theme: this.settings.theme,
      componentsLoaded: {
        connectionTree: !!window.connectionTree,
        tabManager: !!window.tabManager,
        terminalManager: !!window.terminalManager,
        connectionModal: !!window.connectionModal,
        folderModal: !!window.folderModal
      }
    };
  }

  getStats() {
    const stats = {
      connections: Object.keys(window.connectionTree?.connections || {}).length,
      folders: Object.keys(window.connectionTree?.folders || {}).length,
      activeTabs: window.tabManager?.tabs.size || 0,
      activeTerminals: window.terminalManager?.terminals.size || 0
    };

    if (window.tabManager) {
      const tabStats = window.tabManager.getTabStats();
      stats.connectedTerminals = tabStats.connected;
      stats.disconnectedTerminals = tabStats.disconnected;
    }

    return stats;
  }

  // Métodos para debugging
  debug() {
    console.log('SSH Client Pro Debug Info:');
    console.log('App Info:', this.getAppInfo());
    console.log('Stats:', this.getStats());
    console.log('Settings:', this.settings);
    
    if (window.connectionTree) {
      console.log('Connections:', window.connectionTree.connections);
      console.log('Folders:', window.connectionTree.folders);
    }
    
    if (window.terminalManager) {
      console.log('Terminals:', window.terminalManager.getAllTerminals());
    }
    
    if (window.tabManager) {
      console.log('Tabs:', window.tabManager.getAllTabs());
    }
  }

  // Método para reiniciar la aplicación
  async restart() {
    const confirmed = await Utils.confirm(
      'Se reiniciará la aplicación y se cerrarán todas las conexiones activas. ¿Continuar?',
      'Reiniciar Aplicación'
    );

    if (confirmed) {
      // Guardar estado actual
      await this.saveAppState();
      
      // Cerrar todas las conexiones
      if (window.terminalManager) {
        window.terminalManager.terminals.forEach((terminal, id) => {
          window.terminalManager.disconnectTerminal(id);
        });
      }
      
      // Recargar la página
      window.location.reload();
    }
  }

  // Método para limpiar datos de la aplicación
  async clearAllData() {
    const confirmed = await Utils.confirm(
      'Se eliminarán todas las conexiones, configuraciones y datos guardados. Esta acción no se puede deshacer. ¿Continuar?',
      'Limpiar Todos los Datos'
    );

    if (confirmed) {
      // Limpiar storage
      ['appSettings', 'tabsState', 'expandedFolders'].forEach(key => {
        localStorage.removeItem(key);
      });

      // Reiniciar aplicación
      await this.restart();
    }
  }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  // Crear instancia global de la aplicación
  window.sshApp = new SSHClientApp();
  
  // Inicializar aplicación
  await window.sshApp.init();
  
  // Hacer disponible en la consola para debugging
  window.debug = () => window.sshApp.debug();
});

// Manejar errores no capturados
window.addEventListener('error', (event) => {
  console.error('Error no capturado:', event.error);
  Utils.showNotification('Ha ocurrido un error inesperado', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rechazada no manejada:', event.reason);
  Utils.showNotification('Error de conexión', 'error');
});

// Exportar para uso en otros scripts
window.SSHClientApp = SSHClientApp;