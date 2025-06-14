// Modal para gestión de conexiones SSH
class ConnectionModal {
  constructor() {
    this.modal = document.getElementById('connection-modal');
    this.form = document.getElementById('connection-form');
    this.isEditing = false;
    this.currentConnection = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupFormValidation();
  }

  setupEventListeners() {
    // Botones de cierre
    document.getElementById('btn-close-modal')?.addEventListener('click', () => {
      this.hide();
    });

    // Cerrar al hacer clic fuera del modal
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('show')) {
        this.hide();
      }
    });

    // Cambio de método de autenticación
    const authRadios = document.querySelectorAll('input[name="auth-method"]');
    authRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.toggleAuthMethod(radio.value);
      });
    });

    // Toggle password visibility
    document.querySelector('.toggle-password')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.togglePasswordVisibility();
    });

    // Submit del formulario
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Botón de prueba de conexión
    document.getElementById('btn-test-connection')?.addEventListener('click', () => {
      this.testConnection();
    });

    // Auto-completar campos
    document.getElementById('connection-host')?.addEventListener('blur', () => {
      this.autoFillFields();
    });

    // Validación en tiempo real
    this.setupRealTimeValidation();
  }

  setupFormValidation() {
    // Configurar validaciones personalizadas
    const hostInput = document.getElementById('connection-host');
    const portInput = document.getElementById('connection-port');
    const nameInput = document.getElementById('connection-name');

    if (hostInput) {
      hostInput.addEventListener('input', () => {
        this.validateHost(hostInput.value);
      });
    }

    if (portInput) {
      portInput.addEventListener('input', () => {
        this.validatePort(portInput.value);
      });
    }

    if (nameInput) {
      nameInput.addEventListener('input', () => {
        this.validateName(nameInput.value);
      });
    }
  }

  setupRealTimeValidation() {
    const inputs = this.form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        this.validateField(input);
      });
      
      input.addEventListener('input', () => {
        // Limpiar errores mientras el usuario escribe
        this.clearFieldError(input);
      });
    });
  }

  show(connection = null) {
    this.isEditing = !!connection;
    this.currentConnection = connection;
    
    // Actualizar título del modal
    const title = document.getElementById('modal-title');
    if (title) {
      title.textContent = this.isEditing ? 'Editar Conexión SSH' : 'Nueva Conexión SSH';
    }

    // Limpiar formulario
    this.form.reset();
    this.clearFormErrors();

    // Cargar datos si es edición
    if (connection) {
      this.loadConnectionData(connection);
    } else {
      // Configurar valores por defecto
      document.getElementById('connection-port').value = '22';
      document.querySelector('input[name="auth-method"][value="password"]').checked = true;
      this.toggleAuthMethod('password');
    }

    // Actualizar lista de carpetas
    this.updateFoldersList();

    // Mostrar modal
    this.modal.classList.add('show');
    
    // Enfocar primer campo
    setTimeout(() => {
      document.getElementById('connection-name')?.focus();
    }, 100);
  }

  hide() {
    this.modal.classList.remove('show');
    this.form.reset();
    this.clearFormErrors();
    this.currentConnection = null;
    this.isEditing = false;
  }

  loadConnectionData(connection) {
    // Cargar datos básicos
    document.getElementById('connection-name').value = connection.name || '';
    document.getElementById('connection-host').value = connection.host || '';
    document.getElementById('connection-port').value = connection.port || 22;
    document.getElementById('connection-username').value = connection.username || '';
    document.getElementById('connection-description').value = connection.description || '';

    // Configurar método de autenticación
    if (connection.privateKey) {
      document.querySelector('input[name="auth-method"][value="key"]').checked = true;
      document.getElementById('connection-private-key').value = connection.privateKey;
      document.getElementById('connection-passphrase').value = connection.passphrase || '';
      this.toggleAuthMethod('key');
    } else {
      document.querySelector('input[name="auth-method"][value="password"]').checked = true;
      document.getElementById('connection-password').value = connection.password || '';
      this.toggleAuthMethod('password');
    }

    // Seleccionar carpeta
    const folderSelect = document.getElementById('connection-folder');
    if (folderSelect && connection.folderId) {
      folderSelect.value = connection.folderId;
    }
  }

  toggleAuthMethod(method) {
    const passwordSection = document.getElementById('password-auth');
    const keySection = document.getElementById('key-auth');

    if (method === 'password') {
      passwordSection.classList.remove('hidden');
      keySection.classList.add('hidden');
    } else {
      passwordSection.classList.add('hidden');
      keySection.classList.remove('hidden');
    }
  }

  togglePasswordVisibility() {
    const passwordInput = document.getElementById('connection-password');
    const toggleButton = document.querySelector('.toggle-password');
    const icon = toggleButton.querySelector('.material-symbols-outlined');

    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      icon.textContent = 'visibility_off';
    } else {
      passwordInput.type = 'password';
      icon.textContent = 'visibility';
    }
  }

  updateFoldersList() {
    const folderSelect = document.getElementById('connection-folder');
    if (!folderSelect || !window.connectionTree) return;

    // Limpiar opciones existentes
    folderSelect.innerHTML = '<option value="">Raíz</option>';

    // Agregar carpetas
    const folders = window.connectionTree.getFoldersList();
    folders.forEach(folder => {
      const option = document.createElement('option');
      option.value = folder.id;
      option.textContent = folder.displayName;
      folderSelect.appendChild(option);
    });
  }

  validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let message = '';

    switch (field.id) {
      case 'connection-name':
        if (!value) {
          isValid = false;
          message = 'El nombre es requerido';
        }
        break;

      case 'connection-host':
        if (!value) {
          isValid = false;
          message = 'El host es requerido';
        } else if (!Utils.isValidIP(value) && !Utils.isValidHostname(value)) {
          isValid = false;
          message = 'Host o IP inválida';
        }
        break;

      case 'connection-port':
        if (!value) {
          isValid = false;
          message = 'El puerto es requerido';
        } else if (!Utils.isValidPort(value)) {
          isValid = false;
          message = 'Puerto inválido (1-65535)';
        }
        break;

      case 'connection-username':
        if (!value) {
          isValid = false;
          message = 'El usuario es requerido';
        }
        break;

      case 'connection-password':
        const authMethod = document.querySelector('input[name="auth-method"]:checked').value;
        if (authMethod === 'password' && !value) {
          isValid = false;
          message = 'La contraseña es requerida';
        }
        break;

      case 'connection-private-key':
        const keyMethod = document.querySelector('input[name="auth-method"]:checked').value;
        if (keyMethod === 'key' && !value) {
          isValid = false;
          message = 'La clave privada es requerida';
        }
        break;
    }

    if (!isValid) {
      this.showFieldError(field, message);
    } else {
      this.clearFieldError(field);
    }

    return isValid;
  }

  validateHost(host) {
    return Utils.isValidIP(host) || Utils.isValidHostname(host);
  }

  validatePort(port) {
    return Utils.isValidPort(port);
  }

  validateName(name) {
    return name.trim().length > 0;
  }

  showFieldError(field, message) {
    field.classList.add('error');
    
    // Remover mensaje de error anterior
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }

    // Agregar nuevo mensaje de error
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.style.color = 'var(--md-error)';
    errorElement.style.fontSize = '12px';
    errorElement.style.marginTop = '4px';
    
    field.parentNode.appendChild(errorElement);
  }

  clearFieldError(field) {
    field.classList.remove('error');
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
      errorElement.remove();
    }
  }

  clearFormErrors() {
    const errorElements = this.form.querySelectorAll('.field-error');
    errorElements.forEach(el => el.remove());
    
    const errorFields = this.form.querySelectorAll('.error');
    errorFields.forEach(field => field.classList.remove('error'));
  }

  autoFillFields() {
    const host = document.getElementById('connection-host').value.trim();
    const username = document.getElementById('connection-username').value.trim();
    const name = document.getElementById('connection-name').value.trim();

    // Auto-generar nombre si está vacío
    if (!name && host && username) {
      const autoName = Utils.generateConnectionName(host, username);
      document.getElementById('connection-name').value = autoName;
    }
  }

  async testConnection() {
    // Validar formulario antes de probar
    const errors = this.validateForm();
    if (errors.length > 0) {
      Utils.showNotification('Corrige los errores antes de probar la conexión', 'warning');
      return;
    }

    const connectionData = this.getFormData();
    const testId = 'test-' + Utils.generateUUID();

    try {
      Utils.showLoading('Probando conexión...');

      // Intentar conectar
      const result = await window.electronAPI.ssh.connect(testId, connectionData);
      
      if (result.success) {
        Utils.showNotification('¡Conexión exitosa!', 'success', 3000);
        
        // Desconectar inmediatamente
        setTimeout(async () => {
          await window.electronAPI.ssh.disconnect(testId);
        }, 1000);
      } else {
        throw new Error(result.error || 'Error de conexión');
      }
    } catch (error) {
      console.error('Error probando conexión:', error);
      const errorMessage = Utils.getSSHErrorMessage(error);
      Utils.showNotification(`Error de conexión: ${errorMessage}`, 'error', 5000);
    } finally {
      Utils.hideLoading();
    }
  }

  validateForm() {
    const errors = [];
    const requiredFields = this.form.querySelectorAll('input[required], textarea[required], select[required]');
    
    // Validar campos requeridos
    requiredFields.forEach(field => {
      if (!this.validateField(field)) {
        errors.push(field);
      }
    });

    // Validar método de autenticación
    const authMethod = document.querySelector('input[name="auth-method"]:checked').value;
    if (authMethod === 'password') {
      const passwordField = document.getElementById('connection-password');
      if (!passwordField.value.trim()) {
        this.showFieldError(passwordField, 'La contraseña es requerida');
        errors.push(passwordField);
      }
    } else if (authMethod === 'key') {
      const keyField = document.getElementById('connection-private-key');
      if (!keyField.value.trim()) {
        this.showFieldError(keyField, 'La clave privada es requerida');
        errors.push(keyField);
      }
    }

    return errors;
  }

  getFormData() {
    const authMethod = document.querySelector('input[name="auth-method"]:checked').value;
    
    const data = {
      name: document.getElementById('connection-name').value.trim(),
      host: document.getElementById('connection-host').value.trim(),
      port: parseInt(document.getElementById('connection-port').value) || 22,
      username: document.getElementById('connection-username').value.trim(),
      description: document.getElementById('connection-description').value.trim(),
      folderId: document.getElementById('connection-folder').value || null
    };

    if (authMethod === 'password') {
      data.password = document.getElementById('connection-password').value;
    } else {
      data.privateKey = document.getElementById('connection-private-key').value.trim();
      const passphrase = document.getElementById('connection-passphrase').value.trim();
      if (passphrase) {
        data.passphrase = passphrase;
      }
    }

    // Si estamos editando, incluir el ID
    if (this.isEditing && this.currentConnection) {
      data.id = this.currentConnection.id;
    }

    return data;
  }

  async handleSubmit() {
    // Validar formulario
    const errors = this.validateForm();
    if (errors.length > 0) {
      // Enfocar el primer campo con error
      errors[0].focus();
      return;
    }

    try {
      Utils.showLoading(this.isEditing ? 'Actualizando conexión...' : 'Guardando conexión...');

      const connectionData = this.getFormData();
      const result = await window.electronAPI.connections.save(connectionData);

      if (result.success) {
        Utils.showNotification(
          this.isEditing ? 'Conexión actualizada' : 'Conexión guardada',
          'success',
          2000
        );

        // Recargar el árbol de conexiones
        await window.connectionTree.loadConnections();

        // Cerrar modal
        this.hide();
      } else {
        throw new Error(result.error || 'Error guardando conexión');
      }
    } catch (error) {
      console.error('Error guardando conexión:', error);
      Utils.showNotification('Error guardando conexión', 'error');
    } finally {
      Utils.hideLoading();
    }
  }

  // Importar conexión desde URL SSH
  importFromSSHUrl(url) {
    const parsed = Utils.parseSSHUrl(url);
    if (parsed) {
      document.getElementById('connection-host').value = parsed.host;
      document.getElementById('connection-port').value = parsed.port;
      document.getElementById('connection-username').value = parsed.username;
      
      // Auto-generar nombre
      if (parsed.username && parsed.host) {
        const name = Utils.generateConnectionName(parsed.host, parsed.username);
        document.getElementById('connection-name').value = name;
      }
    }
  }

  // Exportar conexión a formato SSH URL
  exportToSSHUrl() {
    const data = this.getFormData();
    return `ssh://${data.username}@${data.host}:${data.port}`;
  }

  // Validar clave privada
  validatePrivateKey(key) {
    const privateKeyPatterns = [
      /-----BEGIN OPENSSH PRIVATE KEY-----/,
      /-----BEGIN RSA PRIVATE KEY-----/,
      /-----BEGIN DSA PRIVATE KEY-----/,
      /-----BEGIN EC PRIVATE KEY-----/,
      /-----BEGIN PRIVATE KEY-----/
    ];

    return privateKeyPatterns.some(pattern => pattern.test(key));
  }

  // Detectar tipo de clave privada
  detectKeyType(key) {
    if (key.includes('BEGIN OPENSSH PRIVATE KEY')) return 'OpenSSH';
    if (key.includes('BEGIN RSA PRIVATE KEY')) return 'RSA';
    if (key.includes('BEGIN DSA PRIVATE KEY')) return 'DSA';
    if (key.includes('BEGIN EC PRIVATE KEY')) return 'ECDSA';
    if (key.includes('BEGIN PRIVATE KEY')) return 'PKCS#8';
    return 'Unknown';
  }

  // Obtener sugerencias de configuración
  getConfigSuggestions(host) {
    const suggestions = {};

    // Sugerencias basadas en el host
    if (host.includes('github.com')) {
      suggestions.username = 'git';
      suggestions.port = 22;
      suggestions.description = 'GitHub SSH Access';
    } else if (host.includes('gitlab.com')) {
      suggestions.username = 'git';
      suggestions.port = 22;
      suggestions.description = 'GitLab SSH Access';
    } else if (host.includes('bitbucket.org')) {
      suggestions.username = 'git';
      suggestions.port = 22;
      suggestions.description = 'Bitbucket SSH Access';
    }

    return suggestions;
  }

  // Aplicar sugerencias automáticamente
  applySuggestions(host) {
    const suggestions = this.getConfigSuggestions(host);
    
    Object.entries(suggestions).forEach(([field, value]) => {
      const element = document.getElementById(`connection-${field}`);
      if (element && !element.value) {
        element.value = value;
      }
    });
  }
}

