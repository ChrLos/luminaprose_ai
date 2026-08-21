# To Deploy React to Github Page
1. Install gh-pages
```bash
npm install gh-pages --save-dev
```
2. Push code to Github
3. Edit `package.json` and `vite.config.ts`
```json
  "homepage": "https://{GITHUB_USERNAME}.github.io/{REPO_NAME}",
  ...
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist",
...
```
```typescript
  ...
  return {
    base: '/{REPO_NAME}',
  ...
```
4. Run the following command to publish/deploy the to Github Page
```bash
npm run deploy
```