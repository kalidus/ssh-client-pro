// Utilidades generales para la aplicación
class Utils {
  // Generar UUID v4
  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Escapar HTML
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Formatear fecha
  static formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} día${days > 1 ? 's' : ''} atrás`;
    if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
    if (minutes > 0) return `${minutes} minuto${minutes > 1 ? 's' : ''} atrás`;
    return 'Ahora mismo';
  }

  // Validar dirección IP
  static isValidIP(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  // Validar hostname
  static isValidHostname(hostname) {
    const hostnameRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(?:\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;
    return hostnameRegex.test(hostname);
  }

  // Validar puerto
  static isValidPort(port) {
    const portNum = parseInt(port, 10);
    return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
  }

  // Debounce function
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle function
  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Deep clone object
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));
    if (typeof obj === 'object') {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = Utils.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }

  // Mostrar notificación
  static showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notifications');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = this.getNotificationIcon(type);
    notification.innerHTML = `
      <span class="material-symbols-outlined">${icon}</span>
      <div class="notification-content">
        <p>${Utils.escapeHtml(message)}</p>
      </div>
      <button class="btn-icon notification-close" onclick="this.parentElement.remove()">
        <span class="material-symbols-outlined">close</span>
      </button>
    `;

    container.appendChild(notification);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentElement) {
          notification.style.animation = 'slideOut 0.3s ease-in-out forwards';
          setTimeout(() => notification.remove(), 300);
        }
      }, duration);
    }

    return notification;
  }

  static getNotificationIcon(type) {
    const icons = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };
    return icons[type] || 'info';
  }

  // Mostrar loading overlay
  static showLoading(message = 'Cargando...') {
    const overlay = document.getElementById('loading-overlay');
    const messageElement = document.getElementById('loading-message');
    
    if (overlay && messageElement) {
      messageElement.textContent = message;
      overlay.classList.remove('hidden');
    }
  }

  // Ocultar loading overlay
  static hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  // Confirmar acción
  static async confirm(message, title = 'Confirmar') {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal confirm-modal show';
      modal.innerHTML = `
        <div class="modal-content small">
          <div class="modal-header">
            <h2>${Utils.escapeHtml(title)}</h2>
          </div>
          <div class="modal-body" style="padding: 24px;">
            <p style="margin: 0; color: var(--md-on-surface-variant);">${Utils.escapeHtml(message)}</p>
          </div>
          <div class="form-actions" style="padding: 0 24px 24px;">
            <button class="btn-outline cancel-btn">Cancelar</button>
            <button class="btn-primary confirm-btn">Confirmar</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const cleanup = () => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
      };

      modal.querySelector('.cancel-btn').onclick = () => {
        cleanup();
        resolve(false);
      };

      modal.querySelector('.confirm-btn').onclick = () => {
        cleanup();
        resolve(true);
      };

      modal.onclick = (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(false);
        }
      };
    });
  }

  // Formatear bytes
  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Detectar OS
  static getOS() {
    const platform = window.electronAPI.platform;
    switch (platform) {
      case 'darwin': return 'macOS';
      case 'win32': return 'Windows';
      case 'linux': return 'Linux';
      default: return 'Unknown';
    }
  }

  // Copiar al portapapeles
  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      Utils.showNotification('Copiado al portapapeles', 'success', 2000);
      return true;
    } catch (err) {
      console.error('Error copiando al portapapeles:', err);
      Utils.showNotification('Error al copiar', 'error', 3000);
      return false;
    }
  }

  // Validar formulario
  static validateForm(formElement) {
    const errors = [];
    const inputs = formElement.querySelectorAll('input[required], textarea[required], select[required]');
    
    inputs.forEach(input => {
      if (!input.value.trim()) {
        errors.push(`${input.labels[0]?.textContent || input.placeholder} es requerido`);
        input.classList.add('error');
      } else {
        input.classList.remove('error');
      }

      // Validaciones específicas
      if (input.type === 'email' && input.value && !this.isValidEmail(input.value)) {
        errors.push('Email inválido');
        input.classList.add('error');
      }

      if (input.name === 'host' && input.value && !this.isValidIP(input.value) && !this.isValidHostname(input.value)) {
        errors.push('Host o IP inválida');
        input.classList.add('error');
      }

      if (input.name === 'port' && input.value && !this.isValidPort(input.value)) {
        errors.push('Puerto inválido (1-65535)');
        input.classList.add('error');
      }
    });

    return errors;
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Buscar en texto
  static highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // Sanitizar filename
  static sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  }

  // Generar color desde string
  static stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  // Detectar shell desde prompt
  static detectShell(prompt) {
    if (prompt.includes('$')) return 'bash';
    if (prompt.includes('%')) return 'zsh';
    if (prompt.includes('>')) return 'fish';
    if (prompt.includes('PS1')) return 'powershell';
    return 'unknown';
  }

  // Parsear URL de conexión SSH
  static parseSSHUrl(url) {
    const regex = /^ssh:\/\/(?:([^@]+)@)?([^:]+)(?::(\d+))?$/;
    const match = url.match(regex);
    
    if (match) {
      return {
        username: match[1] || '',
        host: match[2],
        port: parseInt(match[3]) || 22
      };
    }
    return null;
  }

  // Generar nombre de conexión automático
  static generateConnectionName(host, username) {
    const hostShort = host.split('.')[0];
    return `${username}@${hostShort}`;
  }

  // Manejar errores de conexión SSH
  static getSSHErrorMessage(error) {
    const errorMessages = {
      'ENOTFOUND': 'Host no encontrado',
      'ECONNREFUSED': 'Conexión rechazada',
      'ETIMEDOUT': 'Tiempo de conexión agotado',
      'ECONNRESET': 'Conexión reiniciada',
      'Authentication failed': 'Autenticación fallida',
      'All configured authentication methods failed': 'Todas las autenticaciones fallaron'
    };

    for (const [key, message] of Object.entries(errorMessages)) {
      if (error.toString().includes(key)) {
        return message;
      }
    }

    return 'Error de conexión desconocido';
  }

  // Storage helpers
  static saveToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('Error guardando en storage:', err);
      return false;
    }
  }

  static loadFromStorage(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (err) {
      console.error('Error cargando desde storage:', err);
      return defaultValue;
    }
  }

  // Keyboard shortcuts handler
  static handleKeyboardShortcuts(event) {
    const { ctrlKey, metaKey, key, shiftKey } = event;
    const isCtrlOrCmd = ctrlKey || metaKey;

    if (isCtrlOrCmd) {
      switch (key.toLowerCase()) {
        case 'n':
          if (shiftKey) {
            // Ctrl/Cmd + Shift + N: Nueva carpeta
            event.preventDefault();
            document.getElementById('btn-new-folder')?.click();
          } else {
            // Ctrl/Cmd + N: Nueva conexión
            event.preventDefault();
            document.getElementById('btn-new-connection')?.click();
          }
          break;
        case 't':
          // Ctrl/Cmd + T: Nueva pestaña
          event.preventDefault();
          document.getElementById('btn-new-tab')?.click();
          break;
        case 'w':
          // Ctrl/Cmd + W: Cerrar pestaña
          event.preventDefault();
          // Implementar cierre de pestaña actual
          break;
        case 'f':
          // Ctrl/Cmd + F: Buscar
          event.preventDefault();
          document.getElementById('search-connections')?.focus();
          break;
      }
    }
  }

  // Inicializar utilidades
  static init() {
    // Agregar event listener para shortcuts
    document.addEventListener('keydown', this.handleKeyboardShortcuts);

    // Agregar estilos para errores de validación
    const style = document.createElement('style');
    style.textContent = `
      .error {
        border-color: var(--md-error) !important;
        box-shadow: 0 0 0 2px rgba(186, 26, 26, 0.2) !important;
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Utils.init());
} else {
  Utils.init();
}

// Exportar para uso global
window.Utils = Utils;