#!/usr/bin/env bash
# daoyan-cli 一键安装脚本 —— 默认从 GitHub 安装，也支持自建镜像 / 离线 tgz / 代理。
#
# 用法：
#   curl -fsSL https://raw.githubusercontent.com/yuanbaobaoo/daoyan-cli/master/install.sh | bash
#
# 可选环境变量：
#   DAYOAN_REF=v0.0.4                  git tag / 分支 / commit（默认 master）
#   DAYOAN_REPO=<git url>              自建 git 镜像（默认 GitHub）
#   DAYOAN_MANIFEST_URL=<url|路径>     从 latest.json 安装（优先于 git）
#   DAYOAN_TGZ_URL=<url|路径>          直接安装指定 tgz（优先于 manifest）
#   DAYOAN_SHA256=<hex>                校验 tgz（远程 tgz 必填；manifest 内已有 sha256）
#   DAYOAN_PROXY=<url>                 下载/安装代理（http/https/socks5）
#
# 原理：dist 产物随仓库分发，安装即用，无需在用户机上构建。
# 要求：node >= 22、npm；git 仅在使用默认 git 源时需要。
set -euo pipefail

REPO="${DAYOAN_REPO:-https://github.com/yuanbaobaoo/daoyan-cli.git}"
REF="${DAYOAN_REF:-master}"
MANIFEST_URL="${DAYOAN_MANIFEST_URL:-}"
TGZ_URL="${DAYOAN_TGZ_URL:-}"
EXPECTED_SHA="${DAYOAN_SHA256:-}"
PROXY="${DAYOAN_PROXY:-}"
NVM_INSTALL='curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash && \. "$HOME/.nvm/nvm.sh" && nvm install 22'

say() { printf '%s\n' "$*"; }
die() { printf '\033[31mERROR\033[0m: %s\n' "$*" >&2; exit 1; }

# 校验 tgz（sha 为空时只警告）
verify_sha() {
  local file="$1"
  local expected="$2"
  local actual
  if [ -z "$expected" ]; then
    say "    WARN: 未提供 SHA-256，跳过校验"
    return 0
  fi
  expected="$(printf '%s' "$expected" | tr 'A-F' 'a-f')"
  actual="$(node -e 'const c=require("crypto"),fs=require("fs"); process.stdout.write(c.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"))' "$file")"
  [ "$actual" = "$expected" ] || die "SHA-256 校验失败（期望 $expected / 实际 $actual）"
  say "    SHA-256 校验通过"
}

# 代理统一注入子进程环境（避免出现在 argv）
if [ -n "$PROXY" ]; then
  export HTTPS_PROXY="$PROXY" HTTP_PROXY="$PROXY" ALL_PROXY="$PROXY"
  export https_proxy="$PROXY" http_proxy="$PROXY" all_proxy="$PROXY"
fi

command -v node >/dev/null 2>&1 \
  || die "未找到 node（要求 >= 22）。安装 Node 22 LTS：${NVM_INSTALL}"

node_v="$(node -p 'process.versions.node')"
node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$node_major" -lt 22 ]; then
  die "node 版本过低（当前 v${node_v}，要求 >= 22）。升级：${NVM_INSTALL}"
fi

command -v npm >/dev/null 2>&1 || die "未找到 npm（它随 Node 一同安装，请检查 Node 安装）"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

# 下载/复制 tgz 并校验，最终设置 tgz_path
tgz_path=""
if [ -n "$TGZ_URL" ]; then
  say "==> 安装 daoyan-cli（来自 DAYOAN_TGZ_URL）"
  tgz_name="${TGZ_URL%%\?*}"
  tgz_name="${tgz_name##*/}"
  case "$tgz_name" in
    *.tgz|*.tar.gz) ;;
    *) tgz_name="daoyan-cli.tgz" ;;
  esac
  tgz_path="$tmpdir/$tgz_name"
  case "$TGZ_URL" in
    http://*|https://*)
      [ -n "$EXPECTED_SHA" ] || die "远程 tgz 需要 DAYOAN_SHA256（防止下载被篡改）"
      command -v curl >/dev/null 2>&1 || die "下载 tgz 需要 curl"
      curl -fsSL --max-time 300 -o "$tgz_path" "$TGZ_URL" \
        || die "下载 tgz 失败：检查网络、代理与 URL"
      ;;
    *)
      [ -f "$TGZ_URL" ] || die "tgz 不存在：$TGZ_URL"
      cp "$TGZ_URL" "$tgz_path"
      ;;
  esac
  verify_sha "$tgz_path" "$EXPECTED_SHA"
