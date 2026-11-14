# --- Étape 1 : compilation du front (Node) ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# true = front autonome avec fausse API ; false = appelle le vrai backend via /api
ARG VITE_USE_MOCK=false
ARG VITE_SHOW_DEMO_ACCOUNTS=false
ENV VITE_USE_MOCK=$VITE_USE_MOCK VITE_SHOW_DEMO_ACCOUNTS=$VITE_SHOW_DEMO_ACCOUNTS
RUN npm run build

# --- Étape 2 : service des fichiers statiques + relais /api vers le backend (nginx) ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
