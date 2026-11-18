# 发布指南

这是一个**纯静态站**：没有数据库、没有后端、没有 API。构建产物是 `dist/`，任何静态托管都能跑。

```bash
pnpm install
pnpm build      # -> dist/
```

## 关键：必须有 SPA fallback

这是单页应用（React Router）。如果不配置回退，直接访问 `/about` 或刷新 `/architecture/alumni-hall` 会 **404**。

仓库里已经放好三份配置，选一条路即可：

| 平台 | 已包含的配置 | 说明 |
|---|---|---|
| Vercel | `vercel.json` | 全量重写到 index.html |
| Netlify | `netlify.toml` + `public/_redirects` | 同上 |
| Cloudflare Pages | `public/_redirects` | 同上 |
| 自己的服务器 | 见下方 nginx | 需要手写 try_files |

## 推荐：Vercel（最快）

1. 把项目推到 GitHub（**注意**：现在还没建仓库；`node_modules` 和 `dist` 不要提交）
2. vercel.com → New Project → 选这个仓库
3. Framework 会自动识别为 Vite；Build Command `pnpm build`，Output `dist`
4. Deploy → 拿到 `xxx.vercel.app`
5. Settings → Domains 绑定你的域名（自动 HTTPS）

## 备选：Netlify

1. 拖拽 `dist/` 到 app.netlify.com/drop 就能先看效果
2. 正式发布：连 GitHub 仓库，build `pnpm build`，publish `dist`（`netlify.toml` 已写好）

## 备选：自建服务器（nginx）

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /var/www/personal-world/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;   # SPA 回退
  }

  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  location /content/ {
    expires 30d;
    add_header Cache-Control "public";
  }
}
```

上传方式：`pnpm build` 后把 `dist/` 整个传上去（约 11 MB，主要是 `dist/content/` 的图片）。

## 发布前必须改的 3 处

1. **域名占位符 `https://example.com`** —— 出现在：
   - `index.html` 的 `<link rel="canonical">`
   - `public/robots.txt` 的 Sitemap 行
   - `public/sitemap.xml` 的所有 `<loc>`
2. **Travel 内容** —— 4 张照片还没有地点/年份
3. **Instagram** —— 还没链接

## 发布后自检

```text
□ 打开首页，入场动画播放一次；刷新不再播放（localStorage 记住了）
□ 点 About 机关 → 走进 About 门 → 转场后到 /about
□ 直接访问 /architecture/alumni-hall，刷新不 404
□ 点开图片能放大，Esc 关闭
□ 手机打开首页，世界能取景、机关能点（内容页未做移动端适配）
□ 分享链接到微信/推特，卡片显示标题 + og-image.jpg
```

## 不需要做的事

- 不需要服务器端渲染（SEO 需求很低，且正文都在静态 HTML 的数据里）
- 不需要数据库
- 不需要 CDN 配置（Vercel/Netlify 自带）
- Research 的 KG 平台是**另一个独立项目**，不随本站发布；它要上线就单独部署，然后把链接填进 `src/content/projects.ts`
