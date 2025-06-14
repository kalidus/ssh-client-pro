# SSH Client Pro

Cliente SSH gráfico multiplataforma desarrollado con Electron y Node.js, con interfaz moderna basada en Material Design 3.

## 🚀 Características

### Terminal SSH Avanzado
- **Soporte completo de terminales**: ZSH, BASH, Fish, PowerShell
- **Codificación**: ANSI, Unicode, UTF-8
- **Características visuales**: Colores 256, iconos, fuentes personalizables
- **Enlaces web**: Detecta y hace clickeables los URLs en el terminal
- **Copiar/Pegar**: Soporte completo con atajos de teclado
- **Búsqueda**: Función de búsqueda en el contenido del terminal

### Gestor de Conexiones Inteligente
- **Organización jerárquica**: Carpetas y subcarpetas con drag & drop
- **Múltiples métodos de autenticación**: Contraseña y clave privada
- **Gestión segura**: Encriptación de contraseñas almacenadas
- **Importar/Exportar**: Backup y migración de conexiones
- **Búsqueda avanzada**: Filtrado rápido de conexiones

### Interfaz Moderna
- **Material Design 3**: Diseño moderno y intuitivo
- **Temas**: Automático (sistema), claro y oscuro
- **Responsive**: Adaptable a diferentes tamaños de pantalla
- **Pestañas**: Múltiples conexiones SSH simultáneas
- **Sidebar redimensionable**: Espacio de trabajo personalizable

### Multiplataforma
- **Windows**: Soporte completo con instalador NSIS
- **macOS**: Aplicación nativa con firma de código
- **Linux**: AppImage para distribución universal

## 📦 Instalación

### Requisitos del Sistema
- Node.js 18 o superior
- npm 8 o superior
- Python 3.x (para node-pty)

### Instalación desde Código Fuente

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/ssh-client-pro.git
cd ssh-client-pro
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Ejecutar en modo desarrollo**
```bash
npm run dev
```

4. **Construir para producción**
```bash
# Para todas las plataformas
npm run build

# Para plataforma específica
npm run build-win    # Windows
npm run build-mac    # macOS
npm run build-linux  # Linux
```

## 🖥️ Uso

### Gestión de Conexiones

1. **Crear Nueva Conexión**
   - Clic en el botón "+" en la barra lateral
   - Completar formulario con datos del servidor
   - Elegir método de autenticación
   - Opcional: Organizar en carpetas

2. **Conectar a Servidor**
   - Doble clic en la conexión deseada
   - La conexión se abre en una nueva pestaña
   - El terminal se conecta automáticamente

3. **Gestionar Carpetas**
   - Crear carpetas para organizar conexiones
   - Arrastrar y soltar para reorganizar
   - Funciones de edición y eliminación

### Atajos de Teclado

| Función | Windows/Linux | macOS |
|---------|---------------|-------|
| Nueva conexión | `Ctrl+N` | `Cmd+N` |
| Nueva carpeta | `Ctrl+Shift+N` | `Cmd+Shift+N` |
| Nueva pestaña | `Ctrl+T` | `Cmd+T` |
| Cerrar pestaña | `Ctrl+W` | `Cmd+W` |
| Buscar conexiones | `Ctrl+F` | `Cmd+F` |
| Limpiar terminal | `Ctrl+K` | `Cmd+K` |

### Terminal

- **Copiar**: `Ctrl+C` (con texto seleccionado)
- **Pegar**: `Ctrl+V`
- **Seleccionar todo**: `Ctrl+A`
- **Buscar**: `Ctrl+F`
- **Zoom**: `Ctrl++` / `Ctrl+-`

## 🔧 Configuración

### Configuraciones del Terminal
- **Fuente**: Personalizable (recomendado: Fira Code)
- **Tamaño de fuente**: Ajustable desde 8px hasta 24px
- **Tema de colores**: Múltiples esquemas disponibles
- **Cursor**: Diferentes estilos (bloque, línea, barra)

### Configuraciones de Conexión
- **Timeout**: Tiempo de espera para conexiones
- **Keep-alive**: Mantener conexiones activas
- **Auto-reconectar**: Reconexión automática en pérdida de conexión
- **Codificación**: UTF-8, ASCII, Latin-1

### Seguridad
- **Encriptación**: Contraseñas almacenadas de forma segura
- **Validación**: Verificación de hosts y certificados
- **Logs**: Registro de actividad (opcional)

## 🏗️ Arquitectura

### Estructura del Proyecto
```
ssh-client-pro/
├── src/
│   ├── main/           # Proceso principal de Electron
│   │   ├── main.js
│   │   ├── ssh-manager.js
│   │   ├── connection-manager.js
│   │   └── preload.js
│   ├── renderer/       # Interfaz de usuario
│   │   ├── index.html
│   │   ├── css/
│   │   └── js/
│   └── assets/         # Recursos estáticos
├── package.json
└── README.md
```

### Tecnologías Utilizadas

#### Backend (Electron Main)
- **Electron**: Framework de aplicaciones de escritorio
- **Node.js**: Runtime de JavaScript
- **SSH2**: Cliente SSH para Node.js
- **node-pty**: Emulador de terminal
- **electron-store**: Almacenamiento de configuraciones

#### Frontend (Renderer)
- **Material Design 3**: Sistema de diseño
- **XTerm.js**: Emulador de terminal web
- **Dragula**: Drag & drop
- **CSS Grid/Flexbox**: Layout responsive

## 🔒 Seguridad

### Medidas Implementadas
- **Aislamiento de contexto**: Separación entre procesos
- **Validación de entrada**: Sanitización de todos los inputs
- **Encriptación local**: Contraseñas cifradas en storage
- **Comunicación segura**: IPC entre procesos principal y renderer

### Buenas Prácticas
- No almacenar credenciales en texto plano
- Validación de certificados SSH
- Timeout automático de sesiones inactivas
- Logs de seguridad opcionales

## 🧪 Testing

```bash
# Ejecutar tests unitarios
npm test

# Tests de integración
npm run test:integration

# Tests e2e
npm run test:e2e

# Coverage
npm run test:coverage
```

## 📝 Contributing

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

### Estándares de Código
- **ESLint**: Linting de JavaScript
- **Prettier**: Formateo de código
- **Conventional Commits**: Formato de mensajes de commit

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🐛 Reportar Problemas

Si encuentras bugs o tienes sugerencias:

1. Verificar que no exista un issue similar
2. Crear nuevo issue con información detallada:
   - Versión del SO
   - Versión de la aplicación
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Screenshots si aplica

## 🚗 Roadmap

### v1.1.0
- [ ] Soporte para túneles SSH
- [ ] Transferencia de archivos (SFTP)
- [ ] Sincronización en la nube
- [ ] Perfiles de configuración

### v1.2.0
- [ ] Terminal dividido (split)
- [ ] Macros y scripts
- [ ] Grabación de sesiones
- [ ] Soporte para protocolos adicionales (Telnet, Mosh)

### v1.3.0
- [ ] Colaboración en tiempo real
- [ ] Integración con servicios de nube
- [ ] API REST para automatización
- [ ] Plugins y extensiones

## 🤝 Agradecimientos

- [Electron](https://electronjs.org/) - Framework de aplicaciones
- [XTerm.js](https://xtermjs.org/) - Emulador de terminal
- [Material Design](https://m3.material.io/) - Sistema de diseño
- [SSH2](https://github.com/mscdex/ssh2) - Cliente SSH para Node.js

---

**SSH Client Pro** - Desarrollado con ❤️ para la comunidad de desarrolladores