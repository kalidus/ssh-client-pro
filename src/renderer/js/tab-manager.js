// Gestor de pestañas para múltiples terminales
class TabManager {
  constructor() {
    this.tabs = new Map();
    this.activeTab = null;
    this.tabCounter = 0;
    this.container = document.getElementById('tabs-list');
    this.contentArea = document.getElementById('content-area');
    
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Botón nueva pestaña
    document.getElementById('btn-new-tab')?.addEventListener('click', () => {
      this.createWelcomeTab();
    });

    // Eventos del menú
    window.electronAPI.on.menuNewTab(() => {
      this.createWelcomeTab();
    });

    window.electronAPI.on.menuCloseTab(() => {
      if (this.activeTab) {
        this.closeTab(this.activeTab);
      }
    });

    // Atajos de teclado para pestañas
    document.addEventListener('keydown', (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      
      if (isCtrlOrCmd) {
        // Ctrl/Cmd + número para cambiar de pestaña
        if (e.key >= '1' && e.key <= '9') {
          e.preventDefault();
          const tabIndex = parseInt(e.key) - 1;
          this.activateTabByIndex(tabIndex);
        }
        
        // Ctrl/Cmd + Tab para siguiente pestaña
        if (e.key === 'Tab' && !e.shiftKey) {
          e.preventDefault();
          this.activateNextTab();
        }
        
        // Ctrl/Cmd + Shift + Tab para pestaña anterior
        if (e.key === 'Tab' && e.shiftKey) {
          e.preventDefault();
          this.activatePreviousTab();
        }
      }
    });
  }

  createTab(title, connectionId = null, type = 'terminal') {
    const tabId = `tab-${++this.tabCounter}`;
    
    const tab = {
      id: tabId,
      title,
      connectionId,
      type,
      isActive: false,
      element: null,
      isDirty: false
    };

    // Crear elemento de pestaña
    const tabElement = this.createTabElement(tab);
    tab.element = tabElement;
    
    this.tabs.set(tabId, tab);
    this.container.appendChild(tabElement);
    
    // Activar la nueva pestaña
    this.activateTab(tabId);
    
    return tabId;
  }

  createWelcomeTab() {
    const tabId = this.createTab('Inicio', null, 'welcome');
    this.showWelcomeScreen();
    return tabId;
  }

  createTabElement(tab) {
    const element = document.createElement('div');
    element.className = 'tab';
    element.dataset.tabId = tab.id;
    element.innerHTML = `
      <span class="tab-icon material-symbols-outlined">
        ${this.getTabIcon(tab.type, tab.connectionId)}
      </span>
      <span class="tab-title">${Utils.escapeHtml(tab.title)}</span>
      <button class="btn-icon tab-close" onclick="tabManager.closeTab('${tab.id}')" title="Cerrar">
        <span class="material-symbols-outlined">close</span>
      </button>
    `;
    
    // Event listener para activar pestaña
    element.addEventListener('click', (e) => {
      if (!e.target.closest('.tab-close')) {
        this.activateTab(tab.id);
      }
    });

    // Event listener para cerrar con rueda del mouse
    element.addEventListener('mousedown', (e) => {
      if (e.button === 1) { // Rueda del mouse
        e.preventDefault();
        this.closeTab(tab.id);
      }
    });

    return element;
  }

  getTabIcon(type, connectionId) {
    switch (type) {
      case 'terminal':
        const status = this.getConnectionStatus(connectionId);
        switch (status) {
          case 'connected': return 'terminal';
          case 'connecting': return 'sync';
          case 'error': return 'error';
          default: return 'cloud_off';
        }
      case 'welcome':
        return 'home';
      default:
        return 'tab';
    }
  }

  getConnectionStatus(connectionId) {
    if (!connectionId) return 'disconnected';
    
    const terminal = window.terminalManager?.getTerminalById(connectionId);
    if (!terminal) return 'disconnected';
    
    return terminal.isConnected ? 'connected' : 'disconnected';
  }

  activateTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    // Desactivar pestaña anterior
    if (this.activeTab) {
      const prevTab = this.tabs.get(this.activeTab);
      if (prevTab) {
        prevTab.isActive = false;
        prevTab.element.classList.remove('active');
      }
    }

    // Activar nueva pestaña
    tab.isActive = true;
    tab.element.classList.add('active');
    this.activeTab = tabId;

    // Mostrar contenido correspondiente
    this.showTabContent(tab);

