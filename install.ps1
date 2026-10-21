#Requires -Version 5.1
<#
daoyan-cli Windows 安装脚本 —— 默认从 GitHub Release 的 latest.json 安装，也支持镜像 / 离线 tgz / 代理。

用法：
  irm https://github.com/yuanbaobaoo/daoyan-cli/releases/latest/download/install.ps1 | iex

也可下载后执行（便于传环境变量或排查问题）：
  $url = "https://github.com/yuanbaobaoo/daoyan-cli/releases/latest/download/install.ps1"
  $file = Join-Path $env:TEMP "install-daoyan.ps1"
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $file
  powershell -NoProfile -ExecutionPolicy Bypass -File $file

可选环境变量：
  DAYOAN_REF=v0.0.7                  git tag / 分支 / commit（默认 master，仅在回退 git 时使用）
  DAYOAN_REPO=<git url>              自建 git 镜像（默认 GitHub）
  DAYOAN_MANIFEST_URL=<url|路径>     更新清单（默认 Release latest.json；显式设为空则走 git）
  DAYOAN_TGZ_URL=<url|路径>          直接安装指定 tgz（优先于 manifest）
  DAYOAN_SHA256=<hex>                校验 tgz（远程 tgz 必填；manifest 内已有 sha256）
  DAYOAN_PROXY=<url>                 下载/安装代理（http/https/socks5）

原理：dist 产物随 npm tarball 分发，安装即用，无需在用户机上构建。
要求：node >= 22、npm、git（Git 用于 init / engine 部署与安装期的 git 回退）。
#>

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Windows PowerShell 5.1 默认可能使用旧 TLS，GitHub 需要 TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# 输出普通信息
function Say {
    param([string]$Message)
    Write-Host $Message
}

# 致命错误（用 throw 而非 exit，避免 irm | iex 关闭用户终端）
function Fail {
    param([string]$Message)
    throw $Message
}

# 下载文件：优先 curl.exe（支持 socks5 代理），否则回退 Invoke-WebRequest
function Download-File {
    param([string]$Url, [string]$Destination)
    # curl.exe（Windows 10 1803+ 自带）
    $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($null -ne $curl) {
        # curl 参数
        $arguments = @("-fsSL", "--max-time", "300", "-o", $Destination, $Url)
        if (-not [string]::IsNullOrEmpty($Proxy)) {
            $arguments = @("-fsSL", "--max-time", "300", "--proxy", $Proxy, "-o", $Destination, $Url)
        }
        & $curl.Source @arguments
        if ($LASTEXITCODE -ne 0) {
            Fail "下载失败：$Url（curl 退出码 $LASTEXITCODE）"
        }
        return
    }
    # Invoke-WebRequest 参数（仅 http/https 代理）
    $request = @{ Uri = $Url; OutFile = $Destination; UseBasicParsing = $true; TimeoutSec = 300 }
    if (-not [string]::IsNullOrEmpty($Proxy)) {
        $request["Proxy"] = $Proxy
    }
    Invoke-WebRequest @request | Out-Null
}

# 读取远程文本（manifest）
function Get-RemoteText {
    param([string]$Url, [int]$TimeoutSec = 30)
    # curl.exe
    $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($null -ne $curl) {
        # curl 参数
        $arguments = @("-fsSL", "--max-time", "$TimeoutSec", $Url)
        if (-not [string]::IsNullOrEmpty($Proxy)) {
            $arguments = @("-fsSL", "--max-time", "$TimeoutSec", "--proxy", $Proxy, $Url)
        }
        # curl 输出行
        $lines = & $curl.Source @arguments
        if ($LASTEXITCODE -ne 0) {
            throw "请求失败：$Url（curl 退出码 $LASTEXITCODE）"
        }
        return ($lines -join "`n")
    }
    # Invoke-WebRequest 参数
    $request = @{ Uri = $Url; UseBasicParsing = $true; TimeoutSec = $TimeoutSec }
    if (-not [string]::IsNullOrEmpty($Proxy)) {
        $request["Proxy"] = $Proxy
    }
    return (Invoke-WebRequest @request).Content
}

