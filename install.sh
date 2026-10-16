#!/usr/bin/env bash
# daoyan-cli 一键安装脚本 —— 直接从 GitHub 安装，不经过 npm registry。
#
# 用法：
#   curl -fsSL https://raw.githubusercontent.com/yuanbaobaoo/daoyan-cli/master/install.sh | bash
#
# 指定版本（git tag / 分支 / commit）：
#   DAYOAN_REF=v0.1.0 curl -fsSL .../install.sh | bash
#
# 原理：npm install -g git+https://github.com/yuanbaobaoo/daoyan-cli.git
#       （dist 产物随仓库分发，安装即用，无需在用户机上构建）。
# 要求：node >= 22、npm、git。
set -euo pipefail

REPO="https://github.com/yuanbaobaoo/daoyan-cli.git"
REF="${DAYOAN_REF:-master}"
NVM_INSTALL='curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash && \. "$HOME/.nvm/nvm.sh" && nvm install 22'

say() { printf '%s\n' "$*"; }
die() { printf '\033[31mERROR\033[0m: %s\n' "$*" >&2; exit 1; }

command -v node >/dev/null 2>&1 \
  || die "未找到 node（要求 >= 22）。安装 Node 22 LTS：${NVM_INSTALL}"

node_v="$(node -p 'process.versions.node')"
node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$node_major" -lt 22 ]; then
  die "node 版本过低（当前 v${node_v}，要求 >= 22）。升级：${NVM_INSTALL}"
fi

command -v npm >/dev/null 2>&1 || die "未找到 npm（它随 Node 一同安装，请检查 Node 安装）"
command -v git >/dev/null 2>&1 || die "未找到 git（从 GitHub 安装需要它）：https://git-scm.com/downloads"

say "==> 安装 daoyan-cli@${REF}（来自 GitHub）"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

say "    1/2 拉取并打包源码"
tgz="$(cd "$tmpdir" && npm pack --silent "git+${REPO}#${REF}")" \
  || die "npm pack 失败：检查网络与 GitHub 可达性（git 必须已安装）"

say "    2/2 全局安装 ${tgz}"
if ! npm install -g "$tmpdir/$tgz"; then
  die "npm 安装失败。若是 EACCES 权限错误，推荐用 nvm（免 sudo），或：npm config set prefix ~/.npm-global 并把 ~/.npm-global/bin 加入 PATH 后重试"
fi

command -v dycli >/dev/null 2>&1 \
  || die "安装完成，但 npm 全局 bin 目录不在 PATH。查看：npm prefix -g，其下 bin/ 子目录需加入 PATH"

say "==> 完成：$(dycli --version)"
say "    上手：daoyan --help（短命令 dycli 等价）"
say "    Agent 自描述：daoyan help --json"
