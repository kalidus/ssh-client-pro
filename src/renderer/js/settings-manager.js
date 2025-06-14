// Gestor de configuraciones de la aplicación
class SettingsManager {
  constructor() {
    this.modal = document.getElementById('settings-modal');
    this.isOpen = false;
    this.originalSettings = {};
    this.currentSettings = {};
    
    // Configuraciones por defecto
    this.defaultSettings = {
      // Terminal
      fontFamily: 'JetBrains Mono',
      fontSize: 15,
      lineHeight: 1.2,
      cursorStyle: 'block',
      cursorBlink: true,
      fontLigatures: true,
      
      // Apariencia
      theme: 'auto',
      terminalTheme: 'default',
      // Color primario de la interfaz
      primaryColor: '#6750A4',
      
      // Conexiones
      autoConnect: false,
      keepAlive: true,
      connectionTimeout: 30,
      keepaliveInterval: 10
    };
    
    // Temas de terminal disponibles
    this.terminalThemes = {
      default: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5'
      },
      monokai: {
        background: '#272822',
        foreground: '#f8f8f2',
        cursor: '#f8f8f0',
        black: '#272822',
        red: '#f92672',
        green: '#a6e22e',
        yellow: '#f4bf75',
        blue: '#66d9ef',
        magenta: '#ae81ff',
        cyan: '#a1efe4',
        white: '#f8f8f2'
      },
      'solarized-dark': {
        background: '#002b36',
        foreground: '#839496',
        cursor: '#93a1a1',
        black: '#073642',
        red: '#dc322f',
        green: '#859900',
        yellow: '#b58900',
        blue: '#268bd2',
        magenta: '#d33682',
        cyan: '#2aa198',
        white: '#eee8d5'
      },
      'solarized-light': {
        background: '#fdf6e3',
        foreground: '#657b83',
        cursor: '#586e75',
        black: '#073642',
        red: '#dc322f',
        green: '#859900',
        yellow: '#b58900',
        blue: '#268bd2',
        magenta: '#d33682',
        cyan: '#2aa198',
        white: '#eee8d5'
      },
      'tomorrow-night': {
        background: '#1d1f21',
        foreground: '#c5c8c6',
        cursor: '#c5c8c6',
        black: '#1d1f21',
        red: '#cc6666',
        green: '#b5bd68',
        yellow: '#f0c674',
        blue: '#81a2be',
        magenta: '#b294bb',
        cyan: '#8abeb7',
        white: '#c5c8c6'
      },
      dracula: {
        background: '#282a36',
        foreground: '#f8f8f2',
        cursor: '#f8f8f0',
        black: '#21222c',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#f8f8f2'
      }
    };
    
