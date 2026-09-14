/* ============================================================
 * container-sandbox-engine.ts
 * 浏览器内的 Docker 模拟引擎：虚拟镜像分层、容器生命周期、
 * 端口映射、数据卷、自定义网络、docker build 解释器、compose 编排。
 * 全部状态在内存中，零后端。
 * ============================================================ */

export type TermColor = "g" | "r" | "y" | "c" | "d" | "w" | "b";
export interface TermLine { text: string; c?: TermColor }

export interface VLayer {
  id: string;
  instruction: string;
  sizeMB: number;
  cacheKey: string;
  cached?: boolean;
  /** 这一层新增/修改的文件（构建时记录，供逐层检查使用） */
  filesAdded?: Record<string, string>;
}

export interface ServiceSpec {
  kind: "http" | "tcp";
  port: number;
  /** http 服务默认首页内容 */
  index?: string;
}

export interface VImage {
  id: string;
  repo: string;
  tag: string;
  layers: VLayer[];
  env: Record<string, string>;
  entrypoint: string[];
  cmd: string[];
  exposed: number[];
  workdir: string;
  /** 虚拟 rootfs 中的文本文件（exec / http 服务用） */
  files: Record<string, string>;
  service?: ServiceSpec | null;
  createdAt: number;
}

export type ContainerStatus = "created" | "running" | "paused" | "exited";

export interface VMount {
  /** named volume 名；bind mount 时为空 */
  volName?: string;
  /** bind mount 时为宿主机路径 */
  hostPath?: string;
  dest: string;
}

export interface VContainer {
  id: string;
  name: string;
  imageRef: string;
  imageId: string;
  status: ContainerStatus;
  cmd: string[];
  env: Record<string, string>;
  ports: { hostPort: number; containerPort: number }[];
  mounts: VMount[];
  network: string;
  exitCode?: number;
  httpPort?: number;
  logs: TermLine[];
  limits?: { memoryMB?: number; cpus?: number };
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  project?: string;
}

export interface VVolume {
  name: string;
  mountpoint: string;
  mountedBy: string[];
  createdAt: number;
}

export interface VNetwork {
  name: string;
  id: string;
  subnet: string;
  driver: string;
  containers: string[];
  createdAt: number;
}

export interface CatalogEntry {
  repo: string;
  tag: string;
  sizeMB: number;
  baseLayers: number;
  desc: string;
  service?: ServiceSpec | null;
  cmd?: string[];
  files?: Record<string, string>;
}

/* ============================================================
 * 虚拟文件系统（宿主机侧）
 * ============================================================ */

type FsNode =
  | { type: "dir"; children: Map<string, FsNode> }
  | { type: "file"; content: string; size: number };

export class VFS {
  root: FsNode = { type: "dir", children: new Map() };

  normalize(p: string, cwd: string): string {
    let path = p.replace(/\\/g, "/");
    if (path.startsWith("~")) path = "/root" + path.slice(1);
    if (!path.startsWith("/")) path = (cwd === "/" ? "" : cwd) + "/" + path;
    const parts: string[] = [];
    for (const seg of path.split("/")) {
      if (!seg || seg === ".") continue;
      if (seg === "..") parts.pop();
      else parts.push(seg);
    }
    return "/" + parts.join("/");
  }

  node(p: string): FsNode | null {
    if (p === "/") return this.root;
    let cur: FsNode = this.root;
    for (const seg of p.split("/").filter(Boolean)) {
      if (cur.type !== "dir") return null;
      const next = cur.children.get(seg);
      if (!next) return null;
      cur = next;
    }
    return cur;
  }

  exists(p: string): boolean { return this.node(p) !== null; }
  isFile(p: string): boolean { const n = this.node(p); return !!n && n.type === "file"; }
  isDir(p: string): boolean { const n = this.node(p); return !!n && n.type === "dir"; }

  mkdirp(p: string): void {
    let cur = this.root;
    for (const seg of p.split("/").filter(Boolean)) {
      if (cur.type !== "dir") return;
      const next = cur.children.get(seg);
      if (!next) { const d: FsNode = { type: "dir", children: new Map() }; cur.children.set(seg, d); cur = d; }
      else if (next.type === "dir") cur = next;
      else return;
    }
  }

  writeFile(p: string, content: string): void {
    const parent = this.normalize(p, "/").split("/").slice(0, -1).join("/") || "/";
    if (!this.isDir(parent)) this.mkdirp(parent);
    const dir = this.node(parent);
    const name = p.split("/").filter(Boolean).pop()!;
    if (dir && dir.type === "dir") dir.children.set(name, { type: "file", content, size: Math.max(1, Math.round(content.length / 1024)) });
  }

  readFile(p: string): string | null {
    const n = this.node(p);
    return n && n.type === "file" ? n.content : null;
  }

  list(p: string): { name: string; type: "dir" | "file"; size: number }[] {
    const n = this.node(p);
    if (!n || n.type !== "dir") return [];
    return [...n.children.entries()].map(([name, node]) =>
      node.type === "file" ? { name, type: "file" as const, size: node.size } : { name, type: "dir" as const, size: 0 },
    );
  }

  rm(p: string): boolean {
    const parentPath = p.split("/").slice(0, -1).join("/") || "/";
    const dir = this.node(parentPath);
    const name = p.split("/").filter(Boolean).pop();
    if (dir && dir.type === "dir" && name) return dir.children.delete(name);
    return false;
  }

  dirTree(p: string, depth = 3): string[] {
    const out: string[] = [];
    const walk = (path: string, prefix: string, d: number) => {
      for (const e of this.list(path)) {
        out.push(prefix + e.name + (e.type === "dir" ? "/" : ""));
        if (e.type === "dir" && d > 1) walk(path + "/" + e.name, prefix + "  ", d - 1);
      }
    };
    walk(p, "", depth);
    return out;
  }
}

/* ============================================================
 * 工具函数
 * ============================================================ */

const HEX = "0123456789abcdef";
const rid = (n: number) => Array.from({ length: n }, () => HEX[Math.floor(Math.random() * 16)]).join("");
const NAME_A = ["vibrant", "elegant", "hopeful", "serene", "brave", "clever", "nimble", "quiet", "bold", "gentle"];
const NAME_B = ["torvalds", "hopper", "lovelace", "turing", "curie", "hamilton", "ritchie", "knuth", "shuttleworth", "liskov"];
const autoName = () => `${NAME_A[Math.floor(Math.random() * 10)]}_${NAME_B[Math.floor(Math.random() * 10)]}`;

export function fmtSize(mb: number): string {
  if (mb <= 0) return "0B";
  if (mb < 1) { const kb = Math.round(mb * 1024); return kb > 0 ? `${kb}KB` : `${Math.max(1, Math.round(mb * 1024 * 1024))}B`; }
  if (mb < 1024) return `${Math.round(mb * 10) / 10}MB`;
  return `${Math.round(mb / 102.4) / 10}GB`;
}

function ago(t: number): string {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return s < 5 ? "Just now" : `${s} seconds ago`;
  const m = Math.round(s / 60);
  return m === 1 ? "1 minute ago" : `${m} minutes ago`;
}
function upFor(t: number): string {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `Up ${s} seconds`;
  const m = Math.round(s / 60);
  return m === 1 ? "Up 1 minute" : `Up ${m} minutes`;
}

