/** ffmpeg / ffprobe 薄封装 —— 参数组合已在生产环境验证，勿随意改动。 */
import { spawn } from "node:child_process";
import { DaoyanCliError } from "../../shared/errors.mts";

function run(argv: string[]): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(argv[0] ?? "", argv.slice(1), { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d: Buffer) => {
      out += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => {
      err += d.toString();
    });
    child.on("error", (e) => {
      rejectPromise(
        new DaoyanCliError({ code: "external_tool_missing", message: `缺少外部工具 ${argv[0]}：${e.message}` }),
      );
    });
    child.on("close", (code) => {
      if (code === 0) resolvePromise(out);
      else rejectPromise(new Error(`${argv[0]} 退出码 ${code}：${err.slice(0, 500)}`));
    });
  });
}

/** 视频总帧数（ffprobe 全量计数；短视频片段开销可接受）。 */
export async function countFrames(video: string): Promise<number> {
  const out = await run([
    "ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0",
    "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", video,
  ]);
  const n = Number.parseInt((out.trim().split("\n")[0] ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) throw new Error(`视频没有帧：${video}`);
  return n;
}

/** 抽取最后一帧为 PNG（接力链的上游尾帧）。 */
export async function extractLastFrame(video: string, outPng: string): Promise<void> {
  const n = await countFrames(video);
  await run([
    "ffmpeg", "-y", "-v", "error", "-i", video,
    "-vf", `select=eq(n\\,${n - 1})`, "-frames:v", "1", outPng,
  ]);
}

/** wrap 合片（M1）：concat listfile + libx264 / yuv420p / crf18 / faststart。 */
export async function wrapConcat(_clips: string[], _outPath: string): Promise<void> {
  throw new DaoyanCliError({ code: "not_implemented", message: "wrap 在 M1 交付。" });
}
