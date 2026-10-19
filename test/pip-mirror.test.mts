/** pip 源默认值与 --mirror 覆盖测试。 */
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PIP_MIRROR, pipIndexArgs } from "../src/core/provision/init-flow.mts";

test("pip 默认使用阿里云 PyPI", () => {
  assert.equal(DEFAULT_PIP_MIRROR, "https://mirrors.aliyun.com/pypi/simple/");
  assert.deepEqual(pipIndexArgs(), ["--index-url", DEFAULT_PIP_MIRROR]);
  // 空字符串按未指定处理
  assert.deepEqual(pipIndexArgs("   "), ["--index-url", DEFAULT_PIP_MIRROR]);
});

test("--mirror 覆盖默认源并去除首尾空白", () => {
  assert.deepEqual(pipIndexArgs("https://pypi.org/simple/"), [
    "--index-url",
    "https://pypi.org/simple/",
  ]);
  assert.deepEqual(pipIndexArgs("  https://mirror.example.com/simple/  "), [
    "--index-url",
    "https://mirror.example.com/simple/",
  ]);
});