elif [ -n "$MANIFEST_URL" ]; then
  say "==> 安装 daoyan-cli（来自 latest.json）"
  # 读取 manifest（URL 或本地文件）
  case "$MANIFEST_URL" in
    http://*|https://*)
      command -v curl >/dev/null 2>&1 || die "下载 manifest 需要 curl"
      manifest="$(curl -fsSL --max-time 30 "$MANIFEST_URL")" \
        || die "下载 manifest 失败：检查网络、代理与 URL"
      ;;
    *)
      [ -f "$MANIFEST_URL" ] || die "manifest 不存在：$MANIFEST_URL"
      manifest="$(cat "$MANIFEST_URL")"
      ;;
  esac
  # 用 Node 解析 version / tgz / sha256
  parsed="$(printf '%s' "$manifest" | node -e '
let s = "";
process.stdin.on("data", (d) => (s += d));
process.stdin.on("end", () => {
  try {
    const m = JSON.parse(s);
    if (typeof m.version !== "string" || m.version === "") throw new Error("缺少 version");
    if (typeof m.tgz !== "string" || m.tgz === "") throw new Error("缺少 tgz");
    const sha = typeof m.sha256 === "string" ? m.sha256 : "";
    process.stdout.write(m.version + "\n" + m.tgz + "\n" + sha + "\n");
  } catch (e) {
    console.error(String((e && e.message) || e));
    process.exit(1);
  }
});')" || die "manifest 无效（需要 version / tgz / sha256）"
  version="$(printf '%s\n' "$parsed" | sed -n '1p')"
  tgz_rel="$(printf '%s\n' "$parsed" | sed -n '2p')"
  sha="$(printf '%s\n' "$parsed" | sed -n '3p')"
  [ -n "$EXPECTED_SHA" ] && sha="$EXPECTED_SHA"
  # 解析 tgz 地址
  case "$tgz_rel" in
    http://*|https://*)
      tgz_src="$tgz_rel"
      ;;
    *)
      case "$MANIFEST_URL" in
        http://*|https://*)
          tgz_src="$(node -e 'process.stdout.write(new URL(process.argv[2], process.argv[1]).toString())' "$MANIFEST_URL" "$tgz_rel")" \
            || die "无法解析 manifest 中的 tgz 地址"
          ;;
        *)
          case "$tgz_rel" in
            /*) tgz_src="$tgz_rel" ;;
            *) tgz_src="$(cd "$(dirname "$MANIFEST_URL")" && pwd)/$tgz_rel" ;;
          esac
          ;;
      esac
      ;;
  esac
  # 远程 tgz 必须有校验值（manifest 或 DAYOAN_SHA256）
  case "$tgz_src" in
    http://*|https://*)
      [ -n "$sha" ] || die "manifest 缺少 sha256（远程 tgz 必须校验；也可设置 DAYOAN_SHA256）"
      ;;
  esac
  # 文件名
  tgz_name="${tgz_src%%\?*}"
  tgz_name="${tgz_name##*/}"
  case "$tgz_name" in
    *.tgz|*.tar.gz) ;;
    *) tgz_name="daoyan-cli-${version}.tgz" ;;
  esac
  tgz_path="$tmpdir/$tgz_name"
  say "    版本：${version}"
  case "$tgz_src" in
    http://*|https://*)
      command -v curl >/dev/null 2>&1 || die "下载 tgz 需要 curl"
      curl -fsSL --max-time 300 -o "$tgz_path" "$tgz_src" \
        || die "下载 tgz 失败：检查网络、代理与 URL"
      ;;
    *)
      [ -f "$tgz_src" ] || die "tgz 不存在：$tgz_src"
      cp "$tgz_src" "$tgz_path"
      ;;
  esac
  verify_sha "$tgz_path" "$sha"
else
  say "==> 安装 daoyan-cli@${REF}（来自 git）"
  command -v git >/dev/null 2>&1 || die "未找到 git（从 git 源安装需要它）：https://git-scm.com/downloads"
  say "    1/2 拉取并打包源码"
  tgz="$(cd "$tmpdir" && npm pack --silent "git+${REPO}#${REF}")" \
    || die "npm pack 失败：检查网络与 git 源可达性（git 必须已安装）"
  tgz_path="$tmpdir/$tgz"
fi

say "==> 全局安装 $(basename "$tgz_path")"
if ! npm install -g --ignore-scripts --no-audit --no-fund "$tgz_path"; then
  die "npm 安装失败。若是 EACCES 权限错误，推荐用 nvm（免 sudo），或：npm config set prefix ~/.npm-global 并把 ~/.npm-global/bin 加入 PATH 后重试"
fi

command -v dycli >/dev/null 2>&1 \
  || die "安装完成，但 npm 全局 bin 目录不在 PATH。查看：npm prefix -g，其下 bin/ 子目录需加入 PATH"

say "==> 完成：$(dycli --version)"
say "    上手：daoyan --help（短命令 dycli 等价）"
say "    Agent 自描述：daoyan help --json"
