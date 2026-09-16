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
    quickCommands: ["docker images", "cat Dockerfile", "docker build -t app:slim .", "docker run -d --name slim-app -e PORT=3000 -p 3000:3000 app:slim", "curl localhost:3000", "docker ps -a"],
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
    quickCommands: ["docker ps -a", "docker logs web", "docker run -d --name web-fix -e PORT=3000 -p 3000:3000 app:v1", "curl localhost:3000"],
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
    quickCommands: ["docker network ls", "docker exec dashboard curl http://api:80", "docker network create appnet", "docker network connect appnet api", "docker network connect appnet dashboard", "docker rm -f legacy-api"],
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
    quickCommands: ["docker volume ls", "docker volume create uploaddata", "docker run -d --name notes-v2 -v uploaddata:/usr/share/nginx/html nginx:alpine", "docker rm -f notes", "docker volume rm uploaddata"],
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
    quickCommands: ["cat docker-compose.yml", "docker compose up -d", "curl localhost:8080", "docker compose ps", "docker compose down", "curl localhost:8081"],
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
  {
    id: "restart-storm",
    slug: "restart-storm",
    title: "重启风暴：restart=always 救不了配置错误",
    difficulty: "中等",
    minutes: 20,
    icon: "🔁",
    story:
      "你学乖了，这次上线特意加了 --restart=always，心想容器挂了自己会爬起来，稳了。结果容器在 Restarting (1) 里无限循环，一个请求都没接住。重启策略能解决「进程偶发崩溃」，但它治不了「每次启动都崩」——那是配置或镜像的问题。",
    scene:
      "终端已在 /root/flaky：应用 app:flaky 已构建并用 --restart=always 启动了容器 web，此刻它正在无限重启。config.json 明明就在宿主机目录里——为什么镜像里没有它？",
    initialCommands: ["cd /root/flaky", "docker build -t app:flaky .", "docker run -d --name web --restart=always app:flaky", "docker ps"],
    editableFile: "/root/flaky/Dockerfile",
    quickCommands: ["docker ps", "docker logs web", "cat Dockerfile", "docker rm -f web", "docker build -t app:flaky .", "docker run -d --name web-ok -p 3000:3000 -v /root/flaky/config.json:/etc/app/config.json app:flaky", "curl localhost:3000"],
    goals: [
      {
        id: "g1",
        desc: "查看 web 的日志，找到它反复退出的根因（docker logs web）",
        check: { type: "commandRan", keyword: "docker logs" },
        hint: "docker logs web——最后一行 Cannot find module '/etc/app/config.json' 就是答案：server.js 要读配置，但 Dockerfile 里没有 COPY 它。",
      },
      {
        id: "g2",
        desc: "先止血：把还在无限重启的旧容器 web 删掉（docker rm -f web）",
        check: { type: "containerGone", name: "web" },
        hint: "正在无限重启的容器先干掉：docker rm -f web。排查清楚之前，让它在后台空转只会消耗资源。",
      },
      {
        id: "g3",
        desc: "修复后用新容器 web-ok 把服务跑起来：把 COPY config.json /etc/app/config.json 加进 Dockerfile 重新 build，或者不改镜像、run 时 -v /root/flaky/config.json:/etc/app/config.json 挂进去",
        check: { type: "containerRunning", name: "web-ok" },
        hint: "推荐配置外置：docker run -d --name web-ok -p 3000:3000 -v /root/flaky/config.json:/etc/app/config.json app:flaky。也可以走重建路线：编辑器里给 Dockerfile 加一行 COPY config.json /etc/app/config.json，docker build -t app:flaky . 后再 run。",
      },
      {
        id: "g4",
        desc: "curl localhost:3000 确认服务活了",
        check: { type: "curlOk", url: "localhost:3000" },
        hint: "curl localhost:3000 能拿到 200 响应才算修复完成。",
      },
    ],
    solution: [
      "docker ps                     # web 一直 Restarting (1)",
      "docker logs web               # Error: Cannot find module '/etc/app/config.json'",
      "docker rm -f web              # 止血",
      "# 路线 A：docker run -d --name web-ok -p 3000:3000 -v /root/flaky/config.json:/etc/app/config.json app:flaky",
      "# 路线 B：Dockerfile 加 COPY config.json /etc/app/config.json → docker build -t app:flaky . → docker run -d --name web-ok -p 3000:3000 app:flaky",
      "curl localhost:3000",
    ],
    takeaway:
      "restart policy 的适用场景是「偶发崩溃后自愈」，而 CrashLoopBackOff 式的死循环说明是**确定性错误**：配置缺失、依赖没装、端口被占——重试一万次也是同一个死法。Docker 侧用 exit code + docker logs 3 分钟定位；到了 K8s 侧就是 kubectl describe + events。另外记住这题的深层教训：**配置文件不进镜像**——要么挂载，要么环境变量，镜像只管代码。",
  },
  {
    id: "log-flood",
    slug: "log-flood",
    title: "磁盘告警：日志把宿主机写爆了",
    difficulty: "中等",
    minutes: 20,
    icon: "🧯",
    story:
      "运维半夜@你：那台宿主机磁盘 95%！你 df -h 一查，/var/lib/docker 之下全是容器的 json-file 日志——某个服务每个请求都打一行日志，从上线到现在攒了 4.2GB，而且没有任何轮转上限。日志要打，但得给它一个天花板。",
    scene:
      "终端已在 /root/logspam：日志大户 app:spammy 已构建，容器 spam-web 正在跑。先 docker logs spam-web 感受一下什么叫刷屏，再想想怎么给它装上轮转阀门。",
    initialCommands: ["cd /root/logspam", "docker build -t app:spammy .", "docker run -d --name spam-web app:spammy"],
    quickCommands: ["docker logs spam-web", "docker rm -f spam-web", "docker run -d --name web-quiet --log-opt max-size=10m --log-opt max-file=3 -p 3000:3000 app:spammy", "curl localhost:3000", "docker logs web-quiet"],
    goals: [
      {
        id: "g1",
        desc: "复现症状：docker logs spam-web，看到刷屏日志和 4.2GB 的告警说明",
        check: { type: "commandRan", keyword: "docker logs" },
        hint: "docker logs spam-web——除了业务日志，最后两行会告诉你：json-file 驱动默认无上限，这就是磁盘的慢性毒药。",
      },
      {
        id: "g2",
        desc: "止血：删掉日志大户旧容器 spam-web（docker rm -f spam-web）",
        check: { type: "containerGone", name: "spam-web" },
        hint: "docker rm -f spam-web。日志上限是容器级配置，老容器改不了，只能重建。",
      },
      {
        id: "g3",
        desc: "带轮转重建：docker run -d --name web-quiet --log-opt max-size=10m --log-opt max-file=3 -p 3000:3000 app:spammy",
        check: { type: "containerRunning", name: "web-quiet" },
        hint: "docker run -d --name web-quiet --log-opt max-size=10m --log-opt max-file=3 -p 3000:3000 app:spammy——单文件 10MB，最多留 3 份，磁盘占用封顶 30MB。",
      },
      {
        id: "g4",
        desc: "curl localhost:3000 确认服务活着，再 docker logs web-quiet 看轮转生效的提示",
        check: { type: "curlOk", url: "localhost:3000" },
        hint: "curl localhost:3000 触发检测；再看 docker logs web-quiet，最后会有「日志轮转已生效」的确认行。",
      },
    ],
    solution: [
      "docker logs spam-web          # json-file 无上限，已写 4.2GB",
      "docker rm -f spam-web",
      "docker run -d --name web-quiet --log-opt max-size=10m --log-opt max-file=3 -p 3000:3000 app:spammy",
      "curl localhost:3000",
      "docker logs web-quiet         # ✓ 日志轮转已生效",
    ],
    takeaway:
      "Docker 默认日志驱动 json-file **没有大小上限**——单个长跑容器能把宿主机磁盘静默写爆，这是新手生产事故榜第一名。止血用 --log-opt max-size + max-file（单文件上限 + 滚动份数）；治本要回到应用侧：别在循环里打无价值的日志，访问日志交给专门日志系统（EFK/Loki）收走。K8s 里的对应物是 kubelet 的 containerLogMaxSize，默认 10MB 轮转。",
  },
  {
    id: "port-conflict",
    slug: "port-conflict",
    title: "新容器起不来：port is already allocated",
    difficulty: "简单",
    minutes: 15,
    icon: "🚧",
    story:
      "交接文档说新版本 web-v2 监听 8080。你按文档 docker run，结果 daemon 直接怼回来一句 port is already allocated。8080 被谁占了？十有八九是上一任没下线的旧容器，还在后台安详地监听着同一个端口。",
    scene:
      "终端里有一个旧容器 legacy 正占着 8080 端口（上一任交接时忘了下线）。你现在要按文档启动 web-v2——先亲眼看一次报错，再顺着报错把它修好。",
    initialCommands: ["docker run -d --name legacy -p 8080:80 nginx:alpine"],
    quickCommands: ["docker run -d --name web-v2 -p 8080:80 nginx:alpine", "docker ps", "docker rm -f legacy", "docker run -d --name web-v2 -p 8080:80 nginx:alpine", "curl localhost:8080"],
    goals: [
      {
        id: "g1",
        desc: "复现故障：docker run -d --name web-v2 -p 8080:80 nginx:alpine，看到 port is already allocated",
        check: { type: "commandRan", keyword: "web-v2" },
        hint: "直接照文档执行：docker run -d --name web-v2 -p 8080:80 nginx:alpine——daemon 会拒绝绑定：8080 已被占用。",
      },
      {
        id: "g2",
        desc: "docker ps 找到占用 8080 的旧容器 legacy",
        check: { type: "commandRan", keyword: "docker ps" },
        hint: "docker ps——PORTS 列里那行 0.0.0.0:8080->80 就是占用者 legacy。生产上还可以用 lsof -i:8080 或 ss -tlnp 从宿主机侧定位。",
      },
      {
        id: "g3",
        desc: "下线旧实例：docker rm -f legacy",
        check: { type: "containerGone", name: "legacy" },
        hint: "docker rm -f legacy（-f 是因为它还在运行）。端口随容器删除而释放。",
      },
      {
        id: "g4",
        desc: "重新启动 web-v2：docker run -d --name web-v2 -p 8080:80 nginx:alpine",
        check: { type: "containerRunning", name: "web-v2" },
        hint: "端口释放后原命令就能跑：docker run -d --name web-v2 -p 8080:80 nginx:alpine。注意 g1 那次失败不会留下 web-v2 容器，直接重跑即可。",
      },
      {
        id: "g5",
        desc: "curl localhost:8080 验证新版本上线",
        check: { type: "curlOk", url: "localhost:8080" },
        hint: "curl localhost:8080——能拿到 nginx 欢迎页说明端口交接完成。",
      },
    ],
    solution: [
      "docker run -d --name web-v2 -p 8080:80 nginx:alpine   # ✗ port is already allocated",
      "docker ps                                             # 找到 legacy 占着 0.0.0.0:8080->80",
      "docker rm -f legacy",
      "docker run -d --name web-v2 -p 8080:80 nginx:alpine",
      "curl localhost:8080",
    ],
    takeaway:
      "port is already allocated 的排查链：**报错 → docker ps 看 PORTS 列 → rm -f 旧容器 → 重启**。两个防复发习惯：①给长命容器起名字、写 compose 文件，交接时不会留下无主容器；②端口分配有登记（compose 文件就是登记本），否则「换端口重跑」看似快，三个月后没人记得 8081~8099 里住着谁。",
  },
  {
    id: "ci-cache",
    slug: "ci-cache",
    title: "CI 慢如牛：改一行代码，重装全部依赖",
    difficulty: "中等",
    minutes: 25,
    icon: "⚡",
    story:
      "同事抱怨：CI 每次构建 8 分钟，改个文案也要重装全部 npm 依赖。你翻开 Dockerfile 看了两行就笑了——COPY . . 排在 RUN npm install 前面。构建缓存的规则就一条：**某一层变了，它后面的所有层全部作废**。依赖层想命中缓存，就必须站在「最常变的东西」前面。",
    scene:
      "终端已在 /root/ci。先 docker build -t app:v2 . 感受全量构建；再 echo '// rebuilt' >> server.js 模拟改一行代码后重新构建——你会看到 npm install 层跟着全量重跑。编辑器里就是那份层序反了的 Dockerfile。",
    initialCommands: ["cd /root/ci", "cat Dockerfile", "docker build -t app:v2 ."],
    editableFile: "/root/ci/Dockerfile",
    quickCommands: ["cat Dockerfile", "docker build -t app:v2 .", "echo '// rebuilt' >> server.js", "docker run -d --name ci-app -p 3000:3000 app:v2", "curl localhost:3000"],
    goals: [
      {
        id: "g1",
        desc: "构建 app:v2（此时每层都全量执行），记住每层的耗时感受",
        check: { type: "imageExists", ref: "app:v2" },
        hint: "docker build -t app:v2 .——注意 RUN npm install 这层是实打实执行的（有「估算新增体积」那行）。",
      },
      {
        id: "g2",
        desc: "模拟改代码：echo '// rebuilt' >> server.js，然后重新构建——观察 RUN npm install 层跟着全量重跑",
        check: { type: "commandRan", keyword: "// rebuilt" },
        hint: "echo '// rebuilt' >> server.js 后再 docker build -t app:v2 .——COPY . . 这层的指纹因 server.js 变化而失效，npm install 排在它后面也被连坐。",
      },
      {
        id: "g3",
        desc: "重排层序并重建：把 COPY package.json . 和 RUN npm install 挪到 COPY . . 之前；之后再改代码重新构建，RUN npm install 应显示 CACHED",
        check: { type: "buildCacheHit", instruction: "RUN npm install" },
        hint: "四步：①编辑器里把 COPY package.json . 和 RUN npm install 提到 COPY . . 上面；②docker build -t app:v2 .（新顺序的第一次构建仍会全量，缓存链在这次重建）；③echo '// rebuilt' >> server.js；④再 docker build -t app:v2 . ——这次 COPY package.json CACHED → RUN npm install CACHED，只有 COPY . . 重跑。",
      },
      {
        id: "g4",
        desc: "docker run -d --name ci-app -p 3000:3000 app:v2 并 curl localhost:3000 验证",
        check: { type: "curlOk", url: "localhost:3000" },
        hint: "docker run -d --name ci-app -p 3000:3000 app:v2，然后 curl localhost:3000。",
      },
    ],
    solution: [
      "docker build -t app:v2 .                       # 全量构建",
      "echo '// rebuilt' >> server.js",
      "docker build -t app:v2 .                       # npm install 被连坐重跑",
      "# 编辑 Dockerfile：把 COPY package.json . 和 RUN npm install 提到 COPY . . 之前",
      "docker build -t app:v2 .                       # 新顺序首次构建（重建缓存链）",
      "echo '// rebuilt' >> server.js",
      "docker build -t app:v2 .                       # ✓ RUN npm install CACHED",
      "docker run -d --name ci-app -p 3000:3000 app:v2",
      "curl localhost:3000",
    ],
    takeaway:
      "构建缓存像多米诺：**某层失效，其后所有层连环作废**。所以层序的黄金法则是「最常变的放最后」：依赖清单（package.json/requirements.txt）→ 装依赖 → 源码 → 构建。Docker 对 COPY 的缓存判定精确到源文件——COPY package.json . 只看 package.json，源码再怎么改它都岿然不动。这一招通常能把 CI 构建时间从分钟级压到秒级，是所有容器工程师的必修课。",
  },
  {
    id: "oom-kill",
    slug: "oom-kill",
    title: "exit 137：容器被内核杀了",
    difficulty: "中等",
    minutes: 15,
    icon: "💥",
    story:
      "压测报告：服务跑着跑着就没了，重启日志毫无头绪。你 docker ps -a 扫了一眼：Exited (137)。137 = 128 + 9，SIGKILL——但这次不是你 docker kill 的，是内核的 OOM Killer：容器内存用量顶穿了 cgroup 限额，内核挑 biggest victim 直接处决。",
    scene:
      "终端已备好 alpine 镜像。用 -m 给容器设一个内存限额，再让 stress 进程申请超限的内存——亲眼看一次 137 是怎么诞生的。",
    initialCommands: ["docker pull alpine"],
    quickCommands: ["docker run -d --name mem-hog -m 256m alpine stress --vm 1 --vm-bytes 512m", "docker ps -a", "docker inspect mem-hog", "docker logs mem-hog", "docker run -d --name mem-ok -m 512m alpine stress --vm 1 --vm-bytes 256m"],
    goals: [
      {
        id: "g1",
        desc: "复现 OOM：docker run -d --name mem-hog -m 256m alpine stress --vm 1 --vm-bytes 512m",
        check: { type: "commandRan", keyword: "stress" },
        hint: "docker run -d --name mem-hog -m 256m alpine stress --vm 1 --vm-bytes 512m——申请 512MB 但限额 256MB，必死无疑。",
      },
      {
        id: "g2",
        desc: "确认死因：docker inspect mem-hog，看 State 里的 OOMKilled: true 和 ExitCode: 137",
        check: { type: "commandRan", keyword: "docker inspect" },
        hint: "docker inspect mem-hog——State 字段里 OOMKilled: true。日常排障记口诀：137 = 128 + 9 = SIGKILL，先怀疑 OOM。",
      },
      {
        id: "g3",
        desc: "对症下药：调大限额或减小压力，让 mem-ok 稳定运行：docker run -d --name mem-ok -m 512m alpine stress --vm 1 --vm-bytes 256m",
        check: { type: "containerRunning", name: "mem-ok" },
        hint: "docker run -d --name mem-ok -m 512m alpine stress --vm 1 --vm-bytes 256m——申请 256MB < 限额 512MB，stress 正常空转，docker ps 里它稳稳 Up。",
      },
    ],
    solution: [
      "docker run -d --name mem-hog -m 256m alpine stress --vm 1 --vm-bytes 512m",
      "docker ps -a                # mem-hog Exited (137)",
      "docker inspect mem-hog      # OOMKilled: true",
      "docker run -d --name mem-ok -m 512m alpine stress --vm 1 --vm-bytes 256m",
      "docker ps                   # mem-ok 稳定运行",
    ],
    takeaway:
      "exit 137 不是一种错误，是两种 SIGKILL：你亲手 docker kill，或内核 OOM Killer 代劳。区分方法：docker inspect 看 OOMKilled 字段。要点：**-m 限额是保护，不是惩罚**——没有限额的容器一旦内存泄漏，会拖死整台宿主机上的邻居（这在 K8s 里对应 requests/limits，超 limit 同样 OOMKilled）。给容器设限额 + 给应用做内存画像，是上线前的两道保险。",
  },
];
