// Gestor del árbol de conexiones con drag & drop
class ConnectionTree {
  constructor() {
    this.container = document.getElementById('connections-tree');
    this.connections = {};
    this.folders = {};
    this.selectedItem = null;
    this.expandedFolders = new Set();
    this.dragula = null;
    
    this.init();
  }

  destroyDragAndDrop() {
    if (this.dragula) {
      this.dragula.destroy();
      this.dragula = null;
    }
  }

  isDescendant(childId, parentId) {
    if (!childId || !parentId) return false;
    if (childId === parentId) return true;

    let current = this.folders[childId];
    while (current) {
      if (current.parentId === parentId) {
        return true;
      }
      current = this.folders[current.parentId];
    }
    return false;
  }

  async init() {
    this.setupEventListeners();
    await this.loadConnections();
  }

  setupEventListeners() {
    // Búsqueda
    const searchInput = document.getElementById('search-connections');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        this.filterConnections(e.target.value);
      }, 300));
    }

    // Botones de la barra lateral
    document.getElementById('btn-new-connection')?.addEventListener('click', () => {
      window.connectionModal.show();
    });

    document.getElementById('btn-new-folder')?.addEventListener('click', () => {
      window.folderModal.show();
    });

    document.getElementById('btn-refresh-connections')?.addEventListener('click', () => {
      this.loadConnections();
    });

    // Eventos del menú
    window.electronAPI.on.menuNewConnection(() => {
      window.connectionModal.show();
    });

    window.electronAPI.on.connectionsImported(() => {
      this.loadConnections();
    });
  }

  setupDragAndDrop() {
    // Destruir instancia previa si existe
    this.destroyDragAndDrop();

    const containers = [
      this.container,
      ...Array.from(this.container.querySelectorAll('.tree-children')),
      ...Array.from(this.container.querySelectorAll('.tree-item.folder'))
    ];

    this.dragula = dragula(containers, {
      accepts: (el, target, source, sibling) => {
        // No permitir mover una carpeta dentro de sí misma o de cualquiera de sus descendientes
        if (!target) return false;
        // Rechazar si estás intentando soltar dentro de ti mismo o de un descendiente
        if (el.contains(target)) {
          return false;
        }
        if (target.classList.contains('tree-children')) {
          const node = target.closest('.tree-node');
          const folderRow = node?.querySelector('.tree-item.folder');
          const targetFolderId = folderRow ? folderRow.dataset.id : null;
          const draggedId = el.dataset.id;
          if (targetFolderId && this.isDescendant(targetFolderId, draggedId)) {
            return false;
          }
        }
        return true; // resto de casos permitido
      },
      moves: (el, source, handle) => {
        // Permitir arrastre desde .tree-node o su fila interna .tree-item
        const node = el.classList.contains('tree-node') ? el : el.closest('.tree-node');
        if (!node) return false;

        // Evitar iniciar arrastre cuando se hace clic en el chevron o botones de acción
        if (handle.closest('.tree-expand') || handle.closest('.tree-action')) {
          return false;
        }
        return true;
      },
    });

    this.dragula.on('drag', (el) => {
      el.classList.add('dragging');
      const item = el.querySelector('.tree-item');
      if (item) item.classList.add('dragging');
    });

    this.dragula.on('dragend', (el) => {
      el.classList.remove('dragging');
      const item = el.querySelector('.tree-item');
      if (item) item.classList.remove('dragging');
    });

    this.dragula.on('drop', async (el, target, source, sibling) => {
      this.handleDrop(el, target, source, sibling);
    });

    this.dragula.on('over', (el, container) => {
      container.classList.add('drag-over');
    });

    this.dragula.on('out', (el, container) => {
      container.classList.remove('drag-over');
    });
  }

  // Actualizar recuento de elementos mostrado en la carpeta
  updateFolderCount(folderElement) {
    if (!folderElement) return;
    const childrenContainer = folderElement.parentElement.querySelector('.tree-children');
    if (!childrenContainer) return;
    const count = childrenContainer.children.length;
    const sub = folderElement.querySelector('.tree-sublabel');
    if (count === 0) {
      // quitar sublabel si queda vacía
      if (sub) sub.remove();
    } else {
      if (sub) {
        sub.textContent = `${count} elemento${count !== 1 ? 's' : ''}`;
      } else {
        const div = document.createElement('div');
        div.className = 'tree-sublabel';
        div.textContent = `${count} elemento${count !== 1 ? 's' : ''}`;
        folderElement.querySelector('.tree-content').appendChild(div);
      }
    }

    // actualizar clase empty del chevron
    const expand = folderElement.querySelector('.tree-expand');
    if (expand) {
      if (count === 0) {
        expand.classList.add('empty');
      } else {
        expand.classList.remove('empty');
      }
    }
  }

  handleDrop(draggedElement, target, source, sibling) {
    const draggedId = draggedElement.dataset.id;
    let newParentId = null;
    // Si el usuario suelta sobre la fila de la carpeta (tree-item.folder) en lugar del contenedor hijos,
  // redirigimos el destino al contenedor .tree-children dentro de ese nodo
  if (target.classList.contains('tree-item') && target.dataset.type === 'folder') {
    const node = target.closest('.tree-node');
    if (node) {
      target = node.querySelector('.tree-children');
      // Si estaba colapsada, la expandimos visualmente para que el usuario vea donde cayó
      if (target) {
        // Mover el elemento realmente dentro del contenedor hijos para que la lista 'children' sea correcta
        target.appendChild(draggedElement);

        // Asegurar que la carpeta aparece expandida
        if (target.classList.contains('collapsed')) {
        target.classList.remove('collapsed');
        target.classList.add('expanded');
            this.expandedFolders.add(target.parentElement.querySelector('.tree-item.folder').dataset.id);
        }
      }
    }
  }
  if (target.classList.contains('tree-children')) {
      const parentNode = target.closest('.tree-node');
      if (parentNode) {
        const parentFolderElement = parentNode.querySelector('.tree-item[data-type="folder"]');
        if (parentFolderElement) {
          newParentId = parentFolderElement.dataset.id;
        }
      }
    }

    const updates = [];
    // target.children son nodos de tipo .tree-node que envuelven un elemento .tree-item.
    // Necesitamos tomar los datos del elemento interno para obtener id y type.
    const getContainerParentId = (containerEl) => {
      if (containerEl.classList.contains('tree-children')) {
        const node = containerEl.closest('.tree-node');
        const folderRow = node?.querySelector('.tree-item.folder');
        return folderRow ? folderRow.dataset.id : null;
      }
      return null;
    };

    const children = Array.from(target.children);
    children.forEach((childNode, index) => {
      const itemEl = childNode.querySelector('.tree-item');
      if (!itemEl) return;
      updates.push({
        id: itemEl.dataset.id,
        type: itemEl.dataset.type,
        order: index,
        parentId: newParentId
      });
    });

    // Si el elemento se movió de un contenedor a otro, también hay que actualizar el origen
    if (source !== target) {
      const sourceChildren = Array.from(source.children);
      sourceChildren.forEach((childNode, index) => {
        const itemEl = childNode.querySelector('.tree-item');
        if (!itemEl) return;
        const existingUpdate = updates.find(u => u.id === itemEl.dataset.id);
        if (!existingUpdate) {
          updates.push({
            id: itemEl.dataset.id,
            type: itemEl.dataset.type,
            order: index,
            parentId: getContainerParentId(source)
          });
        }
      });
    }

    // Actualizar recuentos localmente para feedback inmediato
  const sourceFolderRow = source.closest('.tree-node')?.querySelector('.tree-item.folder');
  const targetFolderRow = target.closest('.tree-node')?.querySelector('.tree-item.folder');
  // Refrescar conteos de todas las carpetas para asegurar consistencia
  Array.from(this.container.querySelectorAll('.tree-item.folder')).forEach(el => this.updateFolderCount(el));

  window.electronAPI.connections.updateItems(updates).then(result => {
      if (result.success) {
        this.loadConnections();
        Utils.showNotification('Estructura actualizada', 'success', 1500);
      } else {
        Utils.showNotification(result.error || 'Error al actualizar.', 'error');
        this.loadConnections(); // Revertir
      }
    });
  }

  async loadConnections() {
    try {
      const result = await window.electronAPI.connections.getAll();
      
      if (result.success) {
        this.connections = result.connections;
        this.folders = result.treeStructure.folders;
        this.treeItems = result.treeStructure.items;
        
        this.render();
      } else {
        console.error('Error cargando conexiones:', result.error);
        Utils.showNotification('Error cargando conexiones', 'error');
      }
    } catch (error) {
      console.error('Error cargando conexiones:', error);
      Utils.showNotification('Error de conexión', 'error');
    }
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'connections-tree';
    
    if (Object.keys(this.connections).length === 0) {
      this.renderEmptyState();
      return;
    }
    
    // Renderizar estructura de árbol
    this.renderTreeLevel(null, this.container, this.connections, this.folders);

    // (Re)inicializar drag and drop después de renderizar el DOM
    this.setupDragAndDrop();
  }

  renderTreeLevel(parentId, container, allConnections, allFolders) {
    const children = [
      ...Object.values(allFolders).filter(f => f.parentId === parentId),
      ...Object.values(allConnections).filter(c => c.folderId === parentId)
    ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    for (const item of children) {
      if (item.children) { // Es una carpeta
        const folderElement = this.createFolderElement(item);
        container.appendChild(folderElement);

        if (this.expandedFolders.has(item.id)) {
          const childrenContainer = folderElement.querySelector('.tree-children');
          this.renderTreeLevel(item.id, childrenContainer, allConnections, allFolders);
        }
      } else { // Es una conexión
        const connectionElement = this.createConnectionElement(item);
        container.appendChild(connectionElement);
      }
    }
  }

  createFolderElement(folder) {
    const isExpanded = this.expandedFolders.has(folder.id);
    const childCount = this.getChildCount(folder.id);
    
    const element = document.createElement('div');
    element.className = 'tree-node';
    element.innerHTML = `
      <div class="tree-item folder" data-type="folder" data-id="${folder.id}">
        <div class="tree-expand ${childCount === 0 ? 'empty' : ''} ${isExpanded ? 'expanded' : ''}"
             onclick="connectionTree.toggleFolder('${folder.id}')">
          <span class="material-symbols-outlined">chevron_right</span>
        </div>
        <div class="tree-icon">
          <span class="material-symbols-outlined">${isExpanded ? 'folder_open' : 'folder'}</span>
        </div>
        <div class="tree-content" onclick="connectionTree.selectItem('${folder.id}', 'folder')">
          <div class="tree-label">${Utils.escapeHtml(folder.name)}</div>
          ${childCount > 0 ? `<div class="tree-sublabel">${childCount} elemento${childCount !== 1 ? 's' : ''}</div>` : ''}
        </div>
        <div class="tree-actions">
          <button class="tree-action" onclick="connectionTree.editFolder('${folder.id}')" title="Editar">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="tree-action danger" onclick="connectionTree.deleteFolder('${folder.id}')" title="Eliminar">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    `;

    // Always create children container for drag & drop even if folder is collapsed or empty
    const childrenContainer = document.createElement('div');
    childrenContainer.className = `tree-children ${isExpanded ? 'expanded' : 'collapsed'}`;
    element.appendChild(childrenContainer);

    return element;
  }

  /**
   * Crear elemento DOM para una conexión individual
   */
  createConnectionElement(connection) {
    const status = this.getConnectionStatus(connection.id);

    const element = document.createElement('div');
    element.className = 'tree-node';
    element.innerHTML = `
      <div class="tree-item connection ${status}" data-type="connection" data-id="${connection.id}">
        <div class="tree-expand empty"></div>
        <div class="tree-icon">
          <span class="material-symbols-outlined">terminal</span>
        </div>
        <div class="tree-content" onclick="connectionTree.selectItem('${connection.id}', 'connection')" ondblclick="connectionTree.connectToServer('${connection.id}')">
          <div class="tree-label">${Utils.escapeHtml(connection.name)}</div>
          <div class="tree-sublabel">${Utils.escapeHtml(connection.username)}@${Utils.escapeHtml(connection.host)}:${connection.port}</div>
        </div>
        <div class="connection-status-indicator ${status}"></div>
        <div class="tree-actions">
          <button class="tree-action" onclick="connectionTree.editConnection('${connection.id}')" title="Editar">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="tree-action" onclick="connectionTree.duplicateConnection('${connection.id}')" title="Duplicar">
            <span class="material-symbols-outlined">content_copy</span>
          </button>
          <button class="tree-action danger" onclick="connectionTree.deleteConnection('${connection.id}')" title="Eliminar">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    `;

    return element;
  }

  renderEmptyState() {
    this.container.className = 'connections-tree empty';
    this.container.innerHTML = `
      <span class="material-symbols-outlined">cloud_off</span>
      <p>No hay conexiones configuradas</p>
      <p>Haz clic en el botón + para crear tu primera conexión SSH</p>
    `;
  }

  toggleFolder(folderId) {
    if (this.expandedFolders.has(folderId)) {
      this.expandedFolders.delete(folderId);
    } else {
      this.expandedFolders.add(folderId);
    }
    
    this.render();
  }

  selectItem(itemId, type) {
    // Remover selección anterior
    const previousSelected = this.container.querySelector('.tree-item.selected');
    if (previousSelected) {
      previousSelected.classList.remove('selected');
    }
    
    // Seleccionar nuevo elemento
    const newSelected = this.container.querySelector(`[data-id="${itemId}"]`);
    if (newSelected) {
      newSelected.classList.add('selected');
      this.selectedItem = { id: itemId, type };
    }
  }

  async connectToServer(connectionId) {
    // Resalta la conexión seleccionada en la interfaz
    this.selectItem(connectionId, 'connection');

    const connection = this.connections[connectionId];
    if (!connection) return;

    // Siempre crear una sesión única e independiente
    const sessionId = crypto.randomUUID();

    try {
      /* 1. Crear una nueva pestaña para esta sesión */
      const tabId = window.tabManager.createTab(connection.name, sessionId, 'terminal');
      window.tabManager.activateTab(tabId);

      /* 2. Crear un nuevo terminal y añadirlo a la zona de contenido */
      const terminal = await window.terminalManager.createTerminal(sessionId, connection);
      const contentArea = document.getElementById('content-area');
      document.getElementById('welcome-screen')?.style.setProperty('display', 'none');
      contentArea.appendChild(terminal.container);

      /* 3. Mostrar el terminal */
      window.terminalManager.showTerminal(sessionId);

      /* 4. Conectar si aún no está conectado (recién creado, pero por seguridad) */
      if (!terminal.isConnected) {
        await window.terminalManager.connectTerminal(sessionId, connection);
      }

    } catch (error) {
      console.error('Error conectando al servidor:', error);
      Utils.showNotification('Error conectando al servidor', 'error');
    }
  }

  async editConnection(connectionId) {
    const connection = this.connections[connectionId];
    if (connection) {
      window.connectionModal.show(connection);
    }
  }

  async duplicateConnection(connectionId) {
    const connection = this.connections[connectionId];
    if (connection) {
      const duplicated = { ...connection };
      delete duplicated.id;
      duplicated.name = `${connection.name} (Copia)`;
      
      window.connectionModal.show(duplicated);
    }
  }

  async deleteConnection(connectionId) {
    const connection = this.connections[connectionId];
    if (!connection) return;
    
    const confirmed = await Utils.confirm(
      `¿Estás seguro de que quieres eliminar la conexión "${connection.name}"?`,
      'Eliminar Conexión'
    );
    
    if (confirmed) {
      try {
        // Desconectar y cerrar terminal si existe
        const terminal = window.terminalManager.getTerminalById(connectionId);
        if (terminal) {
          await window.terminalManager.disconnectTerminal(connectionId);
          window.terminalManager.removeTerminal(connectionId);
        }
        
        // Cerrar pestaña si existe
        const tabId = window.tabManager.findTabByConnectionId(connectionId);
        if (tabId) {
          window.tabManager.closeTab(tabId);
        }
        
        // Eliminar conexión
        const result = await window.electronAPI.connections.delete(connectionId);
        if (result.success) {
          await this.loadConnections();
          Utils.showNotification('Conexión eliminada', 'success', 2000);
        } else {
          Utils.showNotification('Error eliminando conexión', 'error');
        }
      } catch (error) {
        console.error('Error eliminando conexión:', error);
        Utils.showNotification('Error eliminando conexión', 'error');
      }
    }
  }

  async editFolder(folderId) {
    const folder = this.folders[folderId];
    if (folder) {
      window.folderModal.show(folder);
    }
  }

  async deleteFolder(folderId) {
    const folder = this.folders[folderId];
    if (!folder) return;
    
    const childCount = this.getChildCount(folderId);
    let message = `¿Estás seguro de que quieres eliminar la carpeta "${folder.name}"?`;
    
    if (childCount > 0) {
      message += `\n\nLos ${childCount} elemento${childCount !== 1 ? 's' : ''} contenidos se moverán a la carpeta padre.`;
    }
    
    const confirmed = await Utils.confirm(message, 'Eliminar Carpeta');
    
    if (confirmed) {
      try {
        const result = await window.electronAPI.connections.deleteFolder(folderId);
        if (result.success) {
          await this.loadConnections();
          Utils.showNotification('Carpeta eliminada', 'success', 2000);
        } else {
          Utils.showNotification('Error eliminando carpeta', 'error');
        }
      } catch (error) {
        console.error('Error eliminando carpeta:', error);
        Utils.showNotification('Error eliminando carpeta', 'error');
      }
    }
  }

  getChildCount(folderId) {
    let count = 0;
    
    // Contar subcarpetas
    count += Object.values(this.folders).filter(f => f.parentId === folderId).length;
    
    // Contar conexiones
    if (this.treeItems) {
      count += this.treeItems.filter(item => item.folderId === folderId).length;
    }
    
    return count;
  }

  getConnectionStatus(connectionId) {
    const terminal = window.terminalManager?.getTerminalById(connectionId);
    if (!terminal) return 'disconnected';
    
    return terminal.isConnected ? 'connected' : 'disconnected';
  }

  updateConnectionStatus(connectionId, status) {
    const element = this.container.querySelector(`[data-id="${connectionId}"]`);
    if (element) {
      element.className = element.className.replace(/\b(connected|connecting|disconnected|error)\b/g, '');
      element.classList.add(status);
      
      const indicator = element.querySelector('.connection-status-indicator');
      if (indicator) {
        indicator.className = `connection-status-indicator ${status}`;
      }
    }
  }

  filterConnections(searchTerm) {
    const items = this.container.querySelectorAll('.tree-item');
    
    if (!searchTerm.trim()) {
      // Mostrar todos los elementos
      items.forEach(item => {
        item.style.display = '';
        item.classList.remove('search-match');
      });
      return;
    }
    
    const term = searchTerm.toLowerCase();
    
    items.forEach(item => {
      const type = item.dataset.type;
      const id = item.dataset.id;
      let match = false;
      
      if (type === 'connection') {
        const connection = this.connections[id];
        if (connection) {
          const searchText = `${connection.name} ${connection.host} ${connection.username} ${connection.description || ''}`.toLowerCase();
          match = searchText.includes(term);
        }
      } else if (type === 'folder') {
        const folder = this.folders[id];
        if (folder) {
          match = folder.name.toLowerCase().includes(term);
        }
      }
      
      if (match) {
        item.style.display = '';
        item.classList.add('search-match');
        
        // Expandir carpetas padre si es necesario
        if (type === 'connection') {
          this.expandParentFolders(id);
        }
      } else {
        item.style.display = 'none';
        item.classList.remove('search-match');
      }
    });
  }

  expandParentFolders(connectionId) {
    const treeItem = this.treeItems?.find(item => item.id === connectionId);
    if (treeItem && treeItem.folderId) {
      this.expandedFolders.add(treeItem.folderId);
      
      // Expandir recursivamente
      const parentFolder = this.folders[treeItem.folderId];
      if (parentFolder && parentFolder.parentId) {
        this.expandParentFolders(parentFolder.parentId);
      }
    }
  }

  async updateTreeStructure() {
    const treeStructure = {
      folders: this.folders,
      items: this.treeItems || []
    };
    
    try {
      const result = await window.electronAPI.connections.updateTree(treeStructure);
      if (result.success) {
        await this.loadConnections();
      }
    } catch (error) {
      console.error('Error actualizando estructura del árbol:', error);
    }
  }

  // Método para crear una nueva carpeta
  async createFolder(folderData) {
    try {
      const result = await window.electronAPI.connections.createFolder(folderData);
      if (result.success) {
        await this.loadConnections();
        Utils.showNotification('Carpeta creada', 'success', 2000);
        return result.folder;
      } else {
        Utils.showNotification('Error creando carpeta', 'error');
        return null;
      }
    } catch (error) {
      console.error('Error creando carpeta:', error);
      Utils.showNotification('Error creando carpeta', 'error');
      return null;
    }
  }

  // Obtener lista de carpetas para selectores
  getFoldersList() {
    const folders = [];
    
    const addFolder = (folder, level = 0) => {
      folders.push({
        ...folder,
        level,
        displayName: '  '.repeat(level) + folder.name
      });
      
      // Agregar subcarpetas
      Object.values(this.folders)
        .filter(f => f.parentId === folder.id)
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(subfolder => addFolder(subfolder, level + 1));
    };
    
    // Agregar carpetas raíz
    Object.values(this.folders)
      .filter(f => !f.parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(folder => addFolder(folder));
    
    return folders;
  }
}

// Crear instancia global
const connectionTree = new ConnectionTree();
window.connectionTree = connectionTree;