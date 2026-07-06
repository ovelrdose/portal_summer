# Этап 1: Сборка React приложения
FROM node:20-alpine AS build

WORKDIR /app

# Принимаем URL API как build-arg
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Этап 2: Production с Nginx
FROM nginx:alpine

# Копируем собранный React в папку Nginx
COPY --from=build /app/build /usr/share/nginx/html

# Копируем конфиг Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]