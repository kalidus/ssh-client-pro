// Gestor de terminales SSH con XTerm.js
class TerminalManager {
  constructor() {
    this.terminals = new Map();
    this.activeTerminal = null;
    this.terminalConfigs = {
      allowProposedApi: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff'
      },
      fontSize: 15,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", "Consolas", "DejaVu Sans Mono", "Ubuntu Mono", monospace',
      fontWeight: 'normal',
      fontWeightBold: 'bold',
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      allowTransparency: false,
      rightClickSelectsWord: true,
      fastScrollModifier: 'alt',
      macOptionIsMeta: true,
      scrollback: 10000,
      windowsMode: false
    };
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Escuchar datos SSH desde el proceso principal
    window.electronAPI.on.sshData((connectionId, data) => {
      const terminal = this.terminals.get(connectionId);
      if (terminal) {
        terminal.instance.write(data);
        this.updateTerminalActivity(connectionId);
      }
    });

    // Escuchar cierres de conexión
    window.electronAPI.on.sshClosed((connectionId) => {
      const terminal = this.terminals.get(connectionId);
      if (terminal) {
        this.showDisconnectedOverlay(connectionId);
        this.updateConnectionStatus(connectionId, 'disconnected');
      }
    });

    // Eventos de menú
    window.electronAPI.on.menuClearTerminal(() => {
      if (this.activeTerminal) {
        this.clearTerminal(this.activeTerminal);
      }
    });
  }

  async createTerminal(connectionId, connectionConfig) {
    if (this.terminals.has(connectionId)) {
      return this.terminals.get(connectionId);
    }

    // Crear contenedor del terminal
    const container = this.createTerminalContainer(connectionId, connectionConfig);
    
    // Configurar XTerm con allowProposedApi
    const terminal = new Terminal({
      ...this.terminalConfigs,
      allowProposedApi: true
    });
    
    // Cargar addons
    const fitAddon = new FitAddon.FitAddon();
    const webLinksAddon = new WebLinksAddon.WebLinksAddon();
    
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    
    // Cargar Unicode11Addon solo si está disponible
    let unicode11Addon = null;
    try {
      if (typeof Unicode11Addon !== 'undefined' && Unicode11Addon.Unicode11Addon) {
        unicode11Addon = new Unicode11Addon.Unicode11Addon();
        terminal.loadAddon(unicode11Addon);
        // Configurar Unicode solo si el addon se cargó correctamente
        if (terminal.unicode) {
          terminal.unicode.activeVersion = '11';
        }
      }
    } catch (error) {
      console.warn('Unicode11Addon no disponible, usando configuración básica:', error);
    }
    
    // Abrir terminal en el contenedor
    const terminalElement = container.querySelector('.terminal');
    terminal.open(terminalElement);
    
    // Ajustar tamaño
    fitAddon.fit();
    
    // Configurar eventos del terminal
    this.setupTerminalEvents(terminal, connectionId, fitAddon, container);
    
    const terminalObj = {
      instance: terminal,
      fitAddon,
      webLinksAddon,
      unicode11Addon: unicode11Addon || null,
      container,
      connectionConfig,
      isConnected: false,
      lastActivity: Date.now()
    };
    
    this.terminals.set(connectionId, terminalObj);
    
    return terminalObj;
  }

  createTerminalContainer(connectionId, config) {
    const container = document.createElement('div');
    container.className = 'terminal-container';
    container.dataset.connectionId = connectionId;
    container.innerHTML = `
      <div class="terminal-header">
        <div class="terminal-info">
          <span class="connection-status disconnected" id="status-${connectionId}">
            <span class="status-dot"></span>
            Desconectado
          </span>
          <span class="terminal-details">
            <span class="material-symbols-outlined">dns</span>
            ${config.username}@${config.host}:${config.port}
          </span>
        </div>
        <div class="terminal-actions">
          <button class="btn-icon" onclick="terminalManager.reconnect('${connectionId}')" title="Reconectar">
            <span class="material-symbols-outlined">refresh</span>
          </button>
          <button class="btn-icon" onclick="terminalManager.clearTerminal('${connectionId}')" title="Limpiar">
            <span class="material-symbols-outlined">clear_all</span>
          </button>
          <button class="btn-icon" onclick="terminalManager.copySelection('${connectionId}')" title="Copiar">
            <span class="material-symbols-outlined">content_copy</span>
          </button>
          <button class="btn-icon" onclick="terminalManager.pasteFromClipboard('${connectionId}')" title="Pegar">
            <span class="material-symbols-outlined">content_paste</span>
          </button>
        </div>
      </div>
      <div class="terminal-wrapper">
        <div class="terminal"></div>
        <div class="terminal-overlay hidden" id="overlay-${connectionId}">
          <div class="terminal-overlay-content">
            <span class="material-symbols-outlined">cloud_off</span>
            <h3>Desconectado</h3>
            <p>La conexión SSH se ha perdido</p>
            <button class="btn-primary" onclick="terminalManager.reconnect('${connectionId}')">
              <span class="material-symbols-outlined">refresh</span>
              Reconectar
            </button>
          </div>
        </div>
      </div>
    `;
    
    return container;
  }

  setupTerminalEvents(terminal, connectionId, fitAddon, container) {
    // Evento de datos del terminal (entrada del usuario)
    terminal.onData(data => {
      window.electronAPI.ssh.sendData(connectionId, data);
    });

    // Evento de redimensionamiento
    terminal.onResize(({ cols, rows }) => {
      window.electronAPI.ssh.resize(connectionId, cols, rows);
    });

    // Eventos de selección
    terminal.onSelectionChange(() => {
      const selection = terminal.getSelection();
      if (selection) {
        this.updateTerminalActivity(connectionId);
      }
    });

    // Redimensionar cuando cambie el tamaño del contenedor
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch (error) {
        console.warn('Error ajustando terminal:', error);
      }
    });

    const terminalObj = this.terminals.get(connectionId);
    if (terminalObj) {
      resizeObserver.observe(terminalObj.container);
    }

    // Eventos de teclado personalizados
    terminal.onKey(({ key, domEvent }) => {
      const { ctrlKey, metaKey, altKey, code } = domEvent;
      const isCtrlOrCmd = ctrlKey || metaKey;

      // Shortcuts del terminal
      if (isCtrlOrCmd) {
        switch (code) {
          case 'KeyC':
            if (terminal.hasSelection()) {
              domEvent.preventDefault();
              this.copySelection(connectionId);
            }
            break;
          case 'KeyV':
            domEvent.preventDefault();
            this.pasteFromClipboard(connectionId);
            break;
          case 'KeyA':
            domEvent.preventDefault();
            terminal.selectAll();
            break;
          case 'KeyF':
            domEvent.preventDefault();
            this.openSearchDialog(connectionId);
            break;
        }
      }
    });

    // Eventos de mouse - usar event listeners del DOM para el menú contextual
    // Usar timeout para asegurar que XTerm haya renderizado completamente
    setTimeout(() => {
      const xtermScreen = container.querySelector('.xterm-screen');
      const xtermViewport = container.querySelector('.xterm-viewport');
      const terminalContainer = container.querySelector('.terminal');
      
      // Intentar agregar al elemento más específico primero
      const targetElement = xtermScreen || xtermViewport || terminalContainer;
      
      if (targetElement) {
        targetElement.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          this.showContextMenu(connectionId, event);
        });
      }
    }, 100);
  }

  async connectTerminal(connectionId, config) {
    const terminal = this.terminals.get(connectionId);
    if (!terminal) return false;

    try {
      this.updateConnectionStatus(connectionId, 'connecting');
      this.hideDisconnectedOverlay(connectionId);
      
      // Mostrar mensaje de conexión
      terminal.instance.writeln('\x1b[36mConectando a ' + config.host + '...\x1b[0m');
      
      // Intentar conectar
      const result = await window.electronAPI.ssh.connect(connectionId, config);
      
      if (result.success) {
        terminal.isConnected = true;
        this.updateConnectionStatus(connectionId, 'connected');
        terminal.instance.writeln('\x1b[32m✓ Conectado exitosamente\x1b[0m');
        
        // Detectar shell y configurar prompt
        this.detectShell(connectionId);
        
        return true;
      } else {
        throw new Error(result.error || 'Error de conexión');
      }
    } catch (error) {
      console.error('Error conectando terminal:', error);
      terminal.isConnected = false;
      this.updateConnectionStatus(connectionId, 'error');
      terminal.instance.writeln(`\x1b[31m✗ Error: ${Utils.getSSHErrorMessage(error)}\x1b[0m`);
      this.showDisconnectedOverlay(connectionId);
      return false;
    }
  }

  async disconnectTerminal(connectionId) {
    const terminal = this.terminals.get(connectionId);
    if (!terminal) return;

    try {
      await window.electronAPI.ssh.disconnect(connectionId);
      terminal.isConnected = false;
      this.updateConnectionStatus(connectionId, 'disconnected');
      terminal.instance.writeln('\x1b[33mDesconectado\x1b[0m');
    } catch (error) {
      console.error('Error desconectando:', error);
    }
  }

  removeTerminal(connectionId) {
    const terminal = this.terminals.get(connectionId);
    if (!terminal) return;

    // Desconectar si está conectado
    if (terminal.isConnected) {
      this.disconnectTerminal(connectionId);
    }

    // Limpiar recursos
    terminal.instance.dispose();
    terminal.container.remove();
    
    this.terminals.delete(connectionId);
    
    if (this.activeTerminal === connectionId) {
      this.activeTerminal = null;
    }
  }

  showTerminal(connectionId) {
    // Ocultar todos los terminales
    this.terminals.forEach((terminal, id) => {
      terminal.container.style.display = id === connectionId ? 'flex' : 'none';
    });

    this.activeTerminal = connectionId;
    
    // Ajustar tamaño del terminal activo
    const terminal = this.terminals.get(connectionId);
    if (terminal) {
      setTimeout(() => {
        try {
          terminal.fitAddon.fit();
          terminal.instance.focus();
        } catch (error) {
          console.warn('Error ajustando terminal activo:', error);
        }
      }, 100);
    }
  }

  clearTerminal(connectionId) {
    const terminal = this.terminals.get(connectionId);
    if (terminal) {
      terminal.instance.clear();
      terminal.instance.reset();
    }
  }

  async copySelection(connectionId) {
    const terminal = this.terminals.get(connectionId);
    if (terminal && terminal.instance.hasSelection()) {
      const selection = terminal.instance.getSelection();
      await Utils.copyToClipboard(selection);
    }
  }

  async pasteFromClipboard(connectionId) {
    const terminal = this.terminals.get(connectionId);
    if (!terminal || !terminal.isConnected) return;

    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        // Procesar texto para terminales (convertir saltos de línea)
        const processedText = text.replace(/\r?\n/g, '\r');
        await window.electronAPI.ssh.sendData(connectionId, processedText);
      }
    } catch (error) {
      console.error('Error pegando desde portapapeles:', error);
      Utils.showNotification('Error accediendo al portapapeles', 'error');
    }
  }

  async reconnect(connectionId) {
    const terminal = this.terminals.get(connectionId);
    if (!terminal) return;

    await this.connectTerminal(connectionId, terminal.connectionConfig);
  }

  updateConnectionStatus(connectionId, status) {
    const statusElement = document.getElementById(`status-${connectionId}`);
    if (statusElement) {
      statusElement.className = `connection-status ${status}`;
      
      const statusTexts = {
        connected: 'Conectado',
        connecting: 'Conectando...',
        disconnected: 'Desconectado',
        error: 'Error'
      };
      
      const statusText = statusTexts[status] || 'Desconocido';
      statusElement.innerHTML = `
        <span class="status-dot ${status === 'connecting' ? 'pulse' : ''}"></span>
        ${statusText}
      `;
    }

    // Actualizar estado en el árbol de conexiones
    if (window.connectionTree) {
      window.connectionTree.updateConnectionStatus(connectionId, status);
    }
  }

  showDisconnectedOverlay(connectionId) {
    const overlay = document.getElementById(`overlay-${connectionId}`);
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  hideDisconnectedOverlay(connectionId) {
    const overlay = document.getElementById(`overlay-${connectionId}`);
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  updateTerminalActivity(connectionId) {
    const terminal = this.terminals.get(connectionId);
    if (terminal) {
      terminal.lastActivity = Date.now();
    }
  }

  detectShell(connectionId) {
    const terminal = this.terminals.get(connectionId);
    if (!terminal) return;

    // Se omitió la detección automática del shell para evitar el comando "echo $SHELL"
  }

  showContextMenu(connectionId, event) {
    event.preventDefault();
    
    const terminal = this.terminals.get(connectionId);
    if (!terminal) return;

    const hasSelection = terminal.instance.hasSelection();
    
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu show';
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;
    
    contextMenu.innerHTML = `
      <div class="context-menu-item ${!hasSelection ? 'disabled' : ''}" onclick="terminalManager.copySelection('${connectionId}')">
        <span class="material-symbols-outlined">content_copy</span>
        Copiar
      </div>
      <div class="context-menu-item" onclick="terminalManager.pasteFromClipboard('${connectionId}')">
        <span class="material-symbols-outlined">content_paste</span>
        Pegar
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" onclick="terminalManager.clearTerminal('${connectionId}')">
        <span class="material-symbols-outlined">clear_all</span>
        Limpiar Terminal
      </div>
      <div class="context-menu-item" onclick="terminalManager.openSearchDialog('${connectionId}')">
        <span class="material-symbols-outlined">search</span>
        Buscar
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" onclick="terminalManager.reconnect('${connectionId}')">
        <span class="material-symbols-outlined">refresh</span>
        Reconectar
      </div>
    `;
    
    document.body.appendChild(contextMenu);
    
    // Cerrar al hacer clic fuera
    const closeMenu = (e) => {
      if (!contextMenu.contains(e.target)) {
        contextMenu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }

  openSearchDialog(connectionId) {
    // TODO: Implementar diálogo de búsqueda en terminal
    Utils.showNotification('Función de búsqueda en desarrollo', 'info');
  }

  resizeAllTerminals() {
    this.terminals.forEach((terminal) => {
      if (terminal.fitAddon) {
        try {
          terminal.fitAddon.fit();
        } catch (error) {
          console.warn('Error redimensionando terminal:', error);
        }
      }
    });
  }

  getTerminalById(connectionId) {
    return this.terminals.get(connectionId);
  }

  getAllTerminals() {
    return Array.from(this.terminals.entries()).map(([id, terminal]) => ({
      id,
      config: terminal.connectionConfig,
      isConnected: terminal.isConnected,
      lastActivity: terminal.lastActivity
    }));
  }

  // Configuración de temas
  setTheme(theme) {
    // Actualizar configuraciones
    Object.assign(this.terminalConfigs.theme, theme);
    
    // Aplicar tema a todos los terminales existentes
    this.terminals.forEach((terminal) => {
      terminal.instance.options.theme = this.terminalConfigs.theme;
    });
  }

  // Actualizar configuraciones del terminal
  updateTerminalConfigs(newConfigs) {
    Object.assign(this.terminalConfigs, newConfigs);
    
    // Aplicar a todos los terminales existentes
    this.terminals.forEach((terminal) => {
      Object.assign(terminal.instance.options, newConfigs);
      
      // Redimensionar para aplicar cambios de fuente
      if (terminal.fitAddon) {
        try {
          terminal.fitAddon.fit();
        } catch (error) {
          console.warn('Error aplicando nueva configuración:', error);
        }
      }
    });
  }

  // Configuración de fuente
  setFontSize(size) {
    this.terminalConfigs.fontSize = size;
    
    this.terminals.forEach((terminal) => {
      terminal.instance.options.fontSize = size;
      terminal.fitAddon.fit();
    });
  }

  setFontFamily(family) {
    this.terminalConfigs.fontFamily = family;
    
    this.terminals.forEach((terminal) => {
      terminal.instance.options.fontFamily = family;
    });
  }
}

// Crear instancia global
const terminalManager = new TerminalManager();
window.terminalManager = terminalManager;