/** 引号感知的分词 */
export function tokenize(input: string): string[] {
  const out: string[] = [];
  let cur = "", q: string | null = null;
  for (const ch of input) {
    if (q) { if (ch === q) q = null; else cur += ch; }
    else if (ch === '"' || ch === "'") q = ch;
    else if (/\s/.test(ch)) { if (cur) { out.push(cur); cur = ""; } }
    else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

export interface ParsedArgs {
  flags: Set<string>;
  values: Map<string, string>;
  rest: string[];
}
const VALUE_FLAGS = new Set(["-p", "--publish", "--name", "-v", "--volume", "-e", "--env", "--network", "-m", "--memory", "--cpus", "-w", "--workdir", "--entrypoint", "-t", "--tag", "-f", "--file", "--tail", "--build-arg", "--platform", "--project"]);
const BOOL_FLAGS = new Set(["-d", "-it", "-i", "-a", "-q", "-f", "--rm", "--force", "--no-cache", "--help", "-s", "-la", "-lh", "-l", "-r", "-p"]);

function parseArgs(argv: string[]): ParsedArgs {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (VALUE_FLAGS.has(a) && i + 1 < argv.length) { values.set(a, argv[++i]); continue; }
    if (BOOL_FLAGS.has(a)) { flags.add(a); continue; }
    // 合并短旗标如 -it / -aq
    if (/^-[a-z]{2,4}$/i.test(a) && ![...a.slice(1)].some((ch) => !BOOL_FLAGS.has("-" + ch))) {
      for (const ch of a.slice(1)) flags.add("-" + ch);
      continue;
    }
    rest.push(a);
  }
  return { flags, values, rest };
}

export function parseImageRef(ref: string): { repo: string; tag: string } {
  let r = ref.trim();
  r = r.replace(/^https?:\/\//, "").replace(/^docker\.io\//, "");
  const slash = r.indexOf("/");
  if (slash > -1 && !r.slice(0, slash).includes(".") && !r.slice(0, slash).includes(":")) {
    // 官方镜像 namespace，如 library/nginx
    r = r.slice(slash + 1);
  }
  const colon = r.lastIndexOf(":");
  if (colon > -1) return { repo: r.slice(0, colon), tag: r.slice(colon + 1) };
  return { repo: r, tag: "latest" };
}

/* ============================================================
 * 镜像仓库目录（模拟 registry）
 * ============================================================ */

const NGINX_INDEX = `<!DOCTYPE html>
<html>
<head><title>Welcome to nginx!</title></head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and working.</p>
</body>
</html>`;

export const CATALOG: CatalogEntry[] = [
  { repo: "nginx", tag: "latest", sizeMB: 187, baseLayers: 5, desc: "official", service: { kind: "http", port: 80, index: NGINX_INDEX }, cmd: ["nginx", "-g", "daemon off;"], files: { "/usr/share/nginx/html/index.html": NGINX_INDEX } },
  { repo: "nginx", tag: "alpine", sizeMB: 43, baseLayers: 4, desc: "official", service: { kind: "http", port: 80, index: NGINX_INDEX }, cmd: ["nginx", "-g", "daemon off;"], files: { "/usr/share/nginx/html/index.html": NGINX_INDEX } },
  { repo: "redis", tag: "latest", sizeMB: 117, baseLayers: 5, desc: "official", service: { kind: "tcp", port: 6379 }, cmd: ["redis-server"] },
  { repo: "redis", tag: "alpine", sizeMB: 30, baseLayers: 4, desc: "official", service: { kind: "tcp", port: 6379 }, cmd: ["redis-server"] },
  { repo: "node", tag: "20", sizeMB: 1050, baseLayers: 6, desc: "official", cmd: ["node"] },
  { repo: "node", tag: "20-alpine", sizeMB: 130, baseLayers: 5, desc: "official", cmd: ["node"] },
  { repo: "python", tag: "3.12", sizeMB: 1010, baseLayers: 6, desc: "official", cmd: ["python3"] },
  { repo: "python", tag: "3.12-slim", sizeMB: 130, baseLayers: 5, desc: "official", cmd: ["python3"] },
  { repo: "alpine", tag: "latest", sizeMB: 7.4, baseLayers: 3, desc: "official", cmd: ["/bin/sh"], files: { "/etc/os-release": "NAME=\"Alpine Linux\"\nID=alpine\n" } },
  { repo: "ubuntu", tag: "22.04", sizeMB: 77, baseLayers: 4, desc: "official", cmd: ["/bin/bash"], files: { "/etc/os-release": "PRETTY_NAME=\"Ubuntu 22.04 LTS\"\n" } },
  { repo: "debian", tag: "bookworm-slim", sizeMB: 74, baseLayers: 4, desc: "official", cmd: ["/bin/bash"] },
  { repo: "busybox", tag: "latest", sizeMB: 4.2, baseLayers: 2, desc: "official", cmd: ["sh"] },
  { repo: "hello-world", tag: "latest", sizeMB: 0.013, baseLayers: 1, desc: "official", cmd: ["/hello"], files: {} },
  { repo: "postgres", tag: "16", sizeMB: 430, baseLayers: 7, desc: "official", service: { kind: "tcp", port: 5432 }, cmd: ["postgres"] },
  { repo: "mongo", tag: "latest", sizeMB: 700, baseLayers: 7, desc: "official", service: { kind: "tcp", port: 27017 }, cmd: ["mongod"] },
  { repo: "traefik", tag: "v3.0", sizeMB: 180, baseLayers: 4, desc: "official", service: { kind: "http", port: 80 }, cmd: ["traefik"] },
];

const HELLO_LOG: TermLine[] = [
  { text: "" },
  { text: "Hello from Docker!", c: "w" },
  { text: "This message shows that your installation appears to be working correctly.", c: "d" },
  { text: "" },
  { text: "To generate this message, Docker took the following steps:", c: "d" },
  { text: " 1. The Docker client contacted the Docker daemon.", c: "d" },
  { text: " 2. The Docker daemon pulled the image from Docker Hub.", c: "d" },
  { text: " 3. The Docker daemon created a new container from that image.", c: "d" },
  { text: " 4. The Docker daemon streamed that output to the Docker client.", c: "d" },
];

/* ============================================================
 * 引擎主体
 * ============================================================ */

export class ContainerEngine {
  images: VImage[] = [];
  containers: VContainer[] = [];
  volumes: VVolume[] = [];
  networks: VNetwork[] = [];
  vfs = new VFS();
  cwd = "/root";
  version = 0;
  commandHistory: string[] = [];
  private listeners = new Set<() => void>();
  private buildCache = new Map<string, VLayer>();
  private seq = 0;

  /** 外部修改引擎状态后手动触发面板刷新 */
  notify() { this.version++; this.listeners.forEach((l) => l()); }

  /* ---- 订阅（供 React useSyncExternalStore） ---- */
  subscribe = (cb: () => void) => { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; };
  getVersion = () => this.version;

  /* ---- 查询 ---- */
  findImage(ref: string): VImage | null {
    const { repo, tag } = parseImageRef(ref);
    return this.images.find((i) => i.repo === repo && i.tag === tag) ?? null;
  }
  findContainer(nameOrId: string): VContainer | null {
    return this.containers.find((c) => c.name === nameOrId || c.id.startsWith(nameOrId)) ?? null;
  }
  runningContainers(): VContainer[] { return this.containers.filter((c) => c.status === "running"); }
  boundHostPorts(): Set<number> {
    const s = new Set<number>();
    for (const c of this.containers) if (c.status === "running") for (const p of c.ports) s.add(p.hostPort);
    return s;
  }

  /* ============ 命令入口 ============ */
  exec(raw: string): TermLine[] {
    const line = raw.trim();
    if (!line) return [];
    this.commandHistory.push(line);
    const bare = line.replace(/^(sudo\s+)?/, "");
    const argv = tokenize(bare);
    const out: TermLine[] = [];
    if (argv[0] === "docker") this.docker(argv.slice(1), out);
    else this.shell(argv, bare, out);
    this.notify();
    return out;
  }

  /* ============ docker 分发 ============ */
  private docker(argv: string[], out: TermLine[]) {
    if (argv.length === 0) { out.push({ text: "Usage:  docker [OPTIONS] COMMAND", c: "d" }); return; }
    const cmd = argv[0];
    const rest = argv.slice(1);
    const handlers: Record<string, () => void> = {
      run: () => this.dockerRun(rest, out),
      create: () => this.dockerRun(rest, out, true),
      ps: () => this.dockerPs(rest, out),
      images: () => this.dockerImages(rest, out),
      image: () => { if (rest[0] === "ls") this.dockerImages(rest.slice(1), out); else if (rest[0] === "rm") this.dockerRmi(rest.slice(1), out); else out.push({ text: `docker: unknown image command '${rest[0] ?? ""}'`, c: "r" }); },
      pull: () => this.dockerPull(rest, out),
      push: () => this.dockerPush(rest, out),
      search: () => this.dockerSearch(rest, out),
      rmi: () => this.dockerRmi(rest, out),
      rm: () => this.dockerRm(rest, out),
      stop: () => this.dockerLifecycle(rest, out, "stop"),
      kill: () => this.dockerLifecycle(rest, out, "kill"),
      start: () => this.dockerLifecycle(rest, out, "start"),
      restart: () => this.dockerLifecycle(rest, out, "restart"),
      pause: () => this.dockerLifecycle(rest, out, "pause"),
      unpause: () => this.dockerLifecycle(rest, out, "unpause"),
      logs: () => this.dockerLogs(rest, out),
      exec: () => this.dockerExec(rest, out),
      inspect: () => this.dockerInspect(rest, out),
      port: () => this.dockerPort(rest, out),
      stats: () => this.dockerStats(out),
      history: () => this.dockerHistory(rest, out),
      tag: () => this.dockerTag(rest, out),
      rename: () => this.dockerRename(rest, out),
      build: () => this.dockerBuild(rest, out),
      volume: () => this.dockerVolume(rest, out),
      network: () => this.dockerNetwork(rest, out),
      system: () => this.dockerSystem(rest, out),
      version: () => { out.push({ text: "Docker version 27.1.1, build containerd v1.7.20 (sandbox)", c: "w" }); },
      info: () => { out.push({ text: `Containers: ${this.containers.length}  Images: ${this.images.length}`, c: "w" }); out.push({ text: `Server Version: 27.1.1   Storage Driver: overlay2 (sandbox)`, c: "d" }); },
      login: () => out.push({ text: "Login Succeeded (sandbox: 凭证已写入模拟 config.json)", c: "g" }),
      logout: () => out.push({ text: "Removing login credentials for docker.io", c: "d" }),
      compose: () => this.dockerCompose(rest, out),
    };
    const h = handlers[cmd];
    if (h) h();
    else { out.push({ text: `docker: '${cmd}' is not a docker command.`, c: "r" }); out.push({ text: "试试: run / ps / images / pull / build / compose / volume / network / exec / logs", c: "d" }); }
  }

  /* ---- run ---- */
  private dockerRun(argv: string[], out: TermLine[], createOnly = false) {
    const { flags, values, rest } = parseArgs(argv);
    if (rest.length === 0) { out.push({ text: `"docker run" requires at least 1 argument.`, c: "r" }); return; }
    const ref = rest[0];
    const cmdOverride = rest.slice(1);
    let image = this.findImage(ref);
    if (!image) {
      const entry = CATALOG.find((c) => c.repo === parseImageRef(ref).repo && c.tag === parseImageRef(ref).tag);
      if (!entry) { out.push({ text: `docker: Unable to find image '${ref}' locally and in registry.`, c: "r" }); out.push({ text: `docker: Error response from daemon: pull access denied for ${parseImageRef(ref).repo}`, c: "r" }); return; }
      out.push({ text: `Unable to find image '${ref}' locally`, c: "d" });
      image = this.pullImage(entry, out);
    }
    // 名字
    const name = values.get("--name") ?? autoName();
    if (this.findContainer(name)) { out.push({ text: `docker: Error response from daemon: Conflict. The container name "/${name}" is already in use.`, c: "r" }); return; }
    // 端口
    const ports: { hostPort: number; containerPort: number }[] = [];
    const pSpec = values.get("-p") ?? values.get("--publish");
    if (pSpec) {
      for (const seg of pSpec.split(",")) {
        const m = seg.trim().match(/^(?:[\d.]+:)?(\d+):(\d+)(?:\/\w+)?$/);
        if (!m) { out.push({ text: `docker: invalid port format '${seg}' (期望 host:container，如 8080:80)`, c: "r" }); return; }
        const hostPort = Number(m[1]), containerPort = Number(m[2]);
        if (this.boundHostPorts().has(hostPort)) {
          out.push({ text: `docker: Error response from daemon: driver failed programming external connectivity: Bind for 0.0.0.0:${hostPort} failed: port is already allocated`, c: "r" });
          return;
        }
        ports.push({ hostPort, containerPort });
      }
    }
    // 卷
    const mounts: VMount[] = [];
    const vSpecs = [values.get("-v"), values.get("--volume")].filter(Boolean) as string[];
    for (const v of vSpecs) {
      const parts = v.split(":");
      if (parts.length < 2) { out.push({ text: `docker: invalid volume format '${v}' (期望 vol:/path 或 /host/path:/path)`, c: "r" }); return; }
      const src = parts[0], dest = parts[1];
      if (src.startsWith("/") || src.startsWith("~")) {
        mounts.push({ hostPath: this.vfs.normalize(src, this.cwd), dest });
      } else {
        let vol = this.volumes.find((x) => x.name === src);
        if (!vol) { vol = { name: src, mountpoint: `/var/lib/docker/volumes/${src}/_data`, mountedBy: [], createdAt: Date.now() }; this.volumes.push(vol); }
        mounts.push({ volName: src, dest });
      }
    }
    // 网络
    const network = values.get("--network") ?? "bridge";
    if (!this.networks.find((n) => n.name === network)) { out.push({ text: `docker: Error response from daemon: network ${network} not found`, c: "r" }); return; }
    const limits: { memoryMB?: number; cpus?: number } = {};
    if (values.get("-m")) limits.memoryMB = parseInt(values.get("-m")!);
    if (values.get("--cpus")) limits.cpus = parseFloat(values.get("--cpus")!);
    const env: Record<string, string> = { ...image.env };
    for (const e of [values.get("-e"), values.get("--env")].filter(Boolean) as string[]) {
      const i = e.indexOf("=");
      if (i > 0) env[e.slice(0, i)] = e.slice(i + 1);
      else env[e] = "";
    }
    const container: VContainer = {
      id: rid(12), name, imageRef: `${image.repo}:${image.tag}`, imageId: image.id,
      status: "created", cmd: cmdOverride.length ? cmdOverride : image.cmd,
      env, ports, mounts, network, limits, createdAt: Date.now(), logs: [],
      project: values.get("--project") ?? undefined,
      httpPort: image.service?.port,
    };
    this.containers.push(container);
    for (const m of mounts) if (m.volName) this.volumes.find((v) => v.name === m.volName)?.mountedBy.push(name);
    this.networks.find((n) => n.name === network)?.containers.push(name);
    if (createOnly) { out.push({ text: container.id, c: "d" }); return; }
    if (flags.has("-d")) {
      this.startContainer(container, out);
      out.push({ text: container.id, c: "d" });
    } else if (flags.has("-it") || flags.has("-i")) {
      // 交互式：进入常驻或一次性输出
      this.startContainer(container, out, true);
    } else {
      this.startContainer(container, out, true);
    }
    if (flags.has("--rm") && container.status === "exited") this.removeContainer(container);
  }

  private startContainer(c: VContainer, out: TermLine[], attach = false) {
    const image = this.images.find((i) => i.id === c.imageId)!;
    c.status = "running"; c.startedAt = Date.now(); c.finishedAt = undefined; c.exitCode = undefined;
    const cmd = c.cmd.length ? c.cmd : ["/bin/sh"];
    const head = cmd[0];
    const pushLog = (t: string, col?: TermColor) => c.logs.push({ text: t, c: col });
    pushLog(`[container] 启动进程: ${cmd.join(" ")}`, "d");

    // hello-world 特殊剧本
    if (c.imageRef.startsWith("hello-world")) {
      c.logs.push(...HELLO_LOG.map((l) => ({ ...l })));
      c.status = "exited"; c.exitCode = 0; c.finishedAt = Date.now();
      if (attach) c.logs.forEach((l) => out.push({ ...l }));
      return;
    }
    // 一次性命令（echo/ls/cat/env/pwd/cp）→ 立即退出；sleep/sh/node/python 等常驻
    const oneShot = ["echo", "ls", "cat", "env", "pwd", "printenv"].includes(head);
    if (oneShot) {
      if (head === "echo") pushLog(cmd.slice(1).join(" "));
      else if (head === "ls") (image.files["/"] ? Object.keys(image.files).filter((f) => f.split("/").length === 2) : []).forEach((f) => pushLog(f));
      else if (head === "cat" && cmd[1]) { const content = image.files[cmd[1]]; content ? pushLog(content) : (pushLog(`cat: ${cmd[1]}: No such file or directory`, "r"), c.exitCode = 1); }
      else if (head === "env") Object.entries(c.env).forEach(([k, v]) => pushLog(`${k}=${v}`));
      else if (head === "pwd") pushLog(c.env.WORKDIR ?? image.workdir);
      if (c.exitCode === undefined) c.exitCode = 0;
      c.status = "exited"; c.finishedAt = Date.now();
      if (attach) c.logs.forEach((l) => out.push({ ...l }));
      return;
    }
    // 服务型：PORT 环境校验剧本（教学：容器秒退的经典原因）
    const serverKey = Object.keys(image.files).find((f) => f.endsWith("/server.js"));
    if (head === "node" && serverKey) {
      const src = image.files[serverKey];
      if (src.includes("process.env.PORT") && !c.env.PORT) {
        pushLog("Error: PORT environment variable is required", "r");
        pushLog("exiting…", "d");
        c.status = "exited"; c.exitCode = 1; c.finishedAt = Date.now();
        if (attach) c.logs.forEach((l) => out.push({ ...l }));
        return;
      }
      const port = Number(c.env.PORT) || 3000;
      c.httpPort = port;
      pushLog(`server listening on port ${port}`, "g");
    }
    if (head === "nginx") pushLog("/docker-entrypoint.sh: Configuration complete; ready for start up", "d");
    if (head === "redis-server") pushLog("* Ready to accept connections tcp", "g");
    if (attach) c.logs.forEach((l) => out.push({ ...l }));
  }

  private removeContainer(c: VContainer) {
    this.containers = this.containers.filter((x) => x.id !== c.id);
    for (const v of this.volumes) v.mountedBy = v.mountedBy.filter((n) => n !== c.name);
    for (const n of this.networks) n.containers = n.containers.filter((x) => x !== c.name);
  }

  /* ---- ps / images ---- */
  private dockerPs(argv: string[], out: TermLine[]) {
    const { flags } = parseArgs(argv);
    const list = flags.has("-a") ? this.containers : this.containers.filter((c) => c.status === "running");
    if (flags.has("-q")) { list.forEach((c) => out.push({ text: c.id })); return; }
    if (list.length === 0) { out.push({ text: "CONTAINER ID   IMAGE   COMMAND   STATUS   PORTS   NAMES", c: "d" }); out.push({ text: flags.has("-a") ? "(还没有任何容器，用 docker run 创建一个)" : "(没有运行中的容器；docker ps -a 可查看全部)", c: "d" }); return; }
    const row = (c: VContainer) => {
      const status = c.status === "running" ? upFor(c.startedAt!) : c.status === "paused" ? `Up ${ago(c.startedAt!)} (Paused)` : `Exited (${c.exitCode ?? 0}) ${ago(c.finishedAt ?? c.createdAt)}`;
      const ports = c.ports.map((p) => `0.0.0.0:${p.hostPort}->${p.containerPort}/tcp`).join(", ");
      return `${c.id.slice(0, 12)}   ${c.imageRef}   "${c.cmd.join(" ").slice(0, 20)}"   ${status}   ${ports || ""}   ${c.name}`;
    };
    out.push({ text: "CONTAINER ID   IMAGE        STATUS                 PORTS                        NAMES", c: "b" });
    list.forEach((c) => out.push({ text: row(c), c: c.status === "running" ? "w" : "d" }));
  }

  private dockerImages(argv: string[], out: TermLine[]) {
    const { flags } = parseArgs(argv);
    if (flags.has("-q")) { this.images.forEach((i) => out.push({ text: i.id })); return; }
    if (this.images.length === 0) { out.push({ text: "本地还没有镜像。docker pull nginx:alpine 或 docker build 拉取/构建一个。", c: "d" }); return; }
    out.push({ text: "REPOSITORY          TAG          IMAGE ID       SIZE          CREATED", c: "b" });
    this.images.forEach((i) => {
      out.push({ text: `${i.repo.padEnd(20)}${i.tag.padEnd(13)}${i.id.slice(0, 12)}       ${fmtSize(i.layers.reduce((s, l) => s + l.sizeMB, 0)).padEnd(14)}${ago(i.createdAt)}`, c: "w" });
    });
  }

  /* ---- pull / push / search / tag ---- */
  private pullImage(entry: CatalogEntry, out: TermLine[]): VImage {
    const { repo, tag } = entry;
    const MB = [entry.sizeMB * 0.6, entry.sizeMB * 0.15, entry.sizeMB * 0.12, entry.sizeMB * 0.08, entry.sizeMB * 0.05];
    out.push({ text: `${repo}:${tag}: Pulling from library/${repo}`, c: "w" });
    for (let i = 0; i < entry.baseLayers; i++) {
      const s = fmtSize(Math.max(0.01, MB[i % MB.length] / 2));
      out.push({ text: `${rid(8)}: Pull complete  (${s})`, c: "d" });
    }
    out.push({ text: `Digest: sha256:${rid(64)}`, c: "d" });
    out.push({ text: `Status: Downloaded newer image for ${repo}:${tag}`, c: "g" });
    const image = this.catalogToImage(entry);
    this.images.push(image);
    return image;
  }

  private catalogToImage(entry: CatalogEntry): VImage {
    const layers: VLayer[] = [];
    let parent = "";
    for (let i = 0; i < entry.baseLayers; i++) {
      const size = i === 0 ? entry.sizeMB * 0.7 : (entry.sizeMB * 0.3) / Math.max(1, entry.baseLayers - 1);
      const key = `${entry.repo}:${entry.tag}#${i}`;
      const layer: VLayer = { id: rid(6), instruction: i === 0 ? `FROM scratch → ${entry.repo}:${entry.tag} 基础层` : `registry layer #${i}`, sizeMB: Math.round(size * 100) / 100, cacheKey: key };
      layers.push(layer); parent = key;
    }
    return {
      id: rid(12), repo: entry.repo, tag: entry.tag, layers,
      env: {}, entrypoint: [], cmd: entry.cmd ?? ["/bin/sh"], exposed: entry.service ? [entry.service.port] : [],
      workdir: "/", files: { ...(entry.files ?? {}) }, service: entry.service ?? null, createdAt: Date.now(),
    };
  }

  private dockerPull(argv: string[], out: TermLine[]) {
    const { rest } = parseArgs(argv);
    if (!rest[0]) { out.push({ text: `"docker pull" requires at least 1 argument.`, c: "r" }); return; }
    const { repo, tag } = parseImageRef(rest[0]);
    const entry = CATALOG.find((c) => c.repo === repo && c.tag === tag);
    if (!entry) { out.push({ text: `Error response from daemon: pull access denied for ${repo}, repository does not exist`, c: "r" }); return; }
    if (this.findImage(rest[0])) { out.push({ text: `Status: Image is up to date for ${repo}:${tag}`, c: "g" }); return; }
    this.pullImage(entry, out);
  }

  private dockerPush(argv: string[], out: TermLine[]) {
    const { rest } = parseArgs(argv);
    const img = rest[0] ? this.findImage(rest[0]) : null;
    if (!img) { out.push({ text: `An image does not exist locally with the tag: ${rest[0] ?? ""}`, c: "r" }); return; }
    out.push({ text: `The push refers to repository [docker.io/library/${img.repo}]`, c: "d" });
    img.layers.forEach((l) => out.push({ text: `Mounted from library: ${l.id}: Prepared`, c: "d" }));
    out.push({ text: `${img.tag}: digest: sha256:${rid(64)} size: ${fmtSize(img.layers.reduce((s, l) => s + l.sizeMB, 0))}`, c: "g" });
  }

  private dockerSearch(argv: string[], out: TermLine[]) {
    const { rest } = parseArgs(argv);
    if (!rest[0]) return;
    out.push({ text: "NAME               DESCRIPTION                                     STARS", c: "b" });
    CATALOG.filter((c) => c.repo.includes(rest[0].replace(/:.*/, ""))).slice(0, 6).forEach((c) => {
      out.push({ text: `${(c.repo + " " + (c.tag === "latest" ? "" : c.tag)).padEnd(19)}${c.desc.padEnd(48)}${Math.floor(Math.random() * 4000) + 100}` });
    });
  }

  private dockerTag(argv: string[], out: TermLine[]) {
    const { rest } = parseArgs(argv);
    const img = rest[0] ? this.findImage(rest[0]) : null;
    if (!img || !rest[1]) { out.push({ text: "Usage:  docker tag SOURCE_IMAGE TARGET_IMAGE", c: "r" }); return; }
    const { repo, tag } = parseImageRef(rest[1]);
    this.images.push({ ...img, id: img.id, repo, tag, createdAt: Date.now() });
    out.push({ text: `已创建指向同一镜像的标签 ${repo}:${tag}（docker images 可见两行）`, c: "d" });
  }

  /* ---- 删除与生命周期 ---- */
  private dockerRmi(argv: string[], out: TermLine[]) {
    // 同 dockerRm：-f 的 force 语义在这里是布尔旗标，不走 parseArgs（会被 --file 值旗标吞参）
    const force = argv.some((a) => a === "-f" || a === "--force");
    const rest = argv.filter((a) => !a.startsWith("-"));
    const img = rest[0] ? this.findImage(rest[0]) : null;
    if (!img) { out.push({ text: `Error response from daemon: No such image: ${rest[0] ?? ""}`, c: "r" }); return; }
    const users = this.containers.filter((c) => c.imageId === img.id);
    if (users.length && !force) {
      out.push({ text: `Error response from daemon: conflict: unable to remove repository reference "${img.repo}:${img.tag}" (must force) - container ${users[0].name} is using its referenced image`, c: "r" });
      return;
    }
    const ref = `${img.repo}:${img.tag}`;
    this.images = this.images.filter((i) => !(i.repo === img.repo && i.tag === img.tag));
    out.push({ text: `Untagged: ${ref}`, c: "d" });
    out.push({ text: `Deleted: sha256:${rid(64)}`, c: "d" });
  }

  private dockerRm(argv: string[], out: TermLine[]) {
    // 注意：-f 在 rm 里是布尔 force 旗标；parseArgs 的 VALUE_FLAGS 里 -f（--file）优先级更高会吞掉后面的容器名，
    // 所以这里不走 parseArgs，单独解析。
    const force = argv.some((a) => a === "-f" || a === "--force");
    const rest = argv.filter((a) => !a.startsWith("-"));
    for (const n of rest) {
      const c = this.findContainer(n);
      if (!c) { out.push({ text: `Error: No such container: ${n}`, c: "r" }); continue; }
      if (c.status === "running" && !force) { out.push({ text: `Error response from daemon: cannot remove container "${c.name}": container is running; stop the container before removing or force remove`, c: "r" }); continue; }
      this.removeContainer(c);
      out.push({ text: c.name, c: "d" });
    }
  }

  private dockerLifecycle(argv: string[], out: TermLine[], action: "stop" | "kill" | "start" | "restart" | "pause" | "unpause") {
    const { rest } = parseArgs(argv);
    for (const n of rest) {
      const c = this.findContainer(n);
      if (!c) { out.push({ text: `Error response from daemon: No such container: ${n}`, c: "r" }); continue; }
      if (action === "stop" || action === "kill") {
        if (c.status !== "running" && c.status !== "paused") { out.push({ text: `Error response from daemon: Container ${c.id} is not running`, c: "r" }); continue; }
        c.status = "exited"; c.finishedAt = Date.now(); c.exitCode = action === "kill" ? 137 : 0;
        c.logs.push(action === "kill" ? { text: "[container] 收到 SIGKILL，进程立即终止", c: "r" } : { text: "[container] 收到 SIGTERM，优雅退出", c: "d" });
        if (action === "kill") out.push({ text: `${c.name}  (exit 137: SIGKILL，这就是著名 137 错误码的由来)`, c: "y" });
      } else if (action === "start" || action === "restart") {
        if (c.status === "running" && action === "start") { continue; }
        c.logs = [];
        this.startContainer(c, out);
        if (c.status === "exited" && action === "start") out.push({ text: `${c.name} 已退出 (code ${c.exitCode})，用 docker logs ${c.name} 看原因`, c: "y" });
      } else if (action === "pause") {
        if (c.status !== "running") { out.push({ text: `Error response from daemon: Container ${c.id} is not running`, c: "r" }); continue; }
        c.status = "paused";
      } else if (action === "unpause") {
        if (c.status !== "paused") { out.push({ text: `Error response from daemon: Container ${c.id} is not paused`, c: "r" }); continue; }
        c.status = "running";
      }
      out.push({ text: c.name, c: "d" });
    }
  }

  /* ---- logs / exec / inspect / port / stats ---- */
  private dockerLogs(argv: string[], out: TermLine[]) {
    const { values, rest } = parseArgs(argv);
    const c = rest[0] ? this.findContainer(rest[0]) : null;
    if (!c) { out.push({ text: `Error: No such container: ${rest[0] ?? ""}`, c: "r" }); return; }
    const tail = values.get("--tail") ? parseInt(values.get("--tail")!) : undefined;
    const lines = tail ? c.logs.slice(-tail) : c.logs;
    if (lines.length === 0) out.push({ text: "(暂无日志)", c: "d" });
    lines.forEach((l) => out.push({ ...l }));
  }

  private dockerExec(argv: string[], out: TermLine[]) {
    const { flags, values, rest } = parseArgs(argv);
    void flags; void values;
    if (rest.length < 2) { out.push({ text: `Usage:  docker exec CONTAINER COMMAND [ARG...]`, c: "r" }); return; }
    const c = this.findContainer(rest[0]);
    if (!c) { out.push({ text: `Error: No such container: ${rest[0]}`, c: "r" }); return; }
    if (c.status !== "running") { out.push({ text: `Error response from daemon: Container ${c.name} is not running`, c: "r" }); return; }
    const cmd = rest.slice(1);
    const image = this.images.find((i) => i.id === c.imageId)!;
    const head = cmd[0];
    if (head === "curl" && cmd[1]) {
      this.httpRequest(cmd[1], c, out);
      return;
    }
    if (head === "redis-cli" && cmd[1] === "ping") { out.push({ text: "PONG", c: "g" }); return; }
    if (head === "nginx" && cmd[1] === "-v") { out.push({ text: "nginx version: nginx/1.27.0", c: "w" }); return; }
    if (head === "echo") { out.push({ text: cmd.slice(1).join(" ") }); return; }
    if (head === "ls") {
      const target = cmd[1] ?? image.workdir;
      const keys = Object.keys(image.files).filter((f) => (target === "/" ? f.split("/").length <= 2 : f.startsWith(target)));
      if (keys.length === 0) out.push({ text: "ls: cannot access: No such file or directory", c: "r" });
      keys.slice(0, 20).forEach((k) => out.push({ text: k.replace(target === "/" ? "//" : target + "/", "") }));
      return;
    }
    if (head === "cat" && cmd[1]) {
      const content = image.files[cmd[1]];
      if (content) { content.split("\n").forEach((l) => out.push({ text: l })); return; }
      // bind mount 里的文件
      const m = c.mounts.find((x) => x.hostPath && cmd[1]!.startsWith(x.dest));
      if (m) {
        const rel = cmd[1].slice(m.dest.length);
        const hostFile = this.vfs.readFile(m.hostPath + rel);
        if (hostFile) { hostFile.split("\n").forEach((l) => out.push({ text: l })); return; }
      }
      out.push({ text: `cat: ${cmd[1]}: No such file or directory`, c: "r" });
      return;
    }
    if (head === "env") { Object.entries(c.env).forEach(([k, v]) => out.push({ text: `${k}=${v}` })); return; }
    if (["sh", "bash", "sleep", "top"].includes(head)) { out.push({ text: `（沙盒提示：已"进入"容器 ${c.name} 的模拟 shell；试试 ls / env / curl）`, c: "d" }); return; }
    out.push({ text: `OCI runtime exec failed: exec: "${head}": executable file not found in $PATH`, c: "r" });
  }

  private dockerInspect(argv: string[], out: TermLine[]) {
    const { rest } = parseArgs(argv);
    const target = rest[0];
    const c = target ? this.findContainer(target) : null;
    if (c) {
      out.push({ text: JSON.stringify({
        Id: c.id, Name: "/" + c.name, Image: c.imageRef,
        State: { Status: c.status, Running: c.status === "running", Paused: c.status === "paused", ExitCode: c.exitCode ?? 0, OOMKilled: c.exitCode === 137 },
        Config: { Env: Object.entries(c.env).map(([k, v]) => `${k}=${v}`), Cmd: c.cmd, Image: c.imageId },
        NetworkSettings: { Networks: { [c.network]: { NetworkID: this.networks.find((n) => n.name === c.network)?.id ?? "" } }, Ports: Object.fromEntries(c.ports.map((p) => [`${p.containerPort}/tcp`, [{ HostIp: "0.0.0.0", HostPort: String(p.hostPort) }]])) },
        Mounts: c.mounts.map((m) => ({ Type: m.volName ? "volume" : "bind", Name: m.volName, Source: m.hostPath, Destination: m.dest })),
      }, null, 2), c: "c" });
      return;
    }
    const img = target ? this.findImage(target) : null;
    if (img) {
      out.push({ text: JSON.stringify({ Id: img.id, RepoTags: [`${img.repo}:${img.tag}`], Architecture: "amd64", Size: fmtSize(img.layers.reduce((s, l) => s + l.sizeMB, 0)), RootFS: { Type: "layers", Layers: img.layers.map((l) => "sha256:" + rid(64)) }, Config: { Env: Object.keys(img.env).map((k) => `${k}=${img.env[k]}`), ExposedPorts: img.exposed.map((p) => `${p}/tcp`), Cmd: img.cmd } }, null, 2), c: "c" });
      return;
    }
    const v = this.volumes.find((x) => x.name === target);
    if (v) { out.push({ text: JSON.stringify({ Name: v.name, Driver: "local", Mountpoint: v.mountpoint, CreatedAt: new Date(v.createdAt).toISOString() }, null, 2), c: "c" }); return; }
    const n = this.networks.find((x) => x.name === target);
    if (n) { out.push({ text: JSON.stringify({ Name: n.name, Id: n.id, Driver: n.driver, Scope: "local", Subnet: n.subnet, Containers: n.containers.map((x) => ({ Name: x })) }, null, 2), c: "c" }); return; }
    out.push({ text: `Error: No such object: ${target ?? ""}`, c: "r" });
  }

  private dockerPort(argv: string[], out: TermLine[]) {
    const { rest } = parseArgs(argv);
    const c = rest[0] ? this.findContainer(rest[0]) : null;
    if (!c) { out.push({ text: `Error: No such container: ${rest[0] ?? ""}`, c: "r" }); return; }
    if (c.ports.length === 0) { out.push({ text: "(该容器没有发布任何端口)", c: "d" }); return; }
    c.ports.forEach((p) => out.push({ text: `${p.containerPort}/tcp -> 0.0.0.0:${p.hostPort}`, c: "w" }));
  }

  private dockerStats(out: TermLine[]) {
    const running = this.runningContainers();
    out.push({ text: "CONTAINER ID   NAME            CPU %   MEM USAGE / LIMIT", c: "b" });
    if (running.length === 0) { out.push({ text: "(没有运行中的容器)", c: "d" }); return; }
    running.forEach((c) => {
      const mem = c.limits?.memoryMB ? `${(c.limits.memoryMB * 0.3).toFixed(0)}MiB / ${c.limits.memoryMB}MiB` : `${(20 + Math.random() * 80).toFixed(0)}MiB / 3.7GiB`;
      out.push({ text: `${c.id.slice(0, 12)}   ${c.name.padEnd(16)}${(Math.random() * 8).toFixed(2)}%    ${mem}` });
    });
  }

  private dockerHistory(argv: string[], out: TermLine[]) {
    const { rest } = parseArgs(argv);
    const img = rest[0] ? this.findImage(rest[0]) : null;
    if (!img) { out.push({ text: `Error: No such image: ${rest[0] ?? ""}`, c: "r" }); return; }
    out.push({ text: "SIZE          CREATED BY                     (自下而上 = 自旧而新)", c: "b" });
    [...img.layers].reverse().forEach((l) => out.push({ text: `${fmtSize(l.sizeMB).padEnd(14)}${l.instruction.slice(0, 60)}`, c: "w" }));
  }

  private dockerRename(argv: string[], out: TermLine[]) {
    const { rest } = parseArgs(argv);
    const c = rest[0] ? this.findContainer(rest[0]) : null;
    if (!c || !rest[1]) { out.push({ text: "Usage: docker rename CONTAINER NEW_NAME", c: "r" }); return; }
    c.name = rest[1];
    out.push({ text: `已重命名为 ${rest[1]}`, c: "g" });
  }

  /* ---- volume / network / system ---- */
  private dockerVolume(argv: string[], out: TermLine[]) {
    const sub = argv[0];
    if (sub === "ls") {
      if (this.volumes.length === 0) { out.push({ text: "(还没有卷。docker volume create mydata 或 docker run -v mydata:/data …)", c: "d" }); return; }
      out.push({ text: "NAME               MOUNTPOINT", c: "b" });
      this.volumes.forEach((v) => out.push({ text: `${v.name.padEnd(19)}${v.mountpoint}`, c: "w" }));
    } else if (sub === "create") {
      const name = argv[1] ?? rid(12);
      if (this.volumes.find((v) => v.name === name)) { out.push({ text: name, c: "d" }); return; }
      this.volumes.push({ name, mountpoint: `/var/lib/docker/volumes/${name}/_data`, mountedBy: [], createdAt: Date.now() });
      out.push({ text: name, c: "d" });
    } else if (sub === "inspect") {
      const v = this.volumes.find((x) => x.name === argv[1]);
      if (!v) { out.push({ text: `Error: No such volume: ${argv[1] ?? ""}`, c: "r" }); return; }
      out.push({ text: JSON.stringify({ Name: v.name, Mountpoint: v.mountpoint, Driver: "local" }, null, 2), c: "c" });
    } else if (sub === "rm" || sub === "prune") {
      const targets = sub === "prune" ? this.volumes.filter((v) => v.mountedBy.length === 0).map((v) => v.name) : argv.slice(1);
      let removed = 0;
      for (const name of targets) {
        const v = this.volumes.find((x) => x.name === name);
        if (!v) { out.push({ text: `Error: No such volume: ${name}`, c: "r" }); continue; }
        if (v.mountedBy.length) { out.push({ text: `Error response from daemon: remove ${name}: volume is in use - [${v.mountedBy.join(", ")}]`, c: "r" }); continue; }
        this.volumes = this.volumes.filter((x) => x.name !== name);
        removed++;
      }
      if (sub === "prune") out.push({ text: `Total reclaimed space: ${fmtSize(removed * 42)}`, c: "g" });
      else targets.forEach((t) => out.push({ text: t, c: "d" }));
    } else out.push({ text: "Usage: docker volume ls|create|inspect|rm|prune", c: "d" });
  }

  private dockerNetwork(argv: string[], out: TermLine[]) {
    const sub = argv[0];
    if (sub === "ls") {
      out.push({ text: "NETWORK ID     NAME          DRIVER    SCOPE", c: "b" });
      this.networks.forEach((n) => out.push({ text: `${n.id.slice(0, 12)}   ${n.name.padEnd(14)}${n.driver.padEnd(10)}local`, c: "w" }));
    } else if (sub === "create") {
      const name = argv[1];
      if (!name) { out.push({ text: "Usage: docker network create NETWORK", c: "r" }); return; }
      if (this.networks.find((n) => n.name === name)) { out.push({ text: `Error response from daemon: network with name ${name} already exists`, c: "r" }); return; }
      this.networks.push({ name, id: rid(12), subnet: `172.${18 + this.networks.length}.0.0/16`, driver: "bridge", containers: [], createdAt: Date.now() });
      out.push({ text: rid(32), c: "d" });
      out.push({ text: `（自定义网络 ${name} 创建成功——用户自定义网络自带容器名 DNS，可互相用名字访问）`, c: "d" });
    } else if (sub === "connect") {
      const [netName, cName] = [argv[1], argv[2]];
      const n = this.networks.find((x) => x.name === netName);
      const c = cName ? this.findContainer(cName) : null;
      if (!n || !c) { out.push({ text: "Usage: docker network connect NETWORK CONTAINER", c: "r" }); return; }
      c.network = n.name;
      if (!n.containers.includes(c.name)) n.containers.push(c.name);
      out.push({ text: `${c.name} 已接入 ${n.name}`, c: "g" });
    } else if (sub === "disconnect") {
      const n = this.networks.find((x) => x.name === argv[1]);
      if (n) n.containers = n.containers.filter((x) => x !== argv[2]);
      out.push({ text: "disconnected", c: "d" });
    } else if (sub === "rm") {
      const n = this.networks.find((x) => x.name === argv[1]);
      if (!n) { out.push({ text: `Error: No such network: ${argv[1] ?? ""}`, c: "r" }); return; }
      if (n.containers.length) { out.push({ text: `error: network ${n.name} has active endpoints`, c: "r" }); return; }
      if (n.name === "bridge") { out.push({ text: "error: predefined network bridge cannot be removed", c: "r" }); return; }
      this.networks = this.networks.filter((x) => x.name !== n.name);
      out.push({ text: `${n.name} 已删除`, c: "d" });
    } else if (sub === "inspect") {
      this.dockerInspect(["network", argv[1] ?? ""].filter(Boolean), out);
    } else out.push({ text: "Usage: docker network ls|create|connect|disconnect|rm|inspect", c: "d" });
  }

  private dockerSystem(argv: string[], out: TermLine[]) {
    if (argv[0] === "df") {
      const imgSize = this.images.reduce((s, i) => s + i.layers.reduce((x, l) => x + l.sizeMB, 0), 0);
      const uniq = imgSize * 0.85;
      out.push({ text: "TYPE            TOTAL   ACTIVE   SIZE", c: "b" });
      out.push({ text: `Images          ${this.images.length}       ${this.images.length}        ${fmtSize(imgSize)}` });
      out.push({ text: `Containers      ${this.containers.length}       ${this.runningContainers().length}        ${fmtSize(this.containers.length * 1.2)}` });
      out.push({ text: `Local Volumes   ${this.volumes.length}       ${this.volumes.filter((v) => v.mountedBy.length).length}        ${fmtSize(this.volumes.length * 42)}` });
      out.push({ text: `Build Cache     ${this.buildCache.size}       0        ${fmtSize([...this.buildCache.values()].reduce((s, l) => s + l.sizeMB, 0))}`, c: "d" });
      void uniq;
    } else out.push({ text: "Usage: docker system df|prune", c: "d" });
  }

  /* ============================================================
   * docker build 解释器（支持多阶段 / 缓存）
   * ============================================================ */
  private dockerBuild(argv: string[], out: TermLine[]) {
    const { values, flags, rest } = parseArgs(argv);
    const ctxPath = rest.find((r) => !r.startsWith("-")) ?? ".";
    const dir = this.vfs.normalize(ctxPath, this.cwd);
    if (!this.vfs.isDir(dir)) { out.push({ text: `unable to prepare context: path "${ctxPath}" not found`, c: "r" }); return; }
    const dfPath = dir + "/" + (values.get("-f") ?? "Dockerfile");
    const df = this.vfs.readFile(dfPath);
    if (df === null) { out.push({ text: `unable to prepare context: Dockerfile not found at ${dfPath}`, c: "r" }); return; }
    const tag = values.get("-t") ?? rid(6);
    const { repo, tag: tagPart } = parseImageRef(tag);

    out.push({ text: `[+] Building (sandbox buildkit)`, c: "b" });

    const instructions = parseDockerfile(df);
    if (instructions.length === 0) { out.push({ text: "dockerfile parse error: empty dockerfile", c: "r" }); return; }
    interface Stage { name: string; base?: VImage; layers: VLayer[]; files: Record<string, string>; env: Record<string, string>; workdir: string; exposed: number[]; cmd: string[]; entrypoint: string[]; service?: ServiceSpec | null }
    const stages = new Map<string, Stage>();
    let current: Stage | null = null;
    let parentKey = "";
    let step = 0;
    const total = instructions.length;

    const fail = (msg: string) => { out.push({ text: `ERROR: ${msg}`, c: "r" }); return true; };

    for (const ins of instructions) {
      step++;
      const label = `[${step}/${total}]`;
      if (ins.kw === "FROM") {
        const parts = ins.args.split(/\s+/);
        const baseRef = parts[0];
        const asName = (parts[2] ?? parts[0]).toLowerCase();
        let base = this.findImage(baseRef) ?? (stages.get(baseRef.toLowerCase()) ? undefined : undefined);
        if (!base) {
          const { repo: br, tag: bt } = parseImageRef(baseRef);
          const entry = CATALOG.find((c) => c.repo === br && c.tag === bt);
          if (entry) { out.push({ text: `${label} DONE`, c: "d" }); out.push({ text: ` => => resolve docker.io/library/${br}:${bt}`, c: "d" }); base = this.pullImage(entry, out); }
          else if (stages.has(baseRef.toLowerCase())) { const s = stages.get(baseRef.toLowerCase())!; base = s.base ?? undefined; }
          else { fail(`base image "${baseRef}" not found（本地与 registry 均无）`); return; }
        }
        current = { name: asName, base, layers: base ? base.layers.map((l) => ({ ...l })) : [], files: { ...(base?.files ?? {}) }, env: { ...(base?.env ?? {}) }, workdir: base?.workdir ?? "/", exposed: [], cmd: base?.cmd ?? [], entrypoint: base?.entrypoint ?? [], service: base?.service ?? null };
        stages.set(asName, current);
        parentKey = `from:${baseRef}`;
        out.push({ text: `${label} FROM ${baseRef}${parts[2] ? " AS " + parts[2].toUpperCase() : ""}`, c: "c" });
        continue;
      }
      if (!current) { fail(`指令 ${ins.kw} 出现在 FROM 之前`); return; }

      const cacheable = ["RUN", "COPY", "ADD"].includes(ins.kw);
      let layerFilesDelta: Record<string, string> | null = null;
      const filesHash = ins.kw === "COPY" || ins.kw === "ADD" ? hashStr(JSON.stringify(ins.args) + contextFingerprint(this.vfs, dir)) : "";
      const cacheKey = `${parentKey}::${ins.kw} ${ins.args}${filesHash}`;
      const hit = cacheable && !flags.has("--no-cache") ? this.buildCache.get(cacheKey) : undefined;
      if (hit) {
        current.layers.push({ ...hit, cached: true });
        out.push({ text: `${label} CACHED  ${ins.kw} ${ins.args.slice(0, 50)}`, c: "g" });
        parentKey = cacheKey;
        continue;
      }
      out.push({ text: `${label} ${ins.kw} ${ins.args.slice(0, 56)}`, c: "c" });

      let sizeMB = 0;
      if (ins.kw === "RUN") {
        sizeMB = estimateRunSize(ins.args);
        out.push({ text: `       → 执行命令（估算新增 ${fmtSize(sizeMB)}）`, c: "d" });
      } else if (ins.kw === "COPY" || ins.kw === "ADD") {
        const fromStage = ins.args.match(/^--from=(\S+)\s+/);
        const copyArgs = fromStage ? ins.args.slice(fromStage[0].length) : ins.args;
        const parts = copyArgs.split(/\s+/);
        const dest = parts.pop()!;
        if (fromStage) {
          const srcStage = stages.get(fromStage[1].toLowerCase());
          if (!srcStage) { fail(`stage "${fromStage[1]}" 不存在（多阶段构建要先 FROM … AS build）`); return; }
          for (const [p, content] of Object.entries(srcStage.files)) {
            if (p.startsWith(parts[0])) current.files[dest + p.slice(parts[0].length)] = content;
          }
          out.push({ text: `       → 从 ${fromStage[1]} 阶段复制产物（不带入其历史层！）`, c: "y" });
        } else {
          for (const src of parts) {
            const abs = this.vfs.normalize(src === "." ? dir : src.startsWith("/") ? src : dir + "/" + src, dir);
            if (this.vfs.isFile(abs)) {
              const content = this.vfs.readFile(abs)!;
              // docker 语义：dest 以 / 结尾、是 "."、或已是镜像里的目录 → 当目录拼文件名；否则 dest 就是目标文件本身（覆盖）
              const destBase = dest.replace(/\/$/, "");
              const looksLikeDir = dest.endsWith("/") || dest === "." || dest === "./" || Object.keys(current.files).some((p) => p.startsWith(destBase + "/"));
              const targetPath = looksLikeDir ? destBase + "/" + abs.split("/").pop() : destBase;
              current.files[targetPath] = content;
              layerFilesDelta = { ...(layerFilesDelta ?? {}), [targetPath]: content };
              sizeMB += Math.max(0.01, content.length / 1024 / 1024);
            } else if (this.vfs.isDir(abs)) {
              for (const [p, content] of collectFiles(this.vfs, abs)) {
                const rel = p.slice(abs.length);
                const targetPath = (dest.replace(/\/$/, "") === "/" ? "" : dest.replace(/\/$/, "")) + "/" + rel.replace(/^\//, "");
                current.files[targetPath] = content;
                layerFilesDelta = { ...(layerFilesDelta ?? {}), [targetPath]: content };
                sizeMB += Math.max(0.01, content.length / 1024 / 1024);
              }
            } else { out.push({ text: `       → copy failed: ${src} 不存在于构建上下文（是否漏了 .dockerignore 之外的文件？）`, c: "r" }); }
          }
          out.push({ text: `       → 从上下文复制进层（+${fmtSize(sizeMB)}）`, c: "d" });
        }
      } else if (ins.kw === "ENV") {
        const i = ins.args.indexOf(" ");
        if (i > 0) current.env[ins.args.slice(0, i)] = ins.args.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      } else if (ins.kw === "WORKDIR") {
        current.workdir = ins.args.startsWith("/") ? ins.args : (current.workdir === "/" ? "" : current.workdir) + "/" + ins.args;
        current.files[current.workdir + "/.workdir"] = "";
      } else if (ins.kw === "EXPOSE") {
        ins.args.split(/\s+/).forEach((p) => current!.exposed.push(parseInt(p)));
      } else if (ins.kw === "CMD") {
        current.cmd = parseDockerArray(ins.args);
      } else if (ins.kw === "ENTRYPOINT") {
        current.entrypoint = parseDockerArray(ins.args);
      } else if (ins.kw === "USER" || ins.kw === "LABEL" || ins.kw === "ARG") {
        // 记录为元数据层
      } else if (ins.kw === "VOLUME") {
        out.push({ text: `       → 声明匿名卷（现实中会为该路径创建随机卷）`, c: "d" });
      } else {
        fail(`unsupported instruction: ${ins.kw}`);
        return;
      }

      const layer: VLayer = { id: rid(6), instruction: `${ins.kw} ${ins.args.slice(0, 60)}`, sizeMB: Math.round(Math.max(0, sizeMB) * 100) / 100, cacheKey, ...(layerFilesDelta ? { filesAdded: layerFilesDelta } : {}) };
      if (cacheable) this.buildCache.set(cacheKey, layer);
      current.layers.push(layer);
      parentKey = cacheKey;
    }

    const finalStage = current!;
    const totalSize = finalStage.layers.reduce((s, l) => s + l.sizeMB, 0);
    const image: VImage = {
      id: rid(12), repo, tag: tagPart, layers: finalStage.layers,
      env: finalStage.env, entrypoint: finalStage.entrypoint, cmd: finalStage.cmd,
      exposed: finalStage.exposed, workdir: finalStage.workdir,
      files: finalStage.files, service: finalStage.base?.service ?? null, createdAt: Date.now(),
    };
    this.images = this.images.filter((i) => !(i.repo === repo && i.tag === tagPart));
    this.images.push(image);
    out.push({ text: `naming to docker.io/library/${repo}:${tagPart}  done (${fmtSize(totalSize)})`, c: "g" });
    const fat = totalSize > 800;
    if (fat) out.push({ text: `💡 这个体重 ${fmtSize(totalSize)} — 去挑战「镜像瘦身」看看它能瘦到多少`, c: "y" });
  }

  /* ============================================================
   * compose（内置极简 YAML 解析）
   * ============================================================ */
  private dockerCompose(argv: string[], out: TermLine[]) {
    const sub = argv[0];
    const composePath = this.vfs.normalize("docker-compose.yml", this.cwd);
    const doc = this.vfs.readFile(composePath);
    if (!doc) { out.push({ text: `no configuration file provided: not found (${composePath})`, c: "r" }); return; }
    let cfg: Record<string, unknown>;
    try { cfg = parseMiniYaml(doc) as Record<string, unknown>; } catch (e) { out.push({ text: `yaml parse error: ${(e as Error).message}`, c: "r" }); return; }
    const services = (cfg.services ?? {}) as Record<string, Record<string, unknown>>;
    const project = this.cwd.split("/").filter(Boolean).pop() ?? "app";

    if (sub === "config") { out.push({ text: JSON.stringify(cfg, null, 2), c: "c" }); return; }
    if (sub === "up" || sub === "down" || sub === "restart") {
      if (sub === "down") {
        let removed = 0;
        for (const c of [...this.containers]) {
          if (c.project === project) { this.removeContainer(c); removed++; }
        }
        const netName = `${project}_default`;
        this.networks = this.networks.filter((n) => n.name !== netName);
        out.push({ text: `✔ 已停止并移除 ${removed} 个容器与网络 ${netName}`, c: "g" });
        return;
      }
      const netName = `${project}_default`;
      if (!this.networks.find((n) => n.name === netName)) this.networks.push({ name: netName, id: rid(12), subnet: "172.28.0.0/16", driver: "bridge", containers: [], createdAt: Date.now() });
      const names = Object.keys(services);
      const ordered = [...names].sort((a, b) => {
        const da = (services[a]?.depends_on as string[]) ?? [];
        const db = (services[b]?.depends_on as string[]) ?? [];
        if (da.includes(b)) return 1;
        if (db.includes(a)) return -1;
        return 0;
      });
      for (const svc of ordered) {
        const s = services[svc] ?? {};
        const imageRef = String(s.image ?? "");
        if (!imageRef) { out.push({ text: `service ${svc}: image 必填`, c: "r" }); continue; }
        const cname = String(s.container_name ?? `${project}-${svc}-1`);
        if (this.findContainer(cname)) { out.push({ text: `✔ Container ${cname}  Running`, c: "y" }); continue; }
        const portsArg = (Array.isArray(s.ports) ? s.ports : []).map(String).join(",");
        const vols = (Array.isArray(s.volumes) ? s.volumes : []).map(String);
        const envEntries = composeEnv(s.environment);
        const runArgs = ["-d", "--name", cname, "--project", project, "--network", netName];
        for (const p of portsArg.split(",").filter(Boolean)) runArgs.push("-p", p.trim());
        for (const v of vols) runArgs.push("-v", v.trim());
        for (const [k, v] of envEntries) runArgs.push("-e", `${k}=${v}`);
        runArgs.push(imageRef);
        out.push({ text: `⠿ Container ${cname}  Creating…`, c: "d" });
        this.dockerRun(runArgs, out);
        if (this.findContainer(cname)?.status === "running") out.push({ text: `✔ Container ${cname}  Started`, c: "g" });
      }
      out.push({ text: `（compose up 完成；容器都挂在自定义网络 ${netName} 上，可用服务名互访）`, c: "d" });
      return;
    }
    if (sub === "ps") {
      const mine = this.containers.filter((c) => c.project === project);
      if (!mine.length) { out.push({ text: "(没有由 compose 管理的容器)", c: "d" }); return; }
      this.dockerPs([], out);
      return;
    }
    out.push({ text: "Usage: docker compose up|down|ps|config", c: "d" });
  }

  /* ============================================================
   * 宿主机 shell（终端里 docker 之外的部分）
   * ============================================================ */
  private shell(argv: string[], raw: string, out: TermLine[]) {
    // 处理重定向 echo/cat ... > file
    const redir = raw.match(/\s(>>?)\s*(\S+)\s*$/);
    let body = raw;
    let target: string | null = null;
    let append = false;
    if (redir && (argv[0] === "echo" || argv[0] === "cat")) {
      body = raw.slice(0, redir.index);
      target = redir[2];
      append = redir[1] === ">>";
      argv = tokenize(body);
    }
    const cmd = argv[0];
    const emit = (lines: TermLine[]) => {
      if (target) {
        const path = this.vfs.normalize(target, this.cwd);
        const prev = append ? this.vfs.readFile(path) ?? "" : "";
        this.vfs.writeFile(path, prev + lines.map((l) => l.text).join("\n") + "\n");
        return;
      }
      lines.forEach((l) => out.push(l));
    };
    switch (cmd) {
      case "pwd": out.push({ text: this.cwd }); break;
      case "whoami": out.push({ text: "root" }); break;
      case "cd": {
        const t = argv[1] ?? "~";
        const p = this.vfs.normalize(t, this.cwd);
        if (this.vfs.isDir(p)) this.cwd = p;
        else out.push({ text: `cd: ${t}: No such file or directory`, c: "r" });
        break;
      }
      case "ls": {
        const { flags, rest } = parseArgs(argv.slice(1));
        const p = this.vfs.normalize(rest[0] ?? ".", this.cwd);
        if (!this.vfs.isDir(p)) { out.push({ text: `ls: cannot access '${rest[0] ?? p}': No such file or directory`, c: "r" }); break; }
        const entries = this.vfs.list(p);
        if (flags.has("-q") && !flags.has("-l")) { entries.forEach((e) => out.push({ text: e.name })); break; }
        if (entries.length === 0) break;
        entries.forEach((e) => out.push({ text: (e.type === "dir" ? "d " : "- ") + e.name.padEnd(24) + (e.type === "file" ? fmtSize(e.size) : ""), c: e.type === "dir" ? "c" : "w" }));
        break;
      }
      case "cat": {
        const p = this.vfs.normalize(argv[1] ?? "", this.cwd);
        const content = this.vfs.readFile(p);
        if (content === null) out.push({ text: `cat: ${argv[1] ?? ""}: No such file or directory`, c: "r" });
        else emit(content.split("\n").map((l) => ({ text: l })));
        break;
      }
      case "echo": emit([{ text: argv.slice(1).join(" ") }]); break;
      case "mkdir": {
        const { flags, rest } = parseArgs(argv.slice(1));
        for (const r of rest) {
          const p = this.vfs.normalize(r, this.cwd);
          if (this.vfs.exists(p) && !flags.has("-p")) { out.push({ text: `mkdir: cannot create directory '${r}': File exists`, c: "r" }); continue; }
          this.vfs.mkdirp(p);
        }
        break;
      }
      case "touch": {
        for (const r of argv.slice(1)) {
          const p = this.vfs.normalize(r, this.cwd);
          if (!this.vfs.isFile(p)) this.vfs.writeFile(p, "");
        }
        break;
      }
      case "rm": {
        const { flags, rest } = parseArgs(argv.slice(1));
        for (const r of rest) {
          const p = this.vfs.normalize(r, this.cwd);
          if (!this.vfs.exists(p)) { out.push({ text: `rm: cannot remove '${r}': No such file or directory`, c: "r" }); continue; }
          if (this.vfs.isDir(p) && !flags.has("-r")) { out.push({ text: `rm: cannot remove '${r}': Is a directory`, c: "r" }); continue; }
          this.vfs.rm(p);
        }
        break;
      }
      case "curl": {
        const url = argv.find((a, i) => i > 0 && !a.startsWith("-")) ?? "";
        if (url) this.httpRequest(url, null, out, argv.includes("-s"));
        else out.push({ text: "curl: try `curl http://localhost:8080`", c: "d" });
        break;
      }
      case "tree": {
        const p = this.vfs.normalize(argv[1] ?? ".", this.cwd);
        this.vfs.dirTree(p).forEach((l) => out.push({ text: l, c: "w" }));
        break;
      }
      case "help": {
        [
          "本机 shell:  pwd / cd / ls / cat / echo(> file 重定向) / mkdir / touch / rm / curl / tree / clear(按钮)",
          "Docker 常用: docker run / ps / images / pull / build / logs / exec / stop / rm / rmi",
          "进阶:        docker volume … / network … / compose up|down / system df / history / inspect",
          "提示:        右侧面板点击任意对象 → 底部会出现对应的 docker 命令，点「填入终端」即可执行",
        ].forEach((l) => out.push({ text: l, c: "c" }));
        break;
      }
      default:
        out.push({ text: `${cmd}: command not found（输入 help 看沙盒支持的命令）`, c: "r" });
    }
  }

  /* ---- HTTP 模拟：宿主机 curl 与容器内 curl 共用 ---- */
  private httpRequest(url: string, from: VContainer | null, out: TermLine[], silent = false) {
    const m = url.match(/^(https?:\/\/)?([^/:]+)(?::(\d+))?(\/.*)?$/);
    if (!m) { out.push({ text: `curl: (3) URL rejected: ${url}`, c: "r" }); return; }
    const host = m[2];
    const port = m[3] ? parseInt(m[3]) : 80;
    const path = m[4] ?? "/";
    if (host === "localhost" || host === "127.0.0.1") {
      if (from) { out.push({ text: `curl: (7) Failed to connect to localhost port ${port}: Connection refused`, c: "r" }); return; }
      const c = this.runningContainers().find((x) => x.ports.some((p) => p.hostPort === port) && x.httpPort);
      if (!c) { out.push({ text: `curl: (7) Failed to connect to localhost port ${port}: Connection refused`, c: "r" }); return; }
      this.serveHttp(c, path, out, silent);
      return;
    }
    // 容器名 → 仅自定义网络可解析（默认 bridge 无 DNS，这是真实行为！）
    const target = this.runningContainers().find((x) => x.name === host || x.imageRef.split(":")[0] === host);
    if (target) {
      const net = this.networks.find((n) => n.name === target.network);
      const sameNet = from && (target.network === from.network);
      if (!from) { out.push({ text: `curl: (6) Could not resolve host: ${host}（宿主机不在容器网络里，宿主机只能通过映射的端口访问）`, c: "r" }); return; }
      if (net && net.name === "bridge" && !sameNet) { /* unreachable */ }
      if (target.network === "bridge" && net?.name === "bridge") {
        out.push({ text: `curl: (6) Could not resolve host: ${host}`, c: "r" });
        out.push({ text: `（默认 bridge 网络没有内置 DNS——创建自定义网络后才能用容器名互访）`, c: "y" });
        return;
      }
      if (target.httpPort && target.httpPort === port) { this.serveHttp(target, path, out, silent); return; }
      if (target.httpPort && port !== target.httpPort) { out.push({ text: `curl: (7) Failed to connect to ${host} port ${port}: Connection refused`, c: "r" }); return; }
      out.push({ text: `curl: (56) Recv failure: Connection reset by peer（${host} 不是 HTTP 服务）`, c: "r" });
      return;
    }
    out.push({ text: from ? `curl: (6) Could not resolve host: ${host}` : `curl: (6) Could not resolve host: ${host}`, c: "r" });
  }

  private serveHttp(c: VContainer, _path: string, out: TermLine[], silent: boolean) {
    void _path;
    const image = this.images.find((i) => i.id === c.imageId)!;
    const isNodeServer = Object.keys(image.files).some((f) => f.endsWith("/server.js"));
    // 优先读镜像 rootfs 里真实的 index.html（docker build 的 COPY 会覆盖它），而不是基础镜像预设的默认页
    let index = image.files["/usr/share/nginx/html/index.html"] ?? image.service?.index ?? (isNodeServer ? "hello from node in container" : "OK");
    for (const mnt of c.mounts) {
      if (mnt.dest.startsWith("/usr/share/nginx/html") && mnt.hostPath) {
        const f = this.vfs.readFile(mnt.hostPath + "/index.html");
        if (f) index = f;
      }
      if (mnt.volName) {
        const vol = this.volumes.find((v) => v.name === mnt.volName);
        void vol;
      }
    }
    if (!silent) index.split("\n").slice(0, 12).forEach((l) => out.push({ text: l, c: "w" }));
    const stamp = new Date().toISOString();
    c.logs.push({ text: `172.17.0.1 - - [${stamp}] "GET / HTTP/1.1" 200 ${index.length} "-" "curl/8.5.0"`, c: "d" });
    if (!silent) out.push({ text: `（✓ 请求命中容器 ${c.name}；docker logs ${c.name} 能看到这条 access log）`, c: "d" });
  }
}

/* ============================================================
 * build 辅助
 * ============================================================ */

interface RawInstruction { kw: string; args: string }

function parseDockerfile(text: string): RawInstruction[] {
  const out: RawInstruction[] = [];
  let pending = "";
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/#.*$/, "").trimEnd();
    if (!line.trim()) continue;
    pending = pending ? pending + " " + line.trim() : line;
    if (pending.trimEnd().endsWith("\\")) { pending = pending.trimEnd().slice(0, -1); continue; }
    const m = pending.match(/^\s*(\w+)\s+([\s\S]+)$/);
    if (m) out.push({ kw: m[1].toUpperCase(), args: m[2].trim() });
    pending = "";
  }
  return out;
}

function parseDockerArray(args: string): string[] {
  const t = args.trim();
  if (t.startsWith("[")) {
    try { const arr = JSON.parse(t); if (Array.isArray(arr)) return arr.map(String); } catch { /* fallthrough */ }
  }
  return tokenize(t);
}

const PKG_SIZE: Record<string, number> = {
  curl: 3, wget: 2, git: 32, bash: 5, nginx: 16, nodejs: 95, npm: 20, python3: 52, "py3-pip": 12,
  openjdk17: 300, openjdk: 290, gcc: 190, "g++": 205, make: 12, "build-base": 185, ffmpeg: 125,
  "postgresql-dev": 42, "musl-dev": 9, "linux-headers": 6, "libc-dev": 15, vim: 35, htop: 1,
};

function estimateRunSize(args: string): number {
  let size = 0;
  const lower = args.toLowerCase();
  const pkgMatch = [...lower.matchAll(/(?:apk\s+(?:--no-cache\s+)?add|apt-get\s+install(?:-y)?|apt\s+install(?:-y)?)\s+([^\n&;]+)/g)];
  for (const m of pkgMatch) {
    for (const p of m[1].split(/\s+/)) {
      const clean = p.replace(/[-=].*$/, "").replace(/[^\w-]/g, "");
      if (!clean || ["-y", "--no-install-recommends", "update", "upgrade", "install"].includes(clean)) continue;
      size += PKG_SIZE[clean] ?? 8;
    }
  }
  if (/pip\d?\s+install/.test(lower)) {
    size += /--no-cache-dir/.test(lower) ? 24 : 34;
    if (/torch|tensorflow/.test(lower)) size += 900;
    else if (/pandas|numpy|scipy/.test(lower)) size += 120;
    else if (/fastapi|flask|django|uvicorn|express/.test(lower)) size += 12;
  }
  if (/npm\s+(ci|install)/.test(lower)) {
    size += /express|koa|fastify/.test(lower) ? 22 : /--omit=dev|--production/.test(lower) ? 40 : 160;
  }
  if (/rm\s+-rf\s+\/var\/lib\/apt/.test(lower)) size -= 28;
  if (/rm\s+-rf\s+\/var\/cache\/apk/.test(lower)) size -= 6;
  if (size < 0.2) size = 0.2;
  return Math.round(size * 100) / 100;
}

function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

function contextFingerprint(vfs: VFS, dir: string): string {
  return hashStr(collectFiles(vfs, dir).map(([p, c]) => p + ":" + c.length).join("|"));
}

function collectFiles(vfs: VFS, dir: string): [string, string][] {
  const out: [string, string][] = [];
  const walk = (p: string) => {
    for (const e of vfs.list(p)) {
      const full = (p === "/" ? "" : p) + "/" + e.name;
      if (e.type === "file") out.push([full, vfs.readFile(full) ?? ""]);
      else walk(full);
    }
  };
  if (vfs.isDir(dir)) walk(dir);
  return out;
}

/* ============================================================
 * 极简 YAML（compose 教学子集：map / list / scalar）
 * ============================================================ */

export function parseMiniYaml(text: string): unknown {
  const lines = text.split("\n").map((l) => l.replace(/(^|\s)#.*$/, "")).filter((l) => l.trim());
  let i = 0;
  const parseBlock = (indent: number): unknown => {
    if (i >= lines.length) return null;
    const first = lines[i];
    const curIndent = first.match(/^\s*/)![0].length;
    if (curIndent < indent) return null;
    if (first.trimStart().startsWith("- ")) {
      const arr: unknown[] = [];
      while (i < lines.length) {
        const l = lines[i];
        const ind = l.match(/^\s*/)![0].length;
        if (ind !== curIndent || !l.trimStart().startsWith("-")) break;
        arr.push(parseScalar(l.trimStart().slice(2).trim()));
        i++;
      }
      return arr;
    }
    const obj: Record<string, unknown> = {};
    while (i < lines.length) {
      const l = lines[i];
      const ind = l.match(/^\s*/)![0].length;
      if (ind !== curIndent) break;
      const kv = l.trim().match(/^([^:]+):\s*(.*)$/);
      if (!kv) throw new Error(`无法解析行: "${l}"（沙盒 YAML 仅支持 key: value / 列表 / 缩进嵌套）`);
      const key = kv[1].trim();
      const val = kv[2].trim();
      i++;
      if (val) obj[key] = parseScalar(val);
      else obj[key] = parseBlock(curIndent + 2);
    }
    return obj;
  };
  return parseBlock(0);
}

function parseScalar(s: string): unknown {
  const t = s.trim().replace(/^["']|["']$/g, "");
  if (/^\d+$/.test(t)) return parseInt(t);
  if (t === "true") return true;
  if (t === "false") return false;
  return t;
}

function composeEnv(env: unknown): [string, string][] {
  const out: [string, string][] = [];
  if (Array.isArray(env)) {
    for (const e of env.map(String)) { const i = e.indexOf("="); if (i > 0) out.push([e.slice(0, i), e.slice(i + 1)]); }
  } else if (env && typeof env === "object") {
    for (const [k, v] of Object.entries(env as Record<string, unknown>)) out.push([k, String(v)]);
  }
  return out;
}

/* ============================================================
 * 挑战/课程任务的谓词检查
 * ============================================================ */

export function evaluateCheck(e: ContainerEngine, p: import("@/types").CheckPredicate): boolean {
  switch (p.type) {
    case "imageExists": return !!e.findImage(p.ref);
    case "imageSizeLtMb": {
      const img = e.findImage(p.ref);
      if (!img) return false;
      return img.layers.reduce((s, l) => s + l.sizeMB, 0) < p.mb;
    }
    case "containerRunning": {
      const c = e.findContainer(p.name);
      return !!c && c.status === "running";
    }
    case "containerGone": return !e.findContainer(p.name);
    case "portBound": return e.boundHostPorts().has(p.hostPort);
    case "volumeExists": return e.volumes.some((v) => v.name === p.name);
    case "networkHasContainer": {
      const n = e.networks.find((x) => x.name === p.network);
      return !!n && n.containers.includes(p.container);
    }
    case "curlOk": {
      const m = p.url.match(/localhost:(\d+)/);
      if (!m) return false;
      return e.runningContainers().some((c) => c.ports.some((x) => x.hostPort === Number(m[1])) && c.httpPort);
    }
    case "commandRan": return e.commandHistory.some((h) => h.includes(p.keyword));
    default: return false;
  }
}

/* ============================================================
 * 初始环境（宿主机文件 + 工程脚手架）
 * ============================================================ */

const FAT_DOCKERFILE = `FROM node:20
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "server.js"]
`;

const SLIM_HINT_DOCKERFILE = `# TODO: 这是一个 1GB+ 的胖镜像。
# 目标：用多阶段构建把最终镜像压到 200MB 以内。
# 思路：阶段 1 用 node:20 装 node_modules；阶段 2 用 node:20-alpine 只拷贝产物。

FROM node:20
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "server.js"]
`;

const SERVER_JS = `const http = require("http");
const port = process.env.PORT;
if (!port) {
  console.error("Error: PORT environment variable is required");
  process.exit(1);
}
http.createServer((req, res) => {
  res.end("hello from node in container");
}).listen(port, () => console.log("server listening on port " + port));
`;

const BROKEN_SERVER_JS = SERVER_JS;

const SIMPLE_DOCKERFILE = `FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
`;

const SIMPLE_INDEX = `<!DOCTYPE html>
<html><head><title>我的第一个容器网站</title></head>
<body><h1>你好，容器世界！</h1><p>由 docker build 构建，nginx:alpine 提供。</p></body>
</html>`;

const COMPOSE_YML = `services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - site:/usr/share/nginx/html
    depends_on:
      - cache
  cache:
    image: redis:alpine
volumes:
  site:
`;

export function createSeedEngine(): ContainerEngine {
  const e = new ContainerEngine();
  e.networks.push({ name: "bridge", id: rid(12), subnet: "172.17.0.0/16", driver: "bridge", containers: [], createdAt: Date.now() });
  // /root/app —— 镜像瘦身挑战的"胖应用"
  e.vfs.mkdirp("/root/app");
  e.vfs.writeFile("/root/app/Dockerfile", FAT_DOCKERFILE);
  e.vfs.writeFile("/root/app/Dockerfile.slim-template", SLIM_HINT_DOCKERFILE);
  e.vfs.writeFile("/root/app/server.js", SERVER_JS);
  e.vfs.writeFile("/root/app/package.json", '{\n  "name": "fat-app",\n  "dependencies": { "express": "^4.19.0" }\n}\n');
  // /root/web —— Dockerfile 第一课的素材
  e.vfs.mkdirp("/root/web");
  e.vfs.writeFile("/root/web/Dockerfile", SIMPLE_DOCKERFILE);
  e.vfs.writeFile("/root/web/index.html", SIMPLE_INDEX);
  // /root/broken —— 容器秒退挑战
  e.vfs.mkdirp("/root/broken");
  e.vfs.writeFile("/root/broken/Dockerfile", "FROM node:20-alpine\nWORKDIR /app\nCOPY server.js .\nCMD [\"node\", \"server.js\"]\n");
  e.vfs.writeFile("/root/broken/server.js", BROKEN_SERVER_JS);
  // /root/stack —— compose 素材
  e.vfs.mkdirp("/root/stack");
  e.vfs.writeFile("/root/stack/docker-compose.yml", COMPOSE_YML);
  e.vfs.writeFile("/root/README.md", "欢迎来到容器沙盒。输入 help 查看支持的命令。\n");
  return e;
}
