FROM node:22-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:stable-alpine as production-stage
# Install curl for health check
RUN apk add --no-cache curl
# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
# Copy built frontend files
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 