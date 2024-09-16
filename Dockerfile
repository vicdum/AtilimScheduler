# 1. Resmi Node.js imajını kullanıyoruz
FROM node:18

# 2. Çalışma dizinini ayarla
WORKDIR /usr/src/app

# 3. Uygulama bağımlılıklarını yüklemek için package.json ve package-lock.json'ı kopyala
COPY package*.json ./

# 4. Bağımlılıkları yükle
# RUN npm install

# Eğer production ortamı ise, devDependencies'i yüklememek için aşağıdaki komutu kullanabilirsin
RUN npm ci --only=production

# 5. Uygulama dosyalarını kopyala
COPY . .

# 6. Eğer portları expose etmek istersen
EXPOSE 3000

# 7. Uygulamanın çalıştırılması
CMD [ "node", "app.js" ]
