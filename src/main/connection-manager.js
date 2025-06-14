const Store = require('electron-store');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;

class ConnectionManager {
  constructor() {
    this.store = new Store({
      name: 'ssh-connections',
      defaults: {
        connections: {},
        treeStructure: {
          folders: {},
          items: []
        }
      }
    });
  }

  async saveConnection(connectionData) {
    try {
      const connections = this.store.get('connections', {});
      
      // Si no tiene ID, generar uno nuevo
      if (!connectionData.id) {
        connectionData.id = uuidv4();
        const allFolders = this.store.get('treeStructure.folders', {});
        const siblings = [
          ...Object.values(connections).filter(c => c.folderId === connectionData.folderId),
          ...Object.values(allFolders).filter(f => f.parentId === connectionData.folderId)
        ];
        connectionData.order = siblings.length;
      }

      // Validar datos requeridos
      if (!connectionData.name || !connectionData.host) {
        throw new Error('Nombre y host son requeridos');
      }

      // Encriptar contraseña si existe (básico - en producción usar crypto más seguro)
      if (connectionData.password) {
        connectionData.password = Buffer.from(connectionData.password).toString('base64');
        connectionData.encrypted = true;
      }

      connections[connectionData.id] = {
        ...connectionData,
        createdAt: connectionData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.store.set('connections', connections);

      // Si es nueva conexión, añadir al árbol
      if (!connectionData.createdAt) {
        await this.addConnectionToTree(connectionData.id, connectionData.folderId);
      }

      return {
        success: true,
        connection: connections[connectionData.id]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteConnection(connectionId) {
    try {
      const connections = this.store.get('connections', {});
      
      if (!connections[connectionId]) {
        throw new Error('Conexión no encontrada');
      }

      delete connections[connectionId];
      this.store.set('connections', connections);

      // Remover del árbol
      await this.removeConnectionFromTree(connectionId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getAllConnections() {
    try {
      const connections = this.store.get('connections', {});
      const treeStructure = this.store.get('treeStructure', {
        folders: {},
        items: []
      });

      // Desencriptar contraseñas
      const decryptedConnections = {};
      for (const [id, conn] of Object.entries(connections)) {
        decryptedConnections[id] = { ...conn };
        if (conn.encrypted && conn.password) {
          decryptedConnections[id].password = Buffer.from(conn.password, 'base64').toString();
        }
      }

      return {
        success: true,
        connections: decryptedConnections,
        treeStructure
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createFolder(folderData) {
    try {
      const treeStructure = this.store.get('treeStructure', {
        folders: {},
        items: []
      });

      const folderId = folderData.id || uuidv4();
      
      const allConnections = this.store.get('connections', {});
      const siblings = [
        ...Object.values(allConnections).filter(c => c.folderId === folderData.parentId),
        ...Object.values(treeStructure.folders).filter(f => f.parentId === folderData.parentId)
      ];

      treeStructure.folders[folderId] = {
        id: folderId,
        name: folderData.name,
        parentId: folderData.parentId || null,
        children: [],
        order: siblings.length,
        createdAt: new Date().toISOString()
      };

      // Si tiene padre, añadir a sus hijos
      if (folderData.parentId && treeStructure.folders[folderData.parentId]) {
        treeStructure.folders[folderData.parentId].children.push(folderId);
      }

      this.store.set('treeStructure', treeStructure);

      return {
        success: true,
        folder: treeStructure.folders[folderId]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteFolder(folderId) {
    try {
      const treeStructure = this.store.get('treeStructure', {
        folders: {},
        items: []
      });

      if (!treeStructure.folders[folderId]) {
        throw new Error('Carpeta no encontrada');
      }

      const folder = treeStructure.folders[folderId];

      // Mover conexiones y subcarpetas al nivel padre o raíz
      const parentId = folder.parentId;
      
      // Mover hijos al padre
      for (const childId of folder.children || []) {
        if (treeStructure.folders[childId]) {
          treeStructure.folders[childId].parentId = parentId;
        }
      }

      // Mover conexiones
      treeStructure.items = treeStructure.items.map(item => {
        if (item.folderId === folderId) {
          return { ...item, folderId: parentId };
        }
        return item;
      });

      // Eliminar carpeta
      delete treeStructure.folders[folderId];

      // Remover de padre si existe
      if (parentId && treeStructure.folders[parentId]) {
        treeStructure.folders[parentId].children = 
          treeStructure.folders[parentId].children.filter(id => id !== folderId);
      }

      this.store.set('treeStructure', treeStructure);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateTreeStructure(newTreeData) {
    try {
      this.store.set('treeStructure', newTreeData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async addConnectionToTree(connectionId, folderId = null) {
    const treeStructure = this.store.get('treeStructure', {
      folders: {},
      items: []
    });

    treeStructure.items.push({
      id: connectionId,
      type: 'connection',
      folderId: folderId
    });

    this.store.set('treeStructure', treeStructure);
  }

  async removeConnectionFromTree(connectionId) {
    const treeStructure = this.store.get('treeStructure', {
      folders: {},
      items: []
    });

    treeStructure.items = treeStructure.items.filter(
      item => item.id !== connectionId
    );

    this.store.set('treeStructure', treeStructure);
  }

  async importConnections(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const importData = JSON.parse(data);

      if (!importData.connections) {
        throw new Error('Formato de archivo inválido');
      }

      const currentConnections = this.store.get('connections', {});
      const currentTree = this.store.get('treeStructure', {
        folders: {},
        items: []
      });

      // Fusionar conexiones
      const mergedConnections = { ...currentConnections };
      for (const [id, conn] of Object.entries(importData.connections)) {
        // Generar nuevo ID si ya existe
        let newId = id;
        if (mergedConnections[id]) {
          newId = uuidv4();
        }
        mergedConnections[newId] = { ...conn, id: newId };
      }

      // Fusionar estructura de árbol
      const mergedTree = {
        folders: { ...currentTree.folders, ...importData.treeStructure?.folders || {} },
        items: [...currentTree.items, ...importData.treeStructure?.items || []]
      };

      this.store.set('connections', mergedConnections);
      this.store.set('treeStructure', mergedTree);

      return { success: true };
    } catch (error) {
      throw new Error(`Error importando conexiones: ${error.message}`);
    }
  }

  async exportConnections(filePath) {
    try {
      const connections = this.store.get('connections', {});
      const treeStructure = this.store.get('treeStructure', {
        folders: {},
        items: []
      });

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        connections,
        treeStructure
      };

      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
      return { success: true };
    } catch (error) {
      throw new Error(`Error exportando conexiones: ${error.message}`);
    }
  }

  async searchConnections(query) {
    try {
      const connections = this.store.get('connections', {});
      const results = [];

      const searchTerms = query.toLowerCase().split(' ');

      for (const [id, conn] of Object.entries(connections)) {
        const searchText = `${conn.name} ${conn.host} ${conn.username} ${conn.description || ''}`.toLowerCase();
        
        if (searchTerms.every(term => searchText.includes(term))) {
          results.push({ ...conn, id });
        }
      }

      return {
        success: true,
        results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateFolderParent({ folderId, parentId }) {
    try {
      const treeStructure = this.store.get('treeStructure');
      const { folders } = treeStructure;

      if (!folders[folderId]) {
        throw new Error('La carpeta que intentas mover no existe.');
      }

      const folderToMove = folders[folderId];
      const oldParentId = folderToMove.parentId;

      if (folderId === parentId) {
        throw new Error('No se puede mover una carpeta a sí misma.');
      }

      // 1. Quitar del padre anterior
      if (oldParentId && folders[oldParentId]?.children) {
        folders[oldParentId].children = folders[oldParentId].children.filter(id => id !== folderId);
      }

      // 2. Asignar al nuevo padre
      folderToMove.parentId = parentId;

      // 3. Añadir al array de hijos del nuevo padre
      if (parentId && folders[parentId]) {
        if (!folders[parentId].children) {
          folders[parentId].children = [];
        }
        folders[parentId].children.push(folderId);
      }

      this.store.set('treeStructure', treeStructure);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateItems(updates) {
    try {
      const connections = this.store.get('connections');
      const treeStructure = this.store.get('treeStructure');
      const { folders } = treeStructure;

      for (const update of updates) {
        const item = update.type === 'connection' ? connections[update.id] : folders[update.id];
        if (!item) continue;

        if (update.order !== undefined) {
          item.order = update.order;
        }

        if (update.parentId !== undefined && item.parentId !== update.parentId) {
          if (update.type === 'connection') {
            // Actualizar folderId en la propia conexión
            item.folderId = update.parentId;
            // También reflejarlo en la lista de items para mantener consistencia del árbol
            const treeItem = treeStructure.items.find(it => it.id === update.id);
            if (treeItem) {
              treeItem.folderId = update.parentId;
            }
          } else {
            const oldParentId = item.parentId;
            const newParentId = update.parentId;
            
            if (oldParentId && folders[oldParentId]?.children) {
              folders[oldParentId].children = folders[oldParentId].children.filter(id => id !== update.id);
            }
            
            if (newParentId && folders[newParentId]) {
              if (!folders[newParentId].children) folders[newParentId].children = [];
              if (!folders[newParentId].children.includes(update.id)) {
                folders[newParentId].children.push(update.id);
              }
            }
            item.parentId = newParentId;
          }
        }
        item.updatedAt = new Date().toISOString();
      }

      this.store.set('connections', connections);
      this.store.set('treeStructure', treeStructure);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = { ConnectionManager };