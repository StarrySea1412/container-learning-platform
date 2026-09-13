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
  {
    id: "network-dns",
    slug: "network-dns",
    title: "微服务互相找不到：ping 得通但访问不了",
    difficulty: "中等",
    minutes: 20,
    icon: "🌐",
    story:
      "你们把单体拆成了微服务：api 负责接口，dashboard 是运维面板。上线第一天面板就报「Could not resolve host: api」。运维老张说重启就好——重启了三遍，还在报。你隐约记得课程里说过：默认网络的容器，是没有名字的。",
    scene:
      "终端里 api、dashboard、旧实例 legacy-api 已经起在默认 bridge 网络上。你可以先试试 docker exec dashboard curl http://api:80 复现故障，再动手组网。",
    initialCommands: [
      "docker run -d --name api -p 3000:80 nginx:alpine",
      "docker run -d --name dashboard nginx:alpine",
      "docker run -d --name legacy-api -p 3001:80 nginx:alpine",
    ],
    goals: [
      {
        id: "g1",
        desc: "创建自定义网络 appnet，并把 api 接进去（docker network create appnet → docker network connect appnet api）",
        check: { type: "networkHasContainer", network: "appnet", container: "api" },
        hint: "两步：docker network create appnet，然后 docker network connect appnet api。自定义网络自带容器名 DNS——这是它和默认 bridge 最大的区别。",
      },
      {
        id: "g2",
        desc: "把 dashboard 也接进 appnet",
        check: { type: "networkHasContainer", network: "appnet", container: "dashboard" },
        hint: "同一个套路：docker network connect appnet dashboard。要在同一个自定义网络里，容器名才能互相解析。",
      },
      {
        id: "g3",
        desc: "从 dashboard 容器里用容器名访问 api：docker exec dashboard curl http://api:80",
        check: { type: "commandRan", keyword: "curl http://api:80" },
        hint: "docker exec dashboard curl http://api:80 ——注意是容器名 api 而不是 IP。能拿到 nginx 欢迎页就说明 DNS 生效了。顺便试试在宿主机上 curl http://api:80？它会失败：容器名 DNS 只在容器网络内部生效。",
      },
      {
        id: "g4",
        desc: "架构迁移完成，下线旧实例 legacy-api（docker rm -f legacy-api）",
        check: { type: "containerGone", name: "legacy-api" },
        hint: "旧的不去新的不来：docker rm -f legacy-api（-f 是因为它还在跑）。",
      },
    ],
    solution: [
      "docker exec dashboard curl http://api:80        # 复现故障：Could not resolve host",
      "docker network create appnet",
      "docker network connect appnet api",
      "docker network connect appnet dashboard",
      "docker exec dashboard curl http://api:80        # ✓ DNS 生效，返回欢迎页",
      "docker rm -f legacy-api",
    ],
    takeaway:
      "默认 bridge 有个反直觉的设计：容器互通靠 IP，没有名字解析——这是历史兼容行为，不是能力缺失。生产纪律：**凡是需要互相访问的容器，一律放进同一个自定义网络**。另外记住两个「够不着」：宿主机够不着容器名（只能用映射端口），别的网络里的容器也够不着。compose 用户其实一直在享受这条福利——compose up 自动建的自定义网络就带 DNS。",
  },
  {
    id: "volume-persist",
    slug: "volume-persist",
    title: "用户上传的文件去哪了",
    difficulty: "简单",
    minutes: 15,
    icon: "🗄️",
    story:
      "运营在群里吼：上周传的素材全没了！你一查——那台机器周末被清理脚本重建过容器，而应用把上传文件写在自己的可写层里。可写层的命运你在课程里学过：容器删除，随葬。现在给数据找一个容器之外的.freeze。",
    scene:
      "终端里已经起了 notes（nginx:alpine），用户上传都写在它的可写层。你需要用命名卷把数据搬到容器外，再用新容器接上它，最后收掉旧容器。",
    initialCommands: ["docker run -d --name notes nginx:alpine"],
    goals: [
      {
        id: "g1",
        desc: "创建命名卷 uploaddata（docker volume create uploaddata，或直接在 run -v 里隐式创建）",
        check: { type: "volumeExists", name: "uploaddata" },
        hint: "docker volume create uploaddata。也可以偷懒：直接写下一步的 docker run -v uploaddata:... ，卷会自动创建——但显式创建更清楚。",
      },
      {
        id: "g2",
        desc: "用命名卷重建容器：docker run -d --name notes-v2 -v uploaddata:/usr/share/nginx/html nginx:alpine",
        check: { type: "containerRunning", name: "notes-v2" },
        hint: "docker run -d --name notes-v2 -v uploaddata:/usr/share/nginx/html nginx:alpine —— 冒号左边是卷名（容器外），右边是容器内挂载点。以后 notes-v2 怎么重建，卷里的数据都在。",
      },
      {
        id: "g3",
        desc: "收尾：删掉旧容器 notes（docker rm -f notes），顺便试试 docker volume rm uploaddata——看看为什么删不掉",
        check: { type: "containerGone", name: "notes" },
        hint: "docker rm -f notes。删完再试 docker volume rm uploaddata：引擎（和真 Docker 一样）会拒绝——卷正被 notes-v2 使用。这层 in-use 保护能防住很多手滑。",
      },
    ],
    solution: [
      "docker volume create uploaddata",
      "docker run -d --name notes-v2 -v uploaddata:/usr/share/nginx/html nginx:alpine",
      "docker rm -f notes",
      "docker volume rm uploaddata   # 报错 in use——保护生效",
    ],
    takeaway:
      "容器可写层 = 草稿纸，卷 = 笔记本。判断标准一句话：**这份数据死了之后还要吗？要，就放卷里（或集群外的存储）。**顺手记住 in-use 保护：有容器挂着的卷删不掉，想删先断开——真 Docker 的 docker volume rm 也是同样的脾气。",
  },
  {
    id: "compose-stack",
    slug: "compose-stack",
    title: "一条命令起一整套服务",
    difficulty: "中等",
    minutes: 20,
    icon: "🎼",
    story:
      "站点的 web + 缓存两个服务，同事交接时留了一堆 docker run 命令，顺序、端口、卷一个都不能抄错。你打开交接文档看了两行就关上了——该用 compose 了。好消息：/root/stack 里已经有一份 docker-compose.yml 草稿。",
    scene:
      "终端已在 /root/stack，先 cat docker-compose.yml 看看这份声明写了什么，然后一条命令把整套服务拉起来。",
    initialCommands: ["cd /root/stack", "cat docker-compose.yml"],
    editableFile: "/root/stack/docker-compose.yml",
    goals: [
      {
        id: "g1",
        desc: "docker compose up -d 一条命令起全套（web 和 cache 两个容器都在跑）",
        check: { type: "containerRunning", name: "stack-web-1" },
        hint: "cd /root/stack 后：docker compose up -d。compose 会按 depends_on 排好顺序，自动建 stack_default 网络（还自带服务名 DNS）。",
      },
      {
        id: "g2",
        desc: "curl localhost:8080 验证 web 服务通了",
        check: { type: "curlOk", url: "localhost:8080" },
        hint: "compose.yml 里写了 ports: 8080:80，所以宿主机 8080 直达 web 容器：curl localhost:8080。",
      },
      {
        id: "g3",
        desc: "声明式改端口：把 compose 文件里的 \"8080:80\" 改成 \"8081:80\"，然后 docker compose down 再 docker compose up -d，curl localhost:8081 验证",
        check: { type: "curlOk", url: "localhost:8081" },
        hint: "compose 是声明式的：改文件 ≠ 生效，要 docker compose down 拆掉旧的再 up 用新声明重建。顺序：编辑文件（点编辑器）→ docker compose down → docker compose up -d → curl localhost:8081。",
      },
    ],
    solution: [
      "cat docker-compose.yml",
      "docker compose up -d",
      "curl localhost:8080",
      "# 把 ports 里 \"8080:80\" 改为 \"8081:80\"（点击编辑器）",
      "docker compose down",
      "docker compose up -d",
      "curl localhost:8081",
    ],
    takeaway:
      "compose 的本质：**把一组 docker run 的全部参数声明成一个 YAML 文件**。三个隐藏福利：①自动建自定义网络（服务名互访，DNS 免费送）；②depends_on 自动排序；③改声明 = down + up 重建，不用记任何临时命令。注意它和 K8s 的距离只差「自愈」——compose 挂了不会自动拉起，调和循环是下一站。",
  },
];
