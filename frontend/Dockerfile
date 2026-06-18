FROM node:20-alpine AS build

WORKDIR /app

# Принимаем аргумент сборки (его передадим из пайплайна)
ARG REACT_APP_API_URL=http://localhost:8000/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package*.json ./
RUN npm install

COPY . .
# Собираем production-билд React
RUN npm run build

# --- Второй этап: отдаем через Nginx (правильный production-способ) ---
FROM nginx:alpine
# Копируем собранные файлы в папку, откуда Nginx их отдает
COPY --from=build /app/build /usr/share/nginx/html
# Копируем конфиг Nginx (создадим ниже)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
