# 发版规则（daoyan-cli）

> 本项目以 **GitHub 为唯一分发通道**：用户经 `install.sh` / `npm i -g git+…` 从 GitHub 安装，
> `daoyan update` 检测 GitHub tags 自升级。**不发布到 npm registry**；npm 仅作为安装器使用。
> 本文是发版的唯一操作依据，AI 代理发版前必须逐条核对。

## 1. 版本号管理（双处同步，缺一不可）

版本号存在于两处，**必须同时修改**（当前无构建注入机制）：

1. `package.json` 的 `version`
2. `src/shared/version.mts` 的 `VERSION`（`--version` / `help --json` / update 检测都用它）

版本格式：`X.Y.Z`（semver）。0.x 阶段约定：minor = 新功能，patch = 修复。
tag 格式：`v` + 版本号，如 `v0.2.0`——**必须是这个格式**，`update` 命令只识别 `vX.Y.Z`。

## 2. dist 随仓库分发（强制）

`dist/` 产物提交进仓库（.gitignore 已放行），用户机器上**零构建**安装。
因此每次发版前必须重新构建并提交：

```bash
npm run typecheck && npm run build
```

CI 在发版时会执行 `git diff --exit-code dist/` 校验 dist 与源码一致，
**不一致直接失败**——这是防止"改了源码忘了构建"的硬闸门。

## 3. 标准发版流程

```bash
# 1. 确认要发布的改动已全部提交（工作区干净）
git status

# 2. 同步修改两处版本号（package.json + src/shared/version.mts）

# 3. 重新构建并提交 dist
npm run typecheck && npm run build
git add -A && git commit -m "release: vX.Y.Z"

# 4. 打 tag 并推送（CI 由 tag 触发）
git tag vX.Y.Z
git push origin master vX.Y.Z
```

## 4. CI 自动发版（.github/workflows/release.yml）

推送 `v*` tag 后 GitHub Actions 自动执行：

1. `npm ci` → `npm run typecheck` → `npm run build`
2. **dist 一致性校验**（与源码 diff，不一致失败）
3. `npm pack` 打包 tgz
4. 创建 GitHub Release（自动生成 release notes，附 `daoyan-cli-*.tgz` 产物）

不再执行 `npm publish`；npm registry 不是发布通道。

发版后验证（人工或代理执行）：

```bash
daoyan update --check          # 应显示"有新版本 vX.Y.Z"
daoyan update                  # 升级后 --version 应等于新版本
```

## 5. 不可违反的规则

- **版本不可变**：同一版本号永不重发；发错了就修完升 patch。
- **tag 不可复用/修改**：tag 推送后不允许 delete + 重打同版本。
- **不许跳过 dist 校验**：即使本地验证过，CI 的 dist 一致性检查失败必须回根源码修复，禁止手改 dist 糊弄通过。
- **唯一发布通道**：GitHub Release；不执行 `npm publish`，不发布到 npm registry。

## 6. 回滚与修复

- 用户侧回滚：`DAYOAN_REF=vX.Y.Z-1 curl -fsSL …/install.sh | bash` 固定旧版本
- 发了坏版本：修复 → 按流程升 patch 发新版；**不要**试图覆盖已发布版本
- CI 失败：查看 Actions 日志；dist 不一致 → 本地重新 build 提交后重新打 tag（换版本号）
