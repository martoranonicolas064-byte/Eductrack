# 🚀 Despliegue de EducTrack en Render con tus Credenciales de TiDB Cloud

¡Tu base de datos en **TiDB Cloud ya está 100% conectada, configurada y con todas las tablas creadas**!

---

## ✅ Estado de tu Base de Datos en TiDB Cloud
- **Host:** `gateway01.sa-east-1.prod.aws.tidbcloud.com`
- **Puerto:** `4000`
- **Usuario:** `2d3osCZG9bBQUe4.root`
- **Base de Datos:** `eductrack_db` (Creada exitosamente)
- **Tablas Creadas y Listas:**
  - `administrador`
  - `profesor`
  - `curso`
  - `materia`
  - `asignacion`
  - `alumno`
  - `nota`
  - `asistencia`
  - `recordatorio`
  - `archivo`

---

## 🌐 Pasos para Subir y Desplegar en Render

### Paso 1: Subir tu Proyecto a GitHub
1. Si aún no lo has subido, sube esta carpeta a tu repositorio de GitHub:
   ```bash
   git init
   git add .
   git commit -m "Preparado para TiDB Cloud y Render"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```

---

### Paso 2: Crear el Web Service en Render
1. Entra a [https://dashboard.render.com](https://dashboard.render.com).
2. Haz clic en el botón azul **"New +"** (arriba a la derecha) y elige **"Web Service"**.
3. Conecta y selecciona tu repositorio de GitHub de EducTrack.
4. Rellena los siguientes campos:
   - **Name:** `eductrack` (o el nombre que prefieras).
   - **Region:** `Frankfurt` o `Ohio (US East)` (o la más cercana).
   - **Branch:** `main`
   - **Root Directory:** Déjalo en blanco (o escribe `.`).
   - **Runtime:** `Node`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`

---

### Paso 3: Cargar las Variables de Entorno en Render
En la misma pantalla, baja hasta la sección **"Environment Variables"** y agrega estas variables exactas (copia y pega):

| Key (Nombre de Variable) | Value (Valor Exacto) |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `JWT_SECRET` | `eductrack_jwt_secreto_super_seguro_2026` |
| `DB_HOST` | `gateway01.sa-east-1.prod.aws.tidbcloud.com` |
| `DB_PORT` | `4000` |
| `DB_USER` | `2d3osCZG9bBQUe4.root` |
| `DB_PASSWORD` | `4KKCUtFIGyoKkOCk` |
| `DB_NAME` | `eductrack_db` |
| `DB_SSL` | `true` |

*(O si prefieres usar Connection String única, puedes usar: `DATABASE_URL` con valor `mysql://2d3osCZG9bBQUe4.root:4KKCUtFIGyoKkOCk@gateway01.sa-east-1.prod.aws.tidbcloud.com:4000/eductrack_db?ssl={"rejectUnauthorized":true}`)*

---

### Paso 4: Desplegar
1. Haz clic en el botón **"Deploy Web Service"** al final de la página.
2. Espera 1 o 2 minutos mientras Render instala las dependencias e inicia el servidor.
3. ¡Listo! Render te dará una URL pública tipo:
   `https://eductrack-xxxx.onrender.com`

---

## 🔑 Usuarios y Contraseñas de Prueba Disponibles

Tu clúster de TiDB Cloud ya tiene cargados estos usuarios:

| Rol | Usuario | Contraseña | Enlace en tu App |
| :--- | :--- | :--- | :--- |
| **Profesor** | `profesor` | `123456` | `/login/docente.html` (Portada) |
| **Profesor 2** | `profesor1` | `123456` | `/login/docente.html` |
| **Alumno** | `alumno1` | `123456` | `/login/estudiantes.html` |
| **Alumno 2** | `lucas_fernandez` | `123456` | `/login/estudiantes.html` |
| **Administrador** | `admin` | `admin123` | `/admin-login.html` |

---

## 🔍 Comprobar la Conexión Activa
Para comprobar que Render y TiDB Cloud están comunicándose en vivo, puedes entrar a:
`https://tu-app-de-render.onrender.com/test-db`

Verás la respuesta JSON:
```json
{
  "ok": true,
  "mensaje": "TiDB Cloud conectado correctamente",
  "motor": "TiDB Cloud",
  "baseDeDatos": "eductrack_db"
}
```
