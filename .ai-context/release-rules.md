# 发版规则（daoyan-cli）

> 本项目以 **GitHub 为唯一分发通道**：用户经 Release 的 `install.sh` / `latest.json` 安装，
> `daoyan update` 默认读取 Release 的 `latest.json` 自升级（不可达时回退 GitHub tags）。
> **不发布到 npm registry**；npm 仅作为安装器使用。
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

1. `npm ci` → `npm run format:check` → `npm run typecheck` → `npm run build`
2. **dist 一致性校验**（与源码 diff，不一致失败）
3. `npm pack` 打包 tgz
4. 生成 `latest.json` 与 `SHA256SUMS`
5. 创建 GitHub Release（自动生成 release notes，附 tgz + `latest.json` + `SHA256SUMS` + `install.sh`）

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

## 6. 自定义更新源与代理

`update` 默认读取 Release 的 `latest.json`；用户可持久化或一次性换源（用户级配置 `~/.dycli/update.json`，0600）：

```bash
daoyan update source https://mirror.example.com/daoyan/latest.json
daoyan update source ./latest.json          # 本地镜像目录
daoyan update source --unset                # 恢复默认 Release 清单
daoyan update proxy http://127.0.0.1:7890  # http/https/socks5/socks5h
daoyan update proxy --unset
```

一次性参数：

```bash
daoyan update --check --manifest <url|路径>
daoyan update --manifest <url|路径>
daoyan update --from <tgz路径|URL> --sha256 <hex>
daoyan update --proxy <url>
daoyan update --github-proxy <url[,url]|none>
```

直连 GitHub 失败时，`update` 默认尝试内置加速源（`https://gh-proxy.com`、`https://gh.llkk.cc`），仅作用于 `github.com` URL；清单需多个加速源一致，tgz 始终校验 SHA-256。已配置 HTTP 代理时不默认叠加加速源；`--github-proxy none` / `DYCLI_UPDATE_GITHUB_PROXY=none` 关闭。

优先级：CLI > `DYCLI_UPDATE_*` 环境变量 > `~/.dycli/update.json` > 默认 Release `latest.json`（不可达时回退 GitHub tags）。
环境变量：`DYCLI_UPDATE_MANIFEST` / `DYCLI_UPDATE_FROM` / `DYCLI_UPDATE_SHA256` / `DYCLI_UPDATE_PROXY` / `DYCLI_UPDATE_GITHUB_PROXY`。
未配置 dycli 代理时也兼容标准 `HTTPS_PROXY` / `ALL_PROXY`。

`latest.json`：

```json
{
  "schema_version": 1,
  "version": "0.0.4",
  "tag": "v0.0.4",
  "tgz": "daoyan-cli-0.0.4.tgz",
  "sha256": "<64 hex>"
}
```

- `tgz` 可为相对 manifest 的文件名/路径，或 http(s) URL；
- 远程 tgz 必须有 `sha256`；本地 tgz 可省略；
- 配置代理时下载走 `curl`（Node fetch 默认不读代理环境变量），缺少 curl 会报 `external_tool_missing`；
- `install.sh` 同样支持 `DAYOAN_MANIFEST_URL` / `DAYOAN_TGZ_URL` / `DAYOAN_SHA256` / `DAYOAN_REPO` / `DAYOAN_REF` / `DAYOAN_PROXY`。

镜像只需同步 Release 的 `daoyan-cli-*.tgz`、`latest.json`、`SHA256SUMS` 三个文件。

## 7. 回滚与修复

- 用户侧回滚：`DAYOAN_REF=vX.Y.Z-1 curl -fsSL …/install.sh | bash` 固定旧版本
- 发了坏版本：修复 → 按流程升 patch 发新版；**不要**试图覆盖已发布版本
- CI 失败：查看 Actions 日志；dist 不一致 → 本地重新 build 提交后重新打 tag（换版本号）
