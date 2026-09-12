import type { Challenge } from "@/types";

export const challenges: Challenge[] = [
  {
    id: "image-slim",
    slug: "image-slim",
    title: "镜像瘦身：从 1.2GB 到 200MB 以内",
    difficulty: "困难",
    minutes: 30,
    icon: "📦",
    story:
      "你接手了团队的 Node 服务。CI 构建一次要 10 分钟，每次发布下载 1.2GB 的镜像，机房磁盘天天告警。主管放话：两周内把镜像瘦下来，否则 '优化成本' 就先优化你。别慌，多阶段构建就是为这一刻而生的。",
    scene:
      "左侧终端已进入 /root/app 并把胖镜像 app:fat 构建好了。下方编辑器打开的就是那份'祖传 Dockerfile'——你可以直接改写它，然后用 docker build -t app:slim . 构建瘦身版。",
    initialCommands: ["cd /root/app", "docker build -t app:fat .", "docker images"],
    editableFile: "/root/app/Dockerfile",
    goals: [
      {
        id: "g1",
        desc: "构建出名为 app:slim 的镜像（docker build -t app:slim .）",
        check: { type: "imageExists", ref: "app:slim" },
        hint: "改完 Dockerfile 后：docker build -t app:slim . 。推荐用多阶段：第一阶段 node:20 装依赖，第二阶段 node:20-alpine 只拷产物。",
      },
      {
        id: "g2",
        desc: "app:slim 体积 < 200MB（用 docker images 验证）",
        check: { type: "imageSizeLtMb", ref: "app:slim", mb: 200 },
        hint: "关键三板斧：① 最终阶段 FROM node:20-alpine（130MB）而不是 node:20（1050MB）；② 依赖只装一次，用 COPY --from 从构建阶段搬产物；③ 别把没用的文件 COPY 进来。",
      },
      {
        id: "g3",
        desc: "把 slim 镜像以容器跑起来：docker run -d --name slim-app -e PORT=3000 -p 3000:3000 app:slim，并 curl localhost:3000 验证",
        check: { type: "curlOk", url: "localhost:3000" },
        hint: "这个服务的启动命令是 node server.js，它要求 PORT 环境变量（想想为什么——这是第 2 个挑战的伏笔）。记得 curl localhost:3000 触发检测。",
      },
    ],
    solution: [
      "# /root/app/Dockerfile（多阶段构建）",
      "FROM node:20 AS build",
      "WORKDIR /app",
      "COPY package.json .",
      "RUN npm install",
      "",
      "FROM node:20-alpine",
      "WORKDIR /app",
      "COPY --from=build /app/node_modules ./node_modules",
      "COPY server.js .",
      "EXPOSE 3000",
      'CMD ["node", "server.js"]',
      "",
      "docker build -t app:slim .",
      "docker run -d --name slim-app -e PORT=3000 -p 3000:3000 app:slim",
      "curl localhost:3000",
    ],
    takeaway:
      "多阶段构建的本质：把「编译期依赖」和「运行期依赖」切进两个镜像，最终镜像只带走产物。node:20 与 node:20-alpine 差 900MB，差的只是完整 Debian 用户态——应用往往根本不需要它。记住顺口溜：依赖层放下面，代码层放上面，基础镜像挑 alpine。",
  },
  {
    id: "crash-loop",
    slug: "crash-loop",
    title: "凌晨 3 点：容器一启动就退出",
    difficulty: "简单",
    minutes: 15,
    icon: "🌙",
    story:
      "凌晨 3 点，值班群炸了：新版本 web 服务上线后容器反复秒退，页面 502。同事们还在睡，你打开笔记本——好消息是，这类问题的第一现场永远藏在日志里。",
    scene:
      "终端已经把当前版本构建成镜像 app:v1 并启动了容器 web——但它是退着的。先 docker ps -a 看状态，再想想第一步该干什么。",
    initialCommands: ["docker build -t app:v1 /root/broken", "docker run -d --name web app:v1", "docker ps -a"],
    goals: [
      {
        id: "g1",
        desc: "查看故障容器的日志，找到退出原因（用 docker logs web）",
        check: { type: "commandRan", keyword: "docker logs" },
        hint: "docker logs web 会打印容器主进程的标准输出和标准错误——秒退的容器，答案几乎总在这里。",
      },
      {
        id: "g2",
        desc: "找到根因后，用正确的环境变量把服务跑起来：docker run -d --name web-fix -e PORT=3000 -p 3000:3000 app:v1",
        check: { type: "containerRunning", name: "web-fix" },
        hint: "日志里说了缺什么，就补什么：docker run -d --name web-fix -e PORT=3000 -p 3000:3000 app:v1",
      },
      {
        id: "g3",
        desc: "curl localhost:3000 确认服务活了",
        check: { type: "curlOk", url: "localhost:3000" },
        hint: "容器跑起来只是第一步， curl localhost:3000 能拿到响应才算真正恢复业务。",
      },
    ],
    solution: [
      "docker ps -a                # 看到 web Exited (1)",
      "docker logs web             # Error: PORT environment variable is required",
      "docker run -d --name web-fix -e PORT=3000 -p 3000:3000 app:v1",
      "curl localhost:3000",
    ],
    takeaway:
      "排障第一定律：容器秒退，先 docker logs，不要猜。退出码也有暗号——1 是进程自己报错退出，137 是被 SIGKILL（常见于 OOM），0 是正常收工。这个挑战里的根因「容器内缺少必需的环境变量」是生产环境 Top 3 的翻车原因，K8s 里对应的就是 ConfigMap/Secret 没挂对。",
  },
];