    this.init();
  // Si la aplicación principal ya está creada, sincronizar ajustes y aplicar tema para evitar discrepancias
  if (window.sshApp) {
    window.sshApp.settings = { ...this.currentSettings };
    window.sshApp.applyTheme(this.currentSettings.theme);
  }
  }

  // Aplica color primario y contenedor
  applyPrimaryColor(color) {
    const root = document.documentElement;
    root.style.setProperty('--md-primary', color);
    // Usar misma tonalidad con 15% opacidad para container
    if (/^#([0-9a-fA-F]{6})$/.test(color)) {
      root.style.setProperty('--md-primary-container', `${color}26`); // 0x26 ≈ 15% alpha
    }
  }

  init() {
    this.setupEventListeners();
    this.loadSettings();
    this.applyPrimaryColor(this.currentSettings.primaryColor);
    this.updatePreview();
  }

  setupEventListeners() {
    // Botón para abrir configuraciones
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.show();
    });

    // Botón para cerrar modal
    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.hide();
    });

    // Cerrar al hacer clic fuera del modal
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });

    // Botones de acción
    document.getElementById('btn-apply-settings')?.addEventListener('click', () => {
      this.applySettings();
    });

    document.getElementById('btn-reset-settings')?.addEventListener('click', () => {
      this.resetToDefaults();
    });

    // Event listeners para controles
    this.setupControlListeners();
    
    // Event listener para el menú
    window.electronAPI.on.menuSettings(() => {
      this.show();
    });
  }

  setupControlListeners() {
    // Fuente del terminal
    document.getElementById('setting-font-family')?.addEventListener('change', (e) => {
      this.currentSettings.fontFamily = e.target.value;
      this.updatePreview();
    });

    // Tamaño de fuente
    const fontSizeSlider = document.getElementById('setting-font-size');
    const fontSizeValue = document.getElementById('font-size-value');
    fontSizeSlider?.addEventListener('input', (e) => {
      this.currentSettings.fontSize = parseInt(e.target.value);
      fontSizeValue.textContent = `${e.target.value}px`;
      this.updatePreview();
    });

    // Altura de línea
    const lineHeightSlider = document.getElementById('setting-line-height');
    const lineHeightValue = document.getElementById('line-height-value');
    lineHeightSlider?.addEventListener('input', (e) => {
      this.currentSettings.lineHeight = parseFloat(e.target.value);
      lineHeightValue.textContent = e.target.value;
      this.updatePreview();
    });

    // Estilo del cursor
    document.getElementById('setting-cursor-style')?.addEventListener('change', (e) => {
      this.currentSettings.cursorStyle = e.target.value;
      this.updatePreview();
    });

    // Cursor parpadeante
    document.getElementById('setting-cursor-blink')?.addEventListener('change', (e) => {
      this.currentSettings.cursorBlink = e.target.checked;
      this.updatePreview();
    });

    // Ligaduras de fuente
    document.getElementById('setting-font-ligatures')?.addEventListener('change', (e) => {
      this.currentSettings.fontLigatures = e.target.checked;
      this.updatePreview();
    });

    // Tema general
    document.getElementById('setting-theme')?.addEventListener('change', (e) => {
      this.currentSettings.theme = e.target.value;
      this.updatePreview();
    });

    // Color primario
    const primaryColorInput = document.getElementById('setting-primary-color');
    primaryColorInput?.addEventListener('input', (e) => {
      this.currentSettings.primaryColor = e.target.value;
      this.applyPrimaryColor(e.target.value);
    });

    // Tema del terminal
    document.getElementById('setting-terminal-theme')?.addEventListener('change', (e) => {
      this.currentSettings.terminalTheme = e.target.value;
      this.updatePreview();
    });

    // Configuraciones de conexión
    document.getElementById('setting-auto-connect')?.addEventListener('change', (e) => {
      this.currentSettings.autoConnect = e.target.checked;
    });

    document.getElementById('setting-keep-alive')?.addEventListener('change', (e) => {
      this.currentSettings.keepAlive = e.target.checked;
    });

    // Timeout de conexión
    const timeoutSlider = document.getElementById('setting-connection-timeout');
    const timeoutValue = document.getElementById('timeout-value');
    timeoutSlider?.addEventListener('input', (e) => {
      this.currentSettings.connectionTimeout = parseInt(e.target.value);
      timeoutValue.textContent = `${e.target.value}s`;
    });

    // Intervalo keep-alive
    const keepaliveSlider = document.getElementById('setting-keepalive-interval');
    const keepaliveValue = document.getElementById('keepalive-value');
    keepaliveSlider?.addEventListener('input', (e) => {
      this.currentSettings.keepaliveInterval = parseInt(e.target.value);
      keepaliveValue.textContent = `${e.target.value}s`;
    });
  }

  show() {
    this.loadSettings();
    this.populateForm();
    this.updatePreview();
    this.modal.classList.add('show');
    this.isOpen = true;
  }

  hide() {
    this.modal.classList.remove('show');
    this.isOpen = false;
  }

  loadSettings() {
    // Cargar configuraciones guardadas o usar valores por defecto
    const savedSettings = Utils.loadFromStorage('appSettings', {});
    this.currentSettings = { ...this.defaultSettings, ...savedSettings };
    this.originalSettings = { ...this.currentSettings };
  }

  populateForm() {
    // Poblar el formulario con las configuraciones actuales
    document.getElementById('setting-font-family').value = this.currentSettings.fontFamily;
    document.getElementById('setting-font-size').value = this.currentSettings.fontSize;
    document.getElementById('font-size-value').textContent = `${this.currentSettings.fontSize}px`;
    
    document.getElementById('setting-line-height').value = this.currentSettings.lineHeight;
    document.getElementById('line-height-value').textContent = this.currentSettings.lineHeight;
    
    document.getElementById('setting-cursor-style').value = this.currentSettings.cursorStyle;
    document.getElementById('setting-cursor-blink').checked = this.currentSettings.cursorBlink;
    document.getElementById('setting-font-ligatures').checked = this.currentSettings.fontLigatures;
    
    document.getElementById('setting-theme').value = this.currentSettings.theme;
  document.getElementById('setting-primary-color').value = this.currentSettings.primaryColor;
    document.getElementById('setting-terminal-theme').value = this.currentSettings.terminalTheme;
    
    document.getElementById('setting-auto-connect').checked = this.currentSettings.autoConnect;
    document.getElementById('setting-keep-alive').checked = this.currentSettings.keepAlive;
    
    document.getElementById('setting-connection-timeout').value = this.currentSettings.connectionTimeout;
    document.getElementById('timeout-value').textContent = `${this.currentSettings.connectionTimeout}s`;
    
    document.getElementById('setting-keepalive-interval').value = this.currentSettings.keepaliveInterval;
    document.getElementById('keepalive-value').textContent = `${this.currentSettings.keepaliveInterval}s`;
  }

  updatePreview() {
    const preview = document.getElementById('terminal-preview');
    const terminalPreview = preview.closest('.terminal-preview');
    
    if (!preview || !terminalPreview) return;

    // Aplicar configuraciones de fuente y tema a la vista previa
    const fontStack = this.getFontStack(this.currentSettings.fontFamily);
    const theme = this.terminalThemes[this.currentSettings.terminalTheme] || this.terminalThemes.default;
    
    // Actualizar CSS custom properties para la vista previa
    preview.style.setProperty('--preview-font-family', fontStack);
    preview.style.setProperty('--preview-font-size', `${this.currentSettings.fontSize}px`);
    preview.style.setProperty('--preview-line-height', this.currentSettings.lineHeight);
    
    // Aplicar tema del terminal
    terminalPreview.style.setProperty('--terminal-bg', theme.background);
    terminalPreview.style.setProperty('--terminal-fg', theme.foreground);
    terminalPreview.style.setProperty('--terminal-cursor', theme.cursor);
    
    // Actualizar clase del tema
    terminalPreview.className = `terminal-preview theme-${this.currentSettings.terminalTheme}`;
    
    // Actualizar cursor en la vista previa
    const cursor = preview.querySelector('.preview-cursor');
    if (cursor) {
      cursor.style.animationPlayState = this.currentSettings.cursorBlink ? 'running' : 'paused';
      
      // Cambiar estilo del cursor
      switch (this.currentSettings.cursorStyle) {
        case 'block':
          cursor.style.display = 'inline-block';
          cursor.style.backgroundColor = theme.cursor;
          cursor.style.color = theme.background;
          cursor.style.width = '1ch';
          cursor.textContent = ' ';
          break;
        case 'underline':
          cursor.style.display = 'inline-block';
          cursor.style.backgroundColor = 'transparent';
          cursor.style.color = theme.cursor;
          cursor.style.borderBottom = `2px solid ${theme.cursor}`;
          cursor.style.width = '1ch';
          cursor.textContent = ' ';
          break;
        case 'bar':
          cursor.style.display = 'inline-block';
          cursor.style.backgroundColor = 'transparent';
          cursor.style.color = theme.cursor;
          cursor.style.borderLeft = `2px solid ${theme.cursor}`;
          cursor.style.width = '2px';
          cursor.textContent = '';
          break;
      }
    }
  }

  getFontStack(primaryFont) {
    const fallbacks = [
      'Fira Code', 'Cascadia Code', 'SF Mono', 'Consolas', 
      'DejaVu Sans Mono', 'Ubuntu Mono', 'Monaco', 'Menlo', 
      'Source Code Pro', 'monospace'
    ];
    
    const stack = [primaryFont, ...fallbacks.filter(f => f !== primaryFont)];
    return stack.map(font => `"${font}"`).join(', ');
  }

  async applySettings() {
    try {
      // Guardar configuraciones
      Utils.saveToStorage('appSettings', this.currentSettings);
      
      // Aplicar cambios a la aplicación
      if (window.sshApp) {
        window.sshApp.settings = { ...this.currentSettings };
        
        // Aplicar tema
        window.sshApp.applyTheme(this.currentSettings.theme);
        // Guardar de inmediato para asegurar persistencia aunque el usuario cierre la app sin otras acciones
        window.sshApp.saveSettings();
        // Aplicar color primario
        this.applyPrimaryColor(this.currentSettings.primaryColor);
        
        // Aplicar configuraciones del terminal
        if (window.terminalManager) {
          window.terminalManager.setFontFamily(this.currentSettings.fontFamily);
          window.terminalManager.setFontSize(this.currentSettings.fontSize);
          window.terminalManager.updateTerminalConfigs({
            fontSize: this.currentSettings.fontSize,
            fontFamily: this.getFontStack(this.currentSettings.fontFamily),
            lineHeight: this.currentSettings.lineHeight,
            cursorStyle: this.currentSettings.cursorStyle,
            cursorBlink: this.currentSettings.cursorBlink,
            fontLigatures: this.currentSettings.fontLigatures
          });
          
          // Aplicar tema del terminal
          const theme = this.terminalThemes[this.currentSettings.terminalTheme];
          if (theme) {
            window.terminalManager.setTheme(theme);
          }
        }
      }
      
      // Actualizar configuraciones originales
      this.originalSettings = { ...this.currentSettings };
      
      Utils.showNotification('Configuraciones aplicadas correctamente', 'success', 3000);
      this.hide();
      
    } catch (error) {
      console.error('Error aplicando configuraciones:', error);
      Utils.showNotification('Error aplicando configuraciones', 'error');
    }
  }

  async resetToDefaults() {
    const confirmed = await Utils.confirm(
      '¿Estás seguro de que quieres restaurar todas las configuraciones por defecto?',
      'Restaurar Configuraciones'
    );
    
    if (confirmed) {
      this.currentSettings = { ...this.defaultSettings };
      this.populateForm();
      this.updatePreview();
      Utils.showNotification('Configuraciones restauradas', 'info', 2000);
    }
  }

  // Métodos para acceder desde otras partes de la aplicación
  getSetting(key) {
    return this.currentSettings[key];
  }

  setSetting(key, value) {
    this.currentSettings[key] = value;
    this.updatePreview();
  }

  exportSettings() {
    const settingsBlob = new Blob([JSON.stringify(this.currentSettings, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(settingsBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ssh-client-settings.json';
    a.click();
    
    URL.revokeObjectURL(url);
    Utils.showNotification('Configuraciones exportadas', 'success', 2000);
  }

  async importSettings(file) {
    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text);
      
      // Validar configuraciones importadas
      const validSettings = {};
      for (const [key, defaultValue] of Object.entries(this.defaultSettings)) {
        if (importedSettings.hasOwnProperty(key)) {
          validSettings[key] = importedSettings[key];
        } else {
          validSettings[key] = defaultValue;
        }
      }
      
      this.currentSettings = validSettings;
      this.populateForm();
      this.updatePreview();
      
      Utils.showNotification('Configuraciones importadas correctamente', 'success', 3000);
      
    } catch (error) {
      console.error('Error importando configuraciones:', error);
      Utils.showNotification('Error importando configuraciones', 'error');
    }
  }

  // Método para obtener la configuración de fuente actual
  getCurrentFontConfig() {
    return {
      fontFamily: this.getFontStack(this.currentSettings.fontFamily),
      fontSize: this.currentSettings.fontSize,
      lineHeight: this.currentSettings.lineHeight,
      fontLigatures: this.currentSettings.fontLigatures
    };
  }

  // Método para obtener el tema del terminal actual
  getCurrentTerminalTheme() {
    return this.terminalThemes[this.currentSettings.terminalTheme] || this.terminalThemes.default;
  }
}

// Crear instancia global
const settingsManager = new SettingsManager();
window.settingsManager = settingsManager;