FROM node:20

# Definir el directorio de trabajo
WORKDIR /app

# Copiar solo los archivos de dependencias para aprovechar la caché
COPY package*.json tsconfig.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos
COPY . .

# Compilar TypeScript
RUN npm run build

# Comando de inicio
CMD ["node", "dist/index.js"]