# 计算文件 SHA-256（小写）
function Get-FileHashHex {
    param([string]$Path)
    return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

# 校验文件 SHA-256
function Verify-Sha {
    param([string]$Path, [string]$Expected)
    if ([string]::IsNullOrEmpty($Expected)) {
        Say "    WARN: 未提供 SHA-256，跳过校验"
        return
    }
    # 实际哈希
    $actual = Get-FileHashHex -Path $Path
    # 期望哈希（统一小写）
    $expectedLower = $Expected.ToLowerInvariant()
    if ($actual -ne $expectedLower) {
        Fail "SHA-256 校验失败（期望 $expectedLower / 实际 $actual）"
    }
    Say "    SHA-256 校验通过"
}

# 从 URL / 路径提取 tgz 文件名
function Get-TgzName {
    param([string]$Location)
    # 去掉查询串
    $clean = $Location.Split("?")[0]
    # 最后一个路径分隔符
    $index = $clean.LastIndexOf("/")
    # 文件名
    $name = $clean
    if ($index -ge 0) {
        $name = $clean.Substring($index + 1)
    }
    if ($name -match "\.tgz$" -or $name -match "\.tar\.gz$") {
        return $name
    }
    return "daoyan-cli.tgz"
}

# 默认仓库与清单
$Repo = "https://github.com/yuanbaobaoo/daoyan-cli.git"
if (-not [string]::IsNullOrEmpty($env:DAYOAN_REPO)) {
    $Repo = $env:DAYOAN_REPO
}
# git 回退引用
$Ref = "master"
if (-not [string]::IsNullOrEmpty($env:DAYOAN_REF)) {
    $Ref = $env:DAYOAN_REF
}
# 默认 Release 清单
$DefaultManifestUrl = "https://github.com/yuanbaobaoo/daoyan-cli/releases/latest/download/latest.json"
# 清单地址
$ManifestUrl = $DefaultManifestUrl
# 是否为默认清单（默认清单不可达时允许回退 git）
$ManifestDefault = $true
if (Test-Path Env:DAYOAN_MANIFEST_URL) {
    $ManifestUrl = $env:DAYOAN_MANIFEST_URL
    $ManifestDefault = $false
}
# 直接指定的 tgz
$TgzSourceInput = $env:DAYOAN_TGZ_URL
if ($null -eq $TgzSourceInput) {
    $TgzSourceInput = ""
}
# 期望的 SHA-256
$ExpectedSha = $env:DAYOAN_SHA256
if ($null -eq $ExpectedSha) {
    $ExpectedSha = ""
}
# 下载/安装代理
$Proxy = $env:DAYOAN_PROXY
if ($null -eq $Proxy) {
    $Proxy = ""
}

# 代理统一注入子进程环境（避免出现在 argv）
if (-not [string]::IsNullOrEmpty($Proxy)) {
    $env:HTTPS_PROXY = $Proxy
    $env:HTTP_PROXY = $Proxy
    $env:ALL_PROXY = $Proxy
}

# Node
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $nodeCommand) {
    Fail "未找到 node（要求 >= 22）。安装：winget install --id OpenJS.NodeJS.LTS -e，或使用 nvm-windows"
}
# Node 版本
$nodeVersion = ((& node -p "process.versions.node") -join "").Trim()
# Node 主版本
$nodeMajor = [int]((& node -p "Number(process.versions.node.split('.')[0])") -join "")
if ($nodeMajor -lt 22) {
    Fail "node 版本过低（当前 v$nodeVersion，要求 >= 22）。升级：winget upgrade --id OpenJS.NodeJS.LTS -e，或使用 nvm-windows"
}

# npm：优先 npm.cmd，避免执行策略拦截 npm.ps1
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($null -eq $npmCommand) {
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
}
if ($null -eq $npmCommand) {
    Fail "未找到 npm（它随 Node 一同安装）。请用官方安装包或 nvm-windows 重新安装 Node"
}
# npm 可执行文件
$npmExe = $npmCommand.Source
if ([string]::IsNullOrEmpty($npmExe)) {
    $npmExe = "npm"
}

# Git（硬性依赖：init / engine 部署 / git 回退）
$gitCommand = Get-Command git -ErrorAction SilentlyContinue
if ($null -eq $gitCommand) {
    Fail "未找到 git（dycli 必需）。安装：winget install --id Git.Git -e，或 https://git-scm.com/download/win"
}
# git 版本
$gitVersion = ((& git --version) -join "").Trim()
# npm 版本
$npmVersion = ((& $npmExe --version) -join "").Trim()

Say "    环境：node v$nodeVersion / npm $npmVersion / $gitVersion"

# 临时目录
$TempRoot = $env:TEMP
if ([string]::IsNullOrEmpty($TempRoot)) {
    $TempRoot = [IO.Path]::GetTempPath()
}
# 本次安装临时目录
$TempDir = Join-Path $TempRoot ("daoyan-install-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
# 最终 tgz 路径
$TgzPath = ""

try {
    # 预读 manifest（默认 Release 清单不可达时回退 git；显式指定的清单失败则直接报错）
    $Manifest = $null
    if ([string]::IsNullOrEmpty($TgzSourceInput) -and -not [string]::IsNullOrEmpty($ManifestUrl)) {
        if ($ManifestUrl -match "^https?://") {
            try {
                # manifest 文本
                $manifestText = Get-RemoteText -Url $ManifestUrl -TimeoutSec 30
                $Manifest = ($manifestText -replace "^\uFEFF", "") | ConvertFrom-Json
            } catch {
                if ($ManifestDefault) {
                    Say "    WARN: 默认 Release 清单不可达，回退 git 安装（可设置 DAYOAN_MANIFEST_URL 指定镜像）"
                    $ManifestUrl = ""
                    $Manifest = $null
                } else {
                    Fail "下载 manifest 失败：$($_.Exception.Message)"
                }
            }
        } else {
            if (-not (Test-Path -LiteralPath $ManifestUrl)) {
                Fail "manifest 不存在：$ManifestUrl"
            }
            # 本地 manifest 统一为绝对路径，保证相对 tgz 能正确解析
            $ManifestUrl = (Resolve-Path -LiteralPath $ManifestUrl).Path
            try {
                $Manifest = Get-Content -LiteralPath $ManifestUrl -Raw | ConvertFrom-Json
            } catch {
                Fail "manifest 无效：$($_.Exception.Message)"
            }
        }
    }

    if (-not [string]::IsNullOrEmpty($TgzSourceInput)) {
        Say "==> 安装 daoyan-cli（来自 DAYOAN_TGZ_URL）"
        # tgz 文件名
        $tgzName = Get-TgzName -Location $TgzSourceInput
        $TgzPath = Join-Path $TempDir $tgzName
        if ($TgzSourceInput -match "^https?://") {
            if ([string]::IsNullOrEmpty($ExpectedSha)) {
                Fail "远程 tgz 需要 DAYOAN_SHA256（防止下载被篡改）"
            }
            Download-File -Url $TgzSourceInput -Destination $TgzPath
        } else {
            if (-not (Test-Path -LiteralPath $TgzSourceInput)) {
                Fail "tgz 不存在：$TgzSourceInput"
            }
            Copy-Item -LiteralPath $TgzSourceInput -Destination $TgzPath
        }
        Verify-Sha -Path $TgzPath -Expected $ExpectedSha
    } elseif ($null -ne $Manifest) {
        Say "==> 安装 daoyan-cli（来自 latest.json）"
        # 版本
        $version = [string]$Manifest.version
        # manifest 中的 tgz 相对/绝对地址
        $tgzRel = [string]$Manifest.tgz
        # manifest 中的哈希
        $sha = [string]$Manifest.sha256
        if ([string]::IsNullOrEmpty($version)) {
            Fail "manifest 无效（需要 version / tgz / sha256）"
        }
        if ([string]::IsNullOrEmpty($tgzRel)) {
            Fail "manifest 无效（需要 version / tgz / sha256）"
        }
        if (-not [string]::IsNullOrEmpty($ExpectedSha)) {
            $sha = $ExpectedSha
        }
        # 解析 tgz 地址
        if ($tgzRel -match "^https?://") {
            $tgzSrc = $tgzRel
        } elseif ($ManifestUrl -match "^https?://") {
            # manifest 基地址
            $baseUri = New-Object -TypeName System.Uri -ArgumentList $ManifestUrl
            $tgzSrc = (New-Object -TypeName System.Uri -ArgumentList $baseUri, $tgzRel).AbsoluteUri
        } else {
            if ([IO.Path]::IsPathRooted($tgzRel)) {
                $tgzSrc = $tgzRel
            } else {
                $tgzSrc = Join-Path (Split-Path -Parent $ManifestUrl) $tgzRel
            }
        }
        # 远程 tgz 必须有校验值
        if ($tgzSrc -match "^https?://" -and [string]::IsNullOrEmpty($sha)) {
            Fail "manifest 缺少 sha256（远程 tgz 必须校验；也可设置 DAYOAN_SHA256）"
        }
        # tgz 文件名
        $tgzName = Get-TgzName -Location $tgzSrc
        if ($tgzName -eq "daoyan-cli.tgz") {
            $tgzName = "daoyan-cli-$version.tgz"
        }
        $TgzPath = Join-Path $TempDir $tgzName
        Say "    版本：$version"
        if ($tgzSrc -match "^https?://") {
            Download-File -Url $tgzSrc -Destination $TgzPath
        } elseif (Test-Path -LiteralPath $tgzSrc) {
            Copy-Item -LiteralPath $tgzSrc -Destination $TgzPath
        } else {
            Fail "tgz 不存在：$tgzSrc"
        }
        Verify-Sha -Path $TgzPath -Expected $sha
    } else {
        Say "==> 安装 daoyan-cli@$Ref（来自 git）"
        Push-Location $TempDir
        try {
            # npm pack 输出
            $packed = & $npmExe pack --silent "git+$Repo#$Ref"
            if ($LASTEXITCODE -ne 0) {
                Fail "npm pack 失败：检查网络与 git 源可达性（git 必须已安装）"
            }
            # 打包文件名
            $packedName = (($packed | Select-Object -Last 1) -join "").Trim()
            if ([string]::IsNullOrEmpty($packedName)) {
                Fail "npm pack 未返回 tgz 文件名"
            }
            $TgzPath = Join-Path $TempDir $packedName
        } finally {
            Pop-Location
        }
    }

    Say "==> 全局安装 $(Split-Path -Leaf $TgzPath)"
    & $npmExe install -g --ignore-scripts --no-audit --no-fund $TgzPath
    if ($LASTEXITCODE -ne 0) {
        Fail "npm 安装失败。若为权限错误，建议用 nvm-windows；或设置 npm config set prefix $env:APPDATA\npm 后重试"
    }

    # npm 全局目录
    $prefixOutput = & $npmExe prefix -g
    if ($LASTEXITCODE -ne 0) {
        Fail "无法读取 npm 全局目录（npm prefix -g 退出码 $LASTEXITCODE）"
    }
    $prefix = (($prefixOutput | Select-Object -Last 1) -join "").Trim()
    # 全局 shim（Windows 下为 dycli.cmd）
    $dycliShim = Join-Path $prefix "dycli.cmd"
    if (-not (Test-Path -LiteralPath $dycliShim)) {
        Fail "安装完成，但未找到 $dycliShim（npm 全局目录：$prefix）"
    }
    # PATH 检查（新终端可用性）
    $dycliCommand = Get-Command dycli.cmd -ErrorAction SilentlyContinue
    if ($null -eq $dycliCommand) {
        Fail "安装完成，但 npm 全局 bin 目录不在 PATH。查看：npm prefix -g（当前 $prefix），把该目录加入 PATH 后重开终端"
    }

    # 安装后版本（直接调用 shim，避免 PATH 中的旧版本）
    $versionText = ((& $dycliShim --version) -join "").Trim()
    if ($LASTEXITCODE -ne 0) {
        Fail "安装完成，但 dycli --version 失败（退出码 $LASTEXITCODE）"
    }
    Say "==> 完成：$versionText"
    Say "    上手：daoyan --help（短命令 dycli 等价）"
    Say "    Agent 自描述：daoyan help --json"
} finally {
    if (Test-Path -LiteralPath $TempDir) {
        Remove-Item -LiteralPath $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