// Modal para gestión de carpetas
class FolderModal {
  constructor() {
    this.modal = document.getElementById('folder-modal');
    this.form = document.getElementById('folder-form');
    this.isEditing = false;
    this.currentFolder = null;

    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Botones de cierre
    document.querySelectorAll('.close-folder-modal').forEach(btn => {
      btn.addEventListener('click', () => this.hide());
    });

    // Cerrar al hacer clic fuera del modal
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });

    // Submit del formulario
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }

  show(folder = null) {
    this.isEditing = !!folder;
    this.currentFolder = folder;

    // Limpiar formulario
    this.form.reset();

    // Cargar datos si es edición
    if (folder) {
      document.getElementById('folder-name').value = folder.name;
      document.getElementById('folder-parent').value = folder.parentId || '';
    }

    // Actualizar lista de carpetas padre
    this.updateParentFoldersList();

    // Mostrar modal
    this.modal.classList.add('show');

    // Enfocar campo de nombre
    setTimeout(() => {
      document.getElementById('folder-name')?.focus();
    }, 100);
  }

  hide() {
    this.modal.classList.remove('show');
    this.form.reset();
    this.currentFolder = null;
    this.isEditing = false;
  }

  updateParentFoldersList() {
    const parentSelect = document.getElementById('folder-parent');
    if (!parentSelect || !window.connectionTree) return;

    // Limpiar opciones existentes
    parentSelect.innerHTML = '<option value="">Raíz</option>';

    // Agregar carpetas (excluyendo la carpeta actual si estamos editando)
    const folders = window.connectionTree.getFoldersList();
    folders.forEach(folder => {
      // No permitir seleccionar la misma carpeta como padre
      if (this.isEditing && folder.id === this.currentFolder.id) {
        return;
      }

      // No permitir seleccionar carpetas hijas como padre
      if (this.isEditing && window.connectionTree.isChildOf(folder.id, this.currentFolder.id)) {
        return;
      }

      const option = document.createElement('option');
      option.value = folder.id;
      option.textContent = folder.displayName;
      parentSelect.appendChild(option);
    });
  }

  async handleSubmit() {
    const name = document.getElementById('folder-name').value.trim();
    const parentId = document.getElementById('folder-parent').value || null;

    if (!name) {
      Utils.showNotification('El nombre de la carpeta es requerido', 'warning');
      return;
    }

    try {
      Utils.showLoading(this.isEditing ? 'Actualizando carpeta...' : 'Creando carpeta...');

      const folderData = {
        name,
        parentId
      };

      if (this.isEditing && this.currentFolder) {
        folderData.id = this.currentFolder.id;
      }

      let result;
      if (this.isEditing) {
        // Para edición, actualizar en la estructura del árbol
        window.connectionTree.folders[this.currentFolder.id] = {
          ...window.connectionTree.folders[this.currentFolder.id],
          ...folderData
        };
        await window.connectionTree.updateTreeStructure();
        result = { success: true };
      } else {
        result = await window.electronAPI.connections.createFolder(folderData);
      }

      if (result.success) {
        Utils.showNotification(
          this.isEditing ? 'Carpeta actualizada' : 'Carpeta creada',
          'success',
          2000
        );

        // Recargar el árbol de conexiones
        await window.connectionTree.loadConnections();

        // Cerrar modal
        this.hide();
      } else {
        throw new Error(result.error || 'Error guardando carpeta');
      }
    } catch (error) {
      console.error('Error guardando carpeta:', error);
      Utils.showNotification('Error guardando carpeta', 'error');
    } finally {
      Utils.hideLoading();
    }
  }
}

// Crear instancias globales
const connectionModal = new ConnectionModal();
const folderModal = new FolderModal();

window.connectionModal = connectionModal;
window.folderModal = folderModal;