    // Scroll para hacer visible la pestaña
    this.scrollToTab(tab.element);
  }

  showTabContent(tab) {
    if (tab.type === 'terminal' && tab.connectionId) {
      // Mostrar terminal
      window.terminalManager.showTerminal(tab.connectionId);
      this.hideWelcomeScreen();
    } else if (tab.type === 'welcome') {
      // Mostrar pantalla de bienvenida
      this.showWelcomeScreen();
      // Ocultar todos los terminales
      if (window.terminalManager) {
        window.terminalManager.terminals.forEach((terminal) => {
          terminal.container.style.display = 'none';
        });
      }
    }
  }

  closeTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    // Confirmar cierre si hay actividad
    if (tab.isDirty) {
      const confirmed = Utils.confirm(
        '¿Estás seguro de que quieres cerrar esta pestaña? Hay cambios sin guardar.',
        'Cerrar Pestaña'
      );
      if (!confirmed) return;
    }

    // Si es un terminal, desconectar y remover
    if (tab.type === 'terminal' && tab.connectionId) {
      const terminal = window.terminalManager.getTerminalById(tab.connectionId);
      if (terminal && terminal.isConnected) {
        window.terminalManager.disconnectTerminal(tab.connectionId);
      }
    }

    // Remover elemento del DOM
    tab.element.remove();
    
    // Si era la pestaña activa, activar otra
    if (tab.isActive) {
      const remainingTabs = Array.from(this.tabs.values()).filter(t => t.id !== tabId);
      
      if (remainingTabs.length > 0) {
        // Activar la pestaña más cercana
        const tabIndex = Array.from(this.tabs.keys()).indexOf(tabId);
        const nextTab = remainingTabs[Math.min(tabIndex, remainingTabs.length - 1)];
        this.activateTab(nextTab.id);
      } else {
        // No hay más pestañas, mostrar pantalla de bienvenida
        this.activeTab = null;
        this.showWelcomeScreen();
      }
    }

    // Eliminar de la colección
    this.tabs.delete(tabId);
  }

  closeAllTabs() {
    const tabIds = Array.from(this.tabs.keys());
    tabIds.forEach(tabId => this.closeTab(tabId));
  }

  findTabByConnectionId(connectionId) {
    for (const [tabId, tab] of this.tabs) {
      if (tab.connectionId === connectionId) {
        return tabId;
      }
    }
    return null;
  }

  updateTabTitle(tabId, newTitle) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    tab.title = newTitle;
    const titleElement = tab.element.querySelector('.tab-title');
    if (titleElement) {
      titleElement.textContent = newTitle;
    }
  }

  updateTabIcon(tabId, connectionId = null) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    const iconElement = tab.element.querySelector('.tab-icon');
    if (iconElement) {
      const newIcon = this.getTabIcon(tab.type, connectionId || tab.connectionId);
      iconElement.textContent = newIcon;
    }
  }

  markTabDirty(tabId, isDirty = true) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    tab.isDirty = isDirty;
    
    // Agregar indicador visual si está sucio
    const titleElement = tab.element.querySelector('.tab-title');
    if (titleElement) {
      if (isDirty && !titleElement.textContent.endsWith('*')) {
        titleElement.textContent += '*';
      } else if (!isDirty && titleElement.textContent.endsWith('*')) {
        titleElement.textContent = titleElement.textContent.slice(0, -1);
      }
    }
  }

  activateTabByIndex(index) {
    const tabs = Array.from(this.tabs.values());
    if (index >= 0 && index < tabs.length) {
      this.activateTab(tabs[index].id);
    }
  }

  activateNextTab() {
    const tabs = Array.from(this.tabs.values());
    const currentIndex = tabs.findIndex(tab => tab.id === this.activeTab);
    
    if (currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % tabs.length;
      this.activateTab(tabs[nextIndex].id);
    }
  }

  activatePreviousTab() {
    const tabs = Array.from(this.tabs.values());
    const currentIndex = tabs.findIndex(tab => tab.id === this.activeTab);
    
    if (currentIndex !== -1) {
      const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
      this.activateTab(tabs[prevIndex].id);
    }
  }

  scrollToTab(tabElement) {
    const container = this.container;
    const tabRect = tabElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    if (tabRect.left < containerRect.left) {
      // Tab está a la izquierda del contenedor visible
      container.scrollLeft -= containerRect.left - tabRect.left + 20;
    } else if (tabRect.right > containerRect.right) {
      // Tab está a la derecha del contenedor visible
      container.scrollLeft += tabRect.right - containerRect.right + 20;
    }
  }

  showWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcome-screen');
    if (welcomeScreen) {
      welcomeScreen.style.display = 'flex';
    }
  }

  hideWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcome-screen');
    if (welcomeScreen) {
      welcomeScreen.style.display = 'none';
    }
  }

  // Métodos para gestión de pestañas por conexión
  updateConnectionStatus(connectionId, status) {
    // Actualizar todas las pestañas que usan esta conexión
    for (const [tabId, tab] of this.tabs) {
      if (tab.connectionId === connectionId) {
        this.updateTabIcon(tabId, connectionId);
        
        // Actualizar título si es necesario
        if (status === 'error') {
          this.markTabDirty(tabId, true);
        } else if (status === 'connected') {
          this.markTabDirty(tabId, false);
        }
      }
    }
  }

  // Obtener información de todas las pestañas
  getAllTabs() {
    return Array.from(this.tabs.entries()).map(([id, tab]) => ({
      id,
      title: tab.title,
      type: tab.type,
      connectionId: tab.connectionId,
      isActive: tab.isActive,
      isDirty: tab.isDirty
    }));
  }

  getActiveTab() {
    return this.tabs.get(this.activeTab);
  }

  // Reordenar pestañas (para drag & drop futuro)
  reorderTabs(fromIndex, toIndex) {
    const tabs = Array.from(this.tabs.values());
    const [movedTab] = tabs.splice(fromIndex, 1);
    tabs.splice(toIndex, 0, movedTab);

    // Reconstruir el DOM
    this.container.innerHTML = '';
    tabs.forEach(tab => {
      this.container.appendChild(tab.element);
    });
  }

  // Clonar pestaña
  duplicateTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) return null;

    if (tab.type === 'terminal' && tab.connectionId) {
      // Para terminales, crear una nueva conexión
      const connection = window.connectionTree.connections[tab.connectionId];
      if (connection) {
        const newTabId = this.createTab(`${tab.title} (Copia)`, null, 'terminal');
        // Aquí podrías implementar la lógica para duplicar la conexión
        return newTabId;
      }
    } else if (tab.type === 'welcome') {
      return this.createWelcomeTab();
    }

    return null;
  }

  // Cerrar todas las pestañas excepto la actual
  closeOtherTabs() {
    if (!this.activeTab) return;

    const tabsToClose = Array.from(this.tabs.keys()).filter(id => id !== this.activeTab);
    tabsToClose.forEach(tabId => this.closeTab(tabId));
  }

  // Cerrar todas las pestañas desconectadas
  closeDisconnectedTabs() {
    const tabsToClose = [];
    
    for (const [tabId, tab] of this.tabs) {
      if (tab.type === 'terminal' && tab.connectionId) {
        const status = this.getConnectionStatus(tab.connectionId);
        if (status === 'disconnected' || status === 'error') {
          tabsToClose.push(tabId);
        }
      }
    }
    
    tabsToClose.forEach(tabId => this.closeTab(tabId));
  }

  // Obtener estadísticas de pestañas
  getTabStats() {
    const stats = {
      total: this.tabs.size,
      terminal: 0,
      welcome: 0,
      connected: 0,
      disconnected: 0,
      dirty: 0
    };

    for (const tab of this.tabs.values()) {
      stats[tab.type]++;
      
      if (tab.isDirty) {
        stats.dirty++;
      }
      
      if (tab.type === 'terminal' && tab.connectionId) {
        const status = this.getConnectionStatus(tab.connectionId);
        if (status === 'connected') {
          stats.connected++;
        } else {
          stats.disconnected++;
        }
      }
    }

    return stats;
  }

  // Guardar estado de las pestañas
  saveTabsState() {
    const state = {
      activeTab: this.activeTab,
      tabs: this.getAllTabs()
    };
    
    Utils.saveToStorage('tabsState', state);
  }

  // Restaurar estado de las pestañas
  restoreTabsState() {
    const state = Utils.loadFromStorage('tabsState');
    if (!state) return;

    // Restaurar pestañas (implementación básica)
    state.tabs.forEach(tabData => {
      if (tabData.type === 'welcome') {
        this.createWelcomeTab();
      }
      // Para terminales, necesitaríamos restaurar las conexiones
    });

    // Activar la pestaña que estaba activa
    if (state.activeTab && this.tabs.has(state.activeTab)) {
      this.activateTab(state.activeTab);
    }
  }
}

// Crear instancia global
const tabManager = new TabManager();
window.tabManager = tabManager;