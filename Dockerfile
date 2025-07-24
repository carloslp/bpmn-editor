# --- Etapa de Construcción (Builder) ---
# Usa una imagen oficial de Node.js como base.
# La etiqueta 'alpine' se refiere a una versión ligera de la imagen.
FROM node:20-alpine as builder

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de definición de dependencias
COPY package.json ./
# Si tuvieras un package-lock.json, también lo copiarías para builds más consistentes
# COPY package-lock.json ./

# Instala las dependencias del proyecto
RUN npm install

# Copia el resto de los archivos de tu aplicación al directorio de trabajo
COPY . .

# Ejecuta el script de construcción para generar los archivos estáticos de producción
RUN npm run build

# --- Etapa de Producción (Production) ---
# Usa una imagen oficial y ligera de Nginx para servir el contenido
FROM nginx:stable-alpine

# Copia el archivo de configuración personalizado de Nginx que crearemos
# Este archivo es crucial para que las rutas de React Router funcionen
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia los archivos estáticos generados en la etapa de construcción
# El directorio de salida de Vite es 'dist' por defecto
COPY --from=builder /app/dist /usr/share/nginx/html

# Expone el puerto 80, que es el puerto por defecto de Nginx
EXPOSE 80

# Comando para iniciar Nginx en primer plano cuando el contenedor se inicie
CMD ["nginx", "-g", "daemon off;"]
