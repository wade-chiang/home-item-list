# syntax=docker/dockerfile:1.6
# ADD --checksum 需要 Dockerfile 語法 1.6 以上

# ---- 第一階段：建置前端 ----
FROM node:24.21-alpine3.23 AS web
WORKDIR /app
# pnpm 版本由 package.json 的 packageManager 欄位固定，與本機一致
RUN corepack enable
# 先只複製依賴清單：原始碼改動時可沿用已安裝依賴的 layer 快取
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---- 第二階段：PocketBase ----
# 參考官方範例 https://pocketbase.io/docs/going-to-production/ ；版本 pin 死（CLAUDE.md 紀律 3）
FROM alpine:3.24.1
ARG PB_VERSION=0.40.4
RUN apk add --no-cache unzip ca-certificates
# checksum 取自 v0.40.4 release 的 checksums.txt。升級 PB_VERSION 時必須一起更換，否則 build 會失敗
ADD --checksum=sha256:9042ec818570e79c3628dadcd0a756c1496d9e1173918ec409d133c02f82e5fa \
    https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && rm /tmp/pb.zip
COPY --from=web /app/dist /pb/pb_public
EXPOSE 8090
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
