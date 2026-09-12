import type { Course } from "@/types";

export const courses: Course[] = [
  /* ================= 课程一：容器思想史 ================= */
  {
    id: "why-containers",
    slug: "why-containers",
    title: "容器思想史",
    description: "从「代码为什么在别人机器上跑不起来」讲到 Docker 的诞生。不写一行难懂的命令，先把容器的心智模型建对。",
    track: "docker",
    difficulty: "beginner",
    duration: "45 分钟",
    icon: "🐋",
    tags: ["环境一致性", "历史", "心智模型"],
    chapters: [
      {
        id: "ch-hell",
        slug: "env-hell",
        title: "环境地狱",
        lessons: [
          {
            id: "l-why",
            slug: "why",
            title: "为什么你的代码在别人机器上跑不起来",
            priority: "must-know",
            minutes: 8,
            content: `场景你一定熟悉：你在自己电脑上写好的项目，发给同事——跑不起来。他的 Python 版本旧一点、缺一个系统库、端口被占着，甚至只是时区不对。

传统的解法是写一篇《部署文档》：
1. 先装 Node 20（不能用 18！）
2. 再装 Python 3.12 和 ffmpeg
3. 设置三个环境变量
4. 如果报错 A，执行……如果报错 B……

这份文档的命运几乎注定：**过时、遗漏、没人看**。

## 容器的解法：把环境打包，而不是把环境写进文档

容器的思路是釜底抽薪——既然「程序 + 它依赖的一切」必须同时正确，那就把它们**一起打包成一个镜像**：

> 镜像（Image）= 你的代码 + 运行时 + 系统库 + 配置，一个只读的「应用集装箱」。
> 容器（Container）= 用镜像启动起来的运行实例，就像用类 new 出来的对象。

同事拿到的不再是代码加文档，而是一个镜像——**在你机器上怎么跑，在他机器上就怎么跑**，在测试服务器、在云上也一样。这句「一次构建，到处运行」就是 Docker 2013 年横扫世界的口号。

## 一个必须先纠正的直觉

容器**不是**虚拟机。虚拟机是「模拟一台完整电脑」，而容器只是把你的应用**隔离**在宿主机的一个小房间里，所有容器共享宿主机的内核。这让容器比虚拟机轻 100 倍：启动按秒算，镜像按 MB 算。

不用记原理，先建立一个画面：**镜像是一张只读的光盘，容器是这张光盘的一次播放**。光盘可以复制一万份，每次播放互不影响。`,
            sandboxExercise: {
              task: "去沙盒执行 docker run hello-world，亲眼看一次「用镜像启动容器」的完整流程。注意它跑完就退出了——因为它的任务只是打声招呼。",
              solution: ["docker run hello-world", "docker ps -a   # 能看到它已经 Exited (0)"],
            },
            advanced: [
              {
                title: "面试追问：容器到底比虚拟机轻在哪？",
                body: `三句话版本：
1. **虚拟机**靠 Hypervisor 虚拟出一整套硬件，每个 VM 装一个完整 Guest OS（GB 级、分钟级启动）；
2. **容器**只是一个被 namespace 隔离、被 cgroups 限流的普通 Linux 进程组，共享宿主机内核（MB 级、毫秒级启动）；
3. 所以容器没有「引导开机」的过程，\`docker run\` 实际是 fork 出一批进程再挂上隔离设置。

延伸阅读：OCI（开放容器标准）把镜像格式和运行时定成了行业标准，Docker 只是这个标准的著名实现。`,
                links: [
                  { label: "Open Container Initiative 规范", url: "https://opencontainers.org/" },
                  { label: "moby/moby（Docker 的开源主体）", url: "https://github.com/moby/moby" },
                ],
              },
            ],
          },
          {
            id: "l-history",
            slug: "history",
            title: "从 chroot 到 Docker：一场 34 年的铺垫",
            priority: "important",
            minutes: 10,
            content: `容器不是 2013 年凭空冒出来的。它是一场从 1979 年开始的长跑：

- **1979 · chroot**：Unix 引入「改变进程看到的根目录」，第一次让进程以为自己独占文件系统。这是隔离思想的种子。
- **2000 · FreeBSD jails**：把 chroot 扩展成进程、网络、用户的完整牢笼。
- **2008 · LXC**：Linux 的 namespace + cgroups 成熟，LXC把它们封装成「系统容器」，但它用起来像运维，不像开发。
- **2013 · Docker**：dotCloud 公司把同样的内核技术，换上了三件新衣服——**镜像分层、Dockerfile、Registry**，开发者一行 \`docker run\` 就能跑起来任何东西。

## 技术没变，产品哲学变了

LXC 时代的容器是「轻量级虚拟机」；Docker 把它重新定义成「**应用的交付格式**」。你的应用不再是一坨代码加一份安装文档，而是一个可以版本化、可以推送下载、可以在任何 Linux 上原样运行的镜像。

> 这节课最重要的结论：**Docker 的伟大不在内核技术（那些早就有了），而在把容器变成了开发的默认单位。**`,
            advanced: [
              {
                title: "高手视角：Docker 三件套到底是什么",
                body: `- **namespace**：让进程「看不见」别人的世界（PID/网络/挂载点/用户……六八种命名空间）；
- **cgroups**：给进程套上资源紧箍咒（CPU/内存/IO 配额）；
- **unionfs（overlayfs）**：把多个只读层叠成一个虚拟文件系统，镜像分层因此成立。

本站「原理篇」课程会用交互动画把这三样逐一拆开。`,
                links: [{ label: "namespaces(7) 手册", url: "https://man7.org/linux/man-pages/man7/namespaces.7.html" }],
              },
            ],
          },
          {
            id: "l-vs-vm",
            slug: "vs-vm",
            title: "容器 vs 虚拟机：一张图看懂",
            priority: "must-know",
            minutes: 10,
            demo: "container-vm",
            content: `点上面的动画，在「虚拟机」和「容器」之间切换，观察结构差异。

## 为什么虚拟机重

每个 VM 都要带一个完整的 Guest OS：自己的内核、自己的驱动、自己的系统库。两个应用 = 两个 Guest OS，内存直接翻倍，启动要过完整的开机流程。

## 为什么容器轻

容器共享宿主机的内核，只打包「应用 + 用户态依赖」：

| 维度 | 虚拟机 | 容器 |
|---|---|---|
| 启动时间 | 分钟级 | 秒级 |
| 磁盘占用 | GB 级 | MB 级 |
| 隔离强度 | 强（硬件级） | 中（进程级） |
| 内核 | 每个 VM 独立 | 共享宿主机 |

## 什么时候仍该用虚拟机

容器不是银弹：需要**不同内核**（比如在 Linux 上跑 Windows）、需要**最强隔离**（多租户安全）、或运行**不受信任的代码**时，虚拟机仍然是对的。生产环境常见组合：底层用 VM 隔离安全边界，VM 里面跑容器提升密度——云上的 K8s 节点就是这么叠出来的。`,
            sandboxExercise: {
              task: "在沙盒里同时启动 3 个 nginx 容器，然后用 docker ps 观察它们各自独立、互不影响——如果这是 3 台虚拟机，你的内存已经爆炸了。",
              solution: [
                "docker run -d --name a -p 8081:80 nginx:alpine",
                "docker run -d --name b -p 8082:80 nginx:alpine",
                "docker run -d --name c -p 8083:80 nginx:alpine",
                "docker ps",
              ],
            },
          },
        ],
      },
    ],
    summary: {
      keyPoints: [
        "镜像 = 代码 + 运行时 + 系统库的只读集装箱；容器 = 镜像的一次运行实例",
        "容器不是虚拟机：共享内核、进程级隔离、秒级启动、MB 级体积",
        "Docker 的产品创新（分层镜像 + Dockerfile + Registry）比内核技术更能解释它的成功",
      ],
    },
  },

  /* ================= 课程二：镜像与容器基础 ================= */
  {
    id: "image-basics",
    slug: "image-basics",
    title: "镜像与容器基础",
    description: "亲手完成与容器的第一次握手：拉镜像、跑容器、看日志、进容器、映射端口——每一课都有沙盒任务。",
    track: "docker",
    difficulty: "beginner",
    duration: "60 分钟",
    icon: "🚢",
    tags: ["docker run", "ps", "logs", "exec", "-p"],
    chapters: [
      {
        id: "ch-basics",
        slug: "basics",
        title: "第一次握手",
        lessons: [
          {
            id: "l-image-vs-container",
            slug: "image-vs-container",
            title: "镜像与容器：类和实例",
            priority: "must-know",
            minutes: 10,
            content: `用编程的话说：**镜像是类，容器是实例**。

- \`docker pull nginx:alpine\` 把「类」下载到本地镜像仓库；
- \`docker run nginx:alpine\` 用它 new 出一个「实例」；
- 同一个镜像可以同时跑 N 个容器，彼此完全隔离。

## 先认识命令的三段式

\`\`\`bash
docker  run  -d  -p 8080:80  --name web  nginx:alpine
  │      │    │       │            │           └── 镜像名:标签
  │      │    │       │            └── 给容器起名（不起就随机名）
  │      │    │       └── 端口映射：宿主机8080 → 容器80
  │      │    └── 后台运行（detach）
  └── 客户端命令
\`\`\`

## 跑完就退出 vs 一直运行

容器里必须有**前台进程**：进程在，容器就在；进程结束，容器就退出。

- \`docker run alpine echo hello\` —— echo 完就退（Exited 0）
- \`docker run -d nginx:alpine\` —— nginx 一直挂着，容器一直 Up

这是新手最懵的点：「我的容器怎么秒退了？」——不是坏了，是主进程干完活（或报错）退场了。`,
            sandboxExercise: {
              task: "① docker pull nginx:alpine；② 用它起一个叫 web1 的后台容器，把容器的 80 映射到宿主机 8080；③ curl localhost:8080 验证；④ docker ps 亲眼确认 Up 状态。",
              solution: [
                "docker pull nginx:alpine",
                "docker run -d --name web1 -p 8080:80 nginx:alpine",
                "curl localhost:8080",
                "docker ps",
              ],
            },
            advanced: [
              {
                title: "镜像是怎么寻址的：标签只是内容的别名",
                body: `\`nginx:alpine\` 里的 alpine 只是人类可读的标签。每个镜像真正的身份证是它的 **digest**（sha256 内容哈希）。两次 \`docker pull nginx:alpine\` 之间如果官方推了新版本，你拿到的其实已经是不同的镜像了——生产环境固定版本的标准做法是用 digest 拉取：\`nginx@sha256:...\`。`,
              },
            ],
          },
          {
            id: "l-lifecycle",
            slug: "lifecycle",
            title: "容器生命周期：run / stop / rm 状态机",
            priority: "must-know",
            minutes: 12,
            content: `容器的一生就四个状态：**created → running →（paused）→ exited**，被 rm 后彻底消失。

\`\`\`bash
docker run -d --name web nginx:alpine   # created → running
docker pause web                        # 冻结（进程还在，不调度）
docker unpause web                      # 解冻
docker stop web                         # SIGTERM 优雅退出 → exited(0)
docker kill web                         # SIGKILL 强杀 → exited(137)
docker start web                        # 再次启动（配置保留）
docker rm web                           # 彻底删除（配置也没了）
docker rm -f web                        # 运行中也强删
\`\`\`

## 两个必背细节

**1. stop 和 kill 的退出码是暗号。** 0 = 优雅退出（进程处理了 SIGTERM）；**137 = 128+9，被 SIGKILL**。生产上看到 137，第一反应是「谁强杀了它」——最常见的原因是内存超限被 OOM Killer 干掉。

**2. rm 之前必须先 stop（或 -f）。** 活着的容器不能直接删——这是引擎层的保护，不是规矩，是硬约束。`,
            sandboxExercise: {
              task: "完整走一遍生命周期：起容器 → pause/unpause → stop → ps -a 确认 Exited (0) → start 复活 → 用 docker kill 看 exit 137 → 最后 rm -f 清场。",
              solution: [
                "docker run -d --name life nginx:alpine",
                "docker pause life && docker unpause life",
                "docker stop life",
                "docker ps -a",
                "docker start life",
                "docker kill life",
                "docker ps -a   # 注意 Exited (137)",
                "docker rm -f life",
              ],
            },
            advanced: [
              {
                title: "生产事故复盘：优雅停机为什么总是被跳过",
                body: `docker stop 默认给 10 秒宽限期：先 SIGTERM，10 秒后还活着就 SIGKILL。事故剧本是：应用**没注册 SIGTERM 处理器**，收到信号毫无反应，10 秒后被强杀，正在处理的请求全部断掉，用户侧表现为随机 502。

修复三件套：
1. 应用层捕获 SIGTERM → 停止接新请求 → 处理完存量请求再退出；
2. \`docker stop -t 30\` 给足宽限期；
3. 主进程必须是 PID 1 且能转发信号（见下一条）。`,
                links: [{ label: "krallin/tini：解决 PID 1 问题的 init 容器", url: "https://github.com/krallin/tini" }],
              },
              {
                title: "高手细节：PID 1 与僵尸进程",
                body: `容器里 1 号进程很特殊：内核不给它默认的信号处理行为（SIGTERM 发给 PID 1 若未注册则被忽略），还要替所有孤儿进程「收尸」。所以 \`CMD ["node", "server.js"]\` 直接当 PID 1 会带来两个坑：收不到 SIGTERM、僵尸进程堆积。业界标准解法是入口加 init：\`docker run --init\`（Docker 内置 tini）或在镜像里显式安装 tini。`,
              },
            ],
          },
          {
            id: "l-logs-exec",
            slug: "logs-exec",
            title: "看进容器：logs 与 exec",
            priority: "must-know",
            minutes: 10,
            content: `容器是黑盒？不，它比你想象的透明。

## logs：主进程的 stdout/stderr

\`\`\`bash
docker logs web           # 全部日志
docker logs --tail 50 web # 最后 50 行
docker logs -f web        # 持续跟随（tail -f 同款体验）
\`\`\`

Docker 的设计哲学：**应用把日志打到 stdout/stderr，容器层负责收集**。应用自己不写日志文件——写了反而破坏这条管道。

## exec：在运行的容器里执行命令

\`\`\`bash
docker exec web env            # 看环境变量（排查配置问题的第一现场）
docker exec web ls /usr/share/nginx/html
docker exec -it web sh         # 交互式进入容器 shell（alpine 用 sh 不是 bash）
\`\`\`

\`-it\` = 交互式 + 终端。进去后你可以到处看看，exit 退出——容器随你的退出而继续运行吗？试试就知道（答案：继续，因为 nginx 主进程还活着，你只是开了一个子进程）。`,
            sandboxExercise: {
              task: "起一个 nginx 并 curl localhost:8080 一次，然后 docker logs web——你能在日志里找到刚才那次 HTTP 请求的 access log 吗？再用 docker exec web env 看看环境变量。",
              solution: [
                "docker run -d --name web -p 8080:80 nginx:alpine",
                "curl localhost:8080",
                "docker logs web",
                "docker exec web env",
              ],
            },
            advanced: [
              {
                title: "生产事故复盘：磁盘被日志撑爆",
                body: `Docker 默认日志驱动 json-file **不限制大小**。一个疯狂刷错误的应用 + 一台没人管的宿主机 = \`/var/lib/docker/containers/*/xxx-json.log\` 吃满磁盘，整台机器的所有容器陪葬。

标准修法（daemon.json 全局配置）：
\`\`\`json
{ "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" } }
\`\`\`
注意：只对**新创建**的容器生效，老容器要重建。`,
              },
            ],
          },
          {
            id: "l-ports",
            slug: "ports",
            title: "端口映射：把容器接到本机",
            priority: "must-know",
            minutes: 12,
            demo: "port-map",
            content: `容器网络是隔离的——容器里 nginx 听 80 端口，你 curl localhost:80 是打不通的。需要**端口映射**把两者接起来：

\`\`\`bash
docker run -d -p 8080:80 nginx:alpine
#            └ 宿主机 8080 → 容器 80
curl localhost:8080    # ✓ 通
\`\`\`

## 三个必踩的坑

**坑一：方向记反。** 语法永远是 \`宿主机:容器\`。\`-p 80:8080\` 是把宿主机 80 映射到容器 8080——如果你的 nginx 在容器里听 80，这条映射是空转的。

**坑二：端口冲突。** 宿主机一个端口只能映射给一个容器。第二个容器再抢 8080 会直接报错：\`port is already allocated\`。换端口就好。

**坑三：忘了映射。** 容器跑起来了，curl 不通——先 \`docker port 容器名\` 看映射，八成是压根没写 -p。`,
            sandboxExercise: {
              task: "故意制造一次端口冲突：起两个容器都映射宿主机 8090，观察第二份的报错；然后改成 8091 跑通，用 curl 和 docker port 双重验证。",
              solution: [
                "docker run -d --name w1 -p 8090:80 nginx:alpine",
                "docker run -d --name w2 -p 8090:80 nginx:alpine   # ← 报错 port is already allocated",
                "docker run -d --name w2 -p 8091:80 nginx:alpine",
                "curl localhost:8091",
                "docker port w2",
              ],
            },
            advanced: [
              {
                title: "高手视角：-p 背后发生了什么",
                body: `Docker 在宿主机的 iptables NAT 表里写了一条 DNAT 规则，把 \`0.0.0.0:8080\` 的包改写目标地址送进容器的 veth 网卡。默认另有 userland-proxy 兜底处理 localhost 场景。理解这一层，你就明白为什么「容器间互访不走宿主机端口」（直接走内网），以及为什么防火墙规则动错一条，映射就全挂了。`,
              },
            ],
          },
        ],
      },
    ],
    summary: {
      keyPoints: [
        "镜像=类，容器=实例；同一镜像可并发跑 N 个隔离容器",
        "容器必须有一个前台进程；退出码 0/1/137 是排障暗号",
        "应用日志打 stdout，docker logs 收集；exec 进容器现场排查",
        "-p 宿主机:容器，方向别反；端口冲突报错 port is already allocated",
      ],
    },
  },

  /* ================= 课程三：Dockerfile 精讲 ================= */
  {
    id: "dockerfile",
    slug: "dockerfile",
    title: "Dockerfile 精讲",
    description: "从第一个 Dockerfile 到构建缓存策略。学完这门课，「怎么打包应用」不再是玄学。",
    track: "docker",
    difficulty: "intermediate",
    duration: "70 分钟",
    icon: "📜",
    tags: ["build", "缓存", ".dockerignore", "ENTRYPOINT"],
    chapters: [
      {
        id: "ch-first",
        slug: "first",
        title: "手写镜像",
        lessons: [
          {
            id: "l-first-dockerfile",
            slug: "first-dockerfile",
            title: "第一个 Dockerfile",
            priority: "must-know",
            minutes: 12,
            content: `Dockerfile 是一份「构建说明书」，每行一个指令，从上往下执行。最小可用版只有三行：

\`\`\`dockerfile
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
\`\`\`

- **FROM**：基于哪个现成镜像（一切从站巨人的肩膀开始）
- **COPY**：把构建上下文里的文件拷进镜像
- **EXPOSE**：声明容器会监听的端口（文档性质，真正发布要靠 -p）

## 构建与运行

\`\`\`bash
docker build -t mysite .      # -t 起名，. 是构建上下文（当前目录）
docker run -d --name site -p 8080:80 mysite
curl localhost:8080           # 看到你自己的页面
\`\`\`

沙盒的 \`/root/web\` 目录已经准备好了这份素材，去跑一遍。跑完 \`docker history mysite\` 看看它有几层。`,
            sandboxExercise: {
              task: "cd /root/web → cat Dockerfile 看清三行指令 → docker build -t mysite . → docker run -d --name site -p 8095:80 mysite → curl localhost:8095，看到「你好，容器世界」就算通关。",
              solution: [
                "cd /root/web",
                "cat Dockerfile",
                "docker build -t mysite .",
                "docker run -d --name site -p 8095:80 mysite",
                "curl localhost:8095",
              ],
            },
            advanced: [
              {
                title: "build 的幕后：BuildKit",
                body: `现代 docker build 由 **BuildKit** 驱动：并行调度无依赖的步骤、只把用到的文件送进上下文、支持缓存挂载（RUN --mount=type=cache）。终端里那些 \`[1/5] DONE\` 彩色输出就是 BuildKit 的进度模型。想提 CI 的速，先看 BuildKit 的缓存参数。`,
                links: [{ label: "Dockerfile 官方参考（指令大全）", url: "https://docs.docker.com/reference/dockerfile/" }],
              },
            ],
          },
          {
            id: "l-instructions",
            slug: "instructions",
            title: "指令全景：CMD vs ENTRYPOINT 这场面试大战",
            priority: "must-know",
            minutes: 15,
            content: `常用指令一张表：

| 指令 | 作用 | 备注 |
|---|---|---|
| FROM | 基础镜像 | 多阶段构建会多次出现 |
| RUN | 构建时执行命令 | 产生新层 |
| COPY / ADD | 拷文件进镜像 | COPY 语义清晰，ADD 的自动解压是坑 |
| ENV / ARG | 环境变量 | ENV 运行时可见，ARG 仅构建期 |
| WORKDIR | 工作目录 | 后续指令和运行时都用它 |
| EXPOSE | 声明端口 | 文档性质 |
| CMD / ENTRYPOINT | 启动命令 | 本节主角 |

## CMD vs ENTRYPOINT（面试最爱）

- **CMD**：默认命令，\`docker run 镜像 其他命令\` 会**整个替换**它；
- **ENTRYPOINT**：固定入口，run 传的参数变成它的**附加参数**。

\`\`\`bash
# ENTRYPOINT ["ping"], CMD ["localhost"]
docker run img          → ping localhost（默认）
docker run img 8.8.8.8  → ping 8.8.8.8  （参数被替换的是 CMD 部分）
\`\`\`

记住常用组合：**ENTRYPOINT 定「程序」，CMD 定「默认参数」**。

## exec 形式 vs shell 形式

\`CMD ["node", "app.js"]\`（exec 形式）进程直接是 PID 1，能收信号；
\`CMD node app.js\`（shell 形式）实际是 \`/bin/sh -c\` 包了一层，信号发给 sh 而不是 node——**优雅停机可能失效**。生产一律 exec 形式。`,
            sandboxExercise: {
              task: "cd /root/broken，看看那份 Dockerfile 用的是什么形式。然后随便找一个镜像对比：docker run --rm alpine echo hi 和 docker run --rm --entrypoint echo alpine hi，体会参数替换的位置差异。",
              solution: ["cd /root/broken", "cat Dockerfile", "docker run --rm alpine echo hi", "docker run --rm --entrypoint echo alpine hi"],
            },
            advanced: [
              {
                title: "面试追问：ENTRYPOINT 写成 shell 形式会怎样",
                body: `\`ENTRYPOINT node app.js\` 使 PID 1 变成 /bin/sh，node 变成它的子进程。SIGTERM 到达时：sh 不转发也不响应默认行为 → 应用收不到优雅停机信号 → 宽限期一到被 SIGKILL → 在途请求全断。这是「容器化后随机 502」的经典根因之一，修法永远是：**exec 形式 + 应用自处理 SIGTERM**。`,
              },
            ],
          },
          {
            id: "l-context",
            slug: "context",
            title: "构建上下文与 .dockerignore",
            priority: "important",
            minutes: 10,
            content: `docker build 的最后一个参数（通常是 \`.\`）不是「Dockerfile 在哪」，而是**构建上下文**——整个目录会被打包发给构建引擎。这是理解两个常见问题的钥匙：

## 问题一：为什么 build 突然变得巨慢

\`COPY . .\` + 项目里有 2GB 的 node_modules → 每次构建上传 2GB 上下文。即使 COPY 一行不用它，上下文照样全量发送。

## 解法：.dockerignore

放在上下文根目录，语法同 .gitignore：

\`\`\`text
node_modules
.git
*.log
.env
dist
\`\`\`

## 问题二：秘密文件被打进镜像

上下文里的任何文件都可能被 COPY 进镜像层，哪怕后来 \`rm\` 掉——它还留在下面的历史层里！把 .env、密钥、数据库备份放进上下文，等于把密码刻进光盘。

> 铁律：**.dockerignore 不是性能优化，是安全配置。**`,
            advanced: [
              {
                title: "事故复盘：一次「删了但没删」的密钥泄露",
                body: `某项目 Dockerfile 写了 \`COPY . .\` 之后接 \`RUN rm .env\`。构建者以为干净了，但镜像层是追加式的：.env 完整躺在第 N 层，任何拿到镜像的人 \`docker history\` + 导出层文件即可还原。教训：**秘密文件永远不进上下文**，运行时通过环境变量或 secret 管理注入。`,
              },
            ],
          },
          {
            id: "l-layer-cache",
            slug: "layer-cache",
            title: "分层与缓存策略",
            priority: "must-know",
            minutes: 13,
            demo: "layer-cache",
            content: `Dockerfile 每条指令生成一层，层可以被缓存复用。**缓存判定规则只有一条：某层失效，它之上的所有层全部失效。**

所以 Dockerfile 的排序是一门手艺：**最常变化的放最下面，最稳定的放最上面**。

\`\`\`dockerfile
# ❌ 反例：改一行代码，npm ci 也要重跑（几十秒 → 几分钟）
FROM node:20-alpine
COPY . .
RUN npm ci

# ✅ 正解：依赖清单先单独 COPY，npm ci 这层只有清单变化才失效
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm ci
COPY . .
\`\`\`

依赖安装是最慢的一步，让它尽量命中缓存，CI 提速立竿见影。点上面的动画亲手感受一次。`,
            sandboxExercise: {
              task: "cd /root/app 先 docker build -t app:v1 . 构建一次；再 docker build -t app:v1 . 构建第二次，观察 CACHED 标记；docker history app:v1 对照每一层的大小。",
              solution: ["cd /root/app", "docker build -t app:v1 .", "docker build -t app:v1 .", "docker history app:v1"],
            },
            advanced: [
              {
                title: "高手细节：层的大小与去重",
                body: `层是追加式文件系统快照：同一文件在两层出现，磁盘占用按两份算（读的时候上面的盖下面的）。所以 \`RUN wget big.tar && tar x && rm big.tar\` 写在**一行**里才有意义——拆成两行，删除发生在下一层，上一层的大文件照样占空间。想看每层装了什么，装个 [dive](https://github.com/wagoodman/dive) 一层层翻。`,
                links: [{ label: "wagoodman/dive：镜像分层分析神器", url: "https://github.com/wagoodman/dive" }],
              },
            ],
          },
        ],
      },
    ],
    summary: {
      keyPoints: [
        "最小 Dockerfile = FROM + COPY + 入口；build -t 起名，参数是上下文不是 Dockerfile",
        "CMD 可被 run 参数整体替换，ENTRYPOINT 固定入口；生产一律 exec 形式",
        ".dockerignore 是安全配置：秘密文件绝不进上下文（层里删不掉）",
        "缓存规则：某层失效，之上全失效；稳定层在下，善变层在上",
      ],
    },
  },

  /* ================= 课程四：镜像优化与瘦身 ================= */
  {
    id: "image-slimming",
    slug: "image-slimming",
    title: "镜像优化与瘦身",
    description: "1.2GB 怎么变成 80MB？多阶段构建、基础镜像选型、仓库原理——这一门课的尽头是「场景挑战：镜像瘦身」。",
    track: "docker",
    difficulty: "intermediate",
    duration: "55 分钟",
    icon: "📦",
    tags: ["多阶段构建", "alpine", "registry", "dive"],
    chapters: [
      {
        id: "ch-slim",
        slug: "slim",
        title: "给镜像减重",
        lessons: [
          {
            id: "l-why-fat",
            slug: "why-fat",
            title: "镜像为什么这么大",
            priority: "important",
            minutes: 10,
            demo: "layers-3d",
            content: `镜像体积 = 每一层之和。所以「胖」从来不是玄学，把层摊开看账本就行：

\`\`\`bash
docker history nginx:latest    # 每层多大、哪条指令产生的
docker system df               # 本地镜像/容器/卷总共占了多少
\`\`\`

胖镜像的三大典型来源：

1. **基础镜像选重了**：\`node:20\`（1050MB）vs \`node:20-alpine\`（130MB）——差的是完整 Debian 和精简 Alpine 的用户态；
2. **构建工具被带进了运行时**：编译用的 gcc、完整 npm 缓存、test 依赖——运行期一个都用不上；
3. **垃圾留在层里**：下载的压缩包解压后没删、apt 缓存没清（且拆成两行删了也白删，见 Dockerfile 课）。

瘦身的思路永远是：**先看账本，再动刀子**。`,
            sandboxExercise: {
              task: "对比两个 nginx 的体检报告：docker history nginx:latest 和 docker history nginx:alpine，感受 187MB 与 43MB 的差距都省在哪。",
              solution: ["docker pull nginx:latest", "docker pull nginx:alpine", "docker history nginx:latest", "docker history nginx:alpine", "docker system df"],
            },
          },
          {
            id: "l-multistage",
            slug: "multistage",
            title: "多阶段构建：编译的不上桌",
            priority: "must-know",
            minutes: 14,
            content: `多阶段构建的思想一句话：**编译环境和运行环境分家，最终镜像只带走产物。**

\`\`\`dockerfile
# 阶段一：厨师（可以很胖，反正不上桌）
FROM node:20 AS build
WORKDIR /app
COPY package.json ./
RUN npm install

# 阶段二：餐桌（只放做好的菜）
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY server.js .
CMD ["node", "server.js"]
\`\`\`

关键在 \`COPY --from=build\`：从指定阶段拷文件。**最终镜像的层 = 第二阶段的层**，第一阶段那 1GB 只活在构建缓存里，永不发布。

同一招通吃所有语言：Go（golang → alpine + 静态二进制）、Java（maven → JRE）、Python（wheel 编译 → slim）。`,
            sandboxExercise: {
              task: "热身完毕，去「挑战」页接受真考验：《镜像瘦身：从 1.2GB 到 200MB 以内》。那里有可编辑的 Dockerfile 编辑器和自动判分。",
              solution: ["（去挑战页完成，参考解法在那里等你——先自己动手）"],
            },
            advanced: [
              {
                title: "更进一步：distroless 与静态编译",
                body: `极致瘦身的两步走：
1. **静态编译**：Go/Rust 编译时塞 \`CGO_ENABLED=0\`，产物不依赖任何系统库；
2. **distroless 基础镜像**：Google 出品，连 shell 都没有，只有运行期必需的库——攻击面降到最小（没有 shell 就没有 \`exec sh\` 的入侵路径）。

代价：没法进容器调试，需要 Sidecar debug 容器配套。一般业务 50–150MB 的 alpine 方案已经够用，别为了 10MB 引入新复杂度。`,
                links: [{ label: "GoogleContainerTools/distroless", url: "https://github.com/GoogleContainerTools/distroless" }],
              },
            ],
          },
          {
            id: "l-base-image",
            slug: "base-image",
            title: "选对基础镜像：alpine / slim / distroless",
            priority: "important",
            minutes: 10,
            content: `同一种运行时往往有三档基础镜像，以 Python 为例：

| 档位 | 代表 | 体积 | 适用 |
|---|---|---|---|
| 完整版 | python:3.12 | ~1GB | 本地开发、需要完整工具链 |
| 精简版 | python:3.12-slim | ~130MB | **生产默认首选**（Debian 底座） |
| 超精简 | python:3.12-alpine | ~50MB | 体积敏感、依赖好编译 |

选型口诀：**默认 slim，体积抠到极致才 alpine，安全极致才 distroless。**

## alpine 的暗坑：musl libc

Alpine 用 musl 而不是 glibc。纯 Python 无所谓，但带 C 扩展的包（numpy 早期版本、cryptography 旧版）在 musl 下可能性能劣化或需要重新编译。遇到「在 slim 下正常、换 alpine 就装不上依赖」，先怀疑 musl——不是你的错，是 libc 的锅。`,
            advanced: [
              {
                title: "性能冷知识：musl 的 malloc 曾经很慢",
                body: `musl 的内存分配器在多线程高负载场景曾长期弱于 glibc（部分 Python/Rust 负载实测有 2 倍级差距，后续版本已大幅改善）。结论不是「别用 alpine」，而是：**性能敏感服务换基础镜像后要重跑压测**——体积和吞吐是一对需要你自己平衡的旋钮。`,
              },
            ],
          },
          {
            id: "l-registry",
            slug: "registry",
            title: "镜像仓库：push、pull 与 registry 原理",
            priority: "important",
            minutes: 12,
            content: `镜像建好了总要送到服务器上跑，**Registry** 就是镜像的 GitHub：

\`\`\`bash
docker tag mysite 你的用户名/mysite:v1   # 打全名标签：registry地址/用户名/名字:标签
docker push 你的用户名/mysite:v1         # 推上去（分层去重：没变的层不会重传）
docker pull 你的用户名/mysite:v1         # 任何机器拉下来，一模一样
\`\`\`

标签语义要懂：\`:latest\` 不是「最新版本」而是「没写标签时的默认值」——两者经常不是一回事。生产推荐**语义化版本 + 不可变 tag**（v1.4.0 永远指向同一个内容）。

## registry 存的是什么

镜像不是一个文件，是「**分层 blob + 一个描述它们的 manifest**」的集合。pull 时客户端按 manifest 逐层下载、校验哈希、拼装——所以分层才能在全世界被去重共享：10 万台机器 pull nginx，那 130MB 的基础层在 Docker Hub 上只存一份。`,
            sandboxExercise: {
              task: "把瘦身挑战的成果打上标签推送到模拟仓库：docker tag app:slim demo/app:slim-v1 → docker push demo/app:slim-v1，观察分层推送的输出。",
              solution: ["docker tag app:slim demo/app:slim-v1", "docker push demo/app:slim-v1", "docker search nginx"],
            },
            advanced: [
              {
                title: "高手视角：digest 是如何保证「不可变交付」的",
                body: `manifest 里记录了每一层的 sha256；manifest 自身也有一棵哈希树，顶层 digest 唯一确定整个镜像内容。所以 \`image@sha256:...\` 是密码学意义上的不可变引用——CI 把 digest 写进部署清单，就能保证「构建的东西 = 运行的东西」，中间任何环节被篡改都会哈希对不上。这就是供应链安全里 provenance 的地基。`,
              },
            ],
          },
        ],
      },
    ],
    summary: {
      keyPoints: [
        "先看账本再瘦身：history 看层，system df 看总账",
        "多阶段构建：编译期依赖永不进最终镜像，COPY --from 搬产物",
        "基础镜像默认 slim；alpine 有 musl 暗坑，换镜像要重跑压测",
        "latest 只是默认标签；生产用不可变 tag 或 digest 拉取",
      ],
    },
  },

  /* ================= 课程五：数据管理与卷 ================= */
  {
    id: "volumes",
    slug: "volumes",
    title: "数据管理与卷",
    description: "容器删了，数据库去哪了？volume、bind mount、tmpfs 三条路各走一遍，从此数据不再蒸发。",
    track: "docker",
    difficulty: "intermediate",
    duration: "45 分钟",
    icon: "💾",
    tags: ["volume", "bind mount", "数据持久化"],
    chapters: [
      {
        id: "ch-data",
        slug: "data",
        title: "让数据活得比容器长",
        lessons: [
          {
            id: "l-where-data-goes",
            slug: "where-data-goes",
            title: "容器删了，数据去哪了",
            priority: "must-know",
            minutes: 10,
            demo: "overlayfs",
            content: `先点上面的动画理解一件事：镜像层只读，容器在**可写层**里写东西。可写层的命运和容器绑定——\`docker rm\` 一执行，可写层整个蒸发。

亲手验证一次：

\`\`\`bash
docker run --name demo alpine sh -c "echo 重要数据 > /data/secret.txt"
docker rm demo                       # 可写层随容器蒸发
docker run --name demo2 alpine cat /data/secret.txt   # 文件不存在
\`\`\`

数据库容器绝不能把数据放可写层——这不是谨慎，是物理定律级的必然丢失。

三条持久化路线（后两节各讲一条）：

| 方式 | 语法 | 谁管位置 | 适用 |
|---|---|---|---|
| named volume | -v mydata:/data | Docker 管 | **数据库等持久数据（默认选它）** |
| bind mount | -v /宿主机路径:/data | 你管 | 开发时挂代码 |
| tmpfs | --tmpfs /app/tmp | 内存 | 缓存、临时文件 |`,
            sandboxExercise: {
              task: "亲手让数据蒸发一次再救回来：第一个容器写文件后 rm，第二个容器 cat 不到；然后挂上 named volume 重做一遍，rm 容器、新容器挂同一个卷——数据还在。",
              solution: [
                "docker run --name t1 -v keepdata:/data alpine sh -c \"echo 重要数据 > /data/secret.txt\"",
                "docker rm t1",
                "docker run --rm -v keepdata:/data alpine cat /data/secret.txt   # 还在！",
              ],
            },
          },
          {
            id: "l-named-volume",
            slug: "named-volume",
            title: "named volume：数据的地堡",
            priority: "must-know",
            minutes: 12,
            content: `named volume 是 Docker 替你管理的一块持久化磁盘：

\`\`\`bash
docker volume create pgdata        # 也可以不创建，-v 时自动建
docker volume ls
docker volume inspect pgdata       # 真实存放位置 /var/lib/docker/volumes/pgdata/_data
docker run -d --name db -v pgdata:/var/lib/postgresql/data postgres:16
\`\`\`

三个关键性质：

1. **生命周期独立**：容器生灭，卷不动。要删得显式 \`docker volume rm\`（被挂载时删不掉——又一个硬保护）；
2. **位置由 Docker 管**：不依赖宿主机目录结构，迁移时 \`volume 导出\` 或直接备份卷，跨机器可复现；
3. **首次挂载会播种**：挂到空卷时，镜像里该路径的已有文件会被复制进卷（所以数据库镜像的初始化能生效）。

管理命令族：\`volume ls / inspect / rm / prune\`（prune 清所有没被挂载的孤儿卷）。`,
            sandboxExercise: {
              task: "创建 mydata 卷 → inspect 看它的 mountpoint → 起一个 redis:alpine 挂上去 → docker volume rm mydata 感受「in use 保护」→ 先删容器再删卷。",
              solution: [
                "docker volume create mydata",
                "docker volume inspect mydata",
                "docker run -d --name cache -v mydata:/data redis:alpine",
                "docker volume rm mydata   # ← 报错 volume is in use",
                "docker rm -f cache",
                "docker volume rm mydata",
              ],
            },
            advanced: [
              {
                title: "高手视角：volume driver 与「卷也能上云」",
                body: `volume 是插件化架构：本地 driver 默认，还可以接 NFS、Ceph、云盘。同一套 -v 语法，数据可以真正长在任何地方。本地开发最实用的变体是 \`docker run --mount type=volume,src=db,dst=/data,volume-driver=xxx\`——\`--mount\` 比 \`-v\` 啰嗦但语义显式，脚本里推荐。`,
              },
            ],
          },
          {
            id: "l-bind-mount",
            slug: "bind-mount",
            title: "bind mount：改代码不用重新 build",
            priority: "must-know",
            minutes: 12,
            content: `bind mount 把宿主机目录**原样搬进**容器：宿主机改文件，容器里立刻可见。

\`\`\`bash
docker run -d --name site -p 8090:80 -v /root/web:/usr/share/nginx/html nginx:alpine
curl localhost:8090                     # 你的 index.html
echo "<h1>改过了</h1>" > /root/web/index.html   # 宿主机改文件
curl localhost:8090                     # 立刻生效，不用 build 不用重启
\`\`\`

这就是本地开发的黄金组合：**代码挂载 + 热重载**。前端 dev server、Python 的 --reload、Go 的 air，全都吃这套。

## volume vs bind mount 一句话分界

- 数据库的持久数据 → **named volume**（Docker 管，干净）；
- 正在开发的代码 → **bind mount**（你管，所见即所得）；
- 生产环境几乎只用 volume——bind mount 把宿主机目录结构焊死进配置，可移植性差。`,
            sandboxExercise: {
              task: "cd /root/web 后挂载目录起容器：docker run -d --name dev -p 8096:80 -v /root/web:/usr/share/nginx/html nginx:alpine → curl 看默认页 → 用 echo 重定向改宿主机的 index.html → 再 curl，亲眼看到变化。",
              solution: [
                "cd /root/web",
                "docker run -d --name dev -p 8096:80 -v /root/web:/usr/share/nginx/html nginx:alpine",
                "curl localhost:8096",
                "echo '<h1>热更新成功</h1>' > index.html",
                "curl localhost:8096",
              ],
            },
            advanced: [
              {
                title: "高手细节：挂载的性能与权限坑",
                body: `1. **性能**：Linux 原生文件系统上 bind mount 近乎零开销；但 Docker Desktop（macOS/Windows）要把文件事件跨虚拟机桥接，大目录挂载（node_modules）会明显变慢——通用修法是把依赖目录用匿名卷盖掉：\`-v /app/node_modules\`；
2. **权限**：Linux 上容器内 UID 与宿主机文件 owner 不匹配时读写失败；SELinux 系统要加 \`:z\`/\`:Z\` 后缀重新打标。`,
              },
            ],
          },
        ],
      },
    ],
    summary: {
      keyPoints: [
        "容器可写层随 rm 蒸发；持久数据必须出容器",
        "数据库用 named volume，开发代码用 bind mount，临时文件用 tmpfs",
        "volume 的 in-use 保护与首次挂载播种是两个高频细节",
        "挂载 + 热重载 = 本地开发黄金组合",
      ],
    },
  },

  /* ================= 课程六：容器网络 ================= */
  {
    id: "networking",
    slug: "networking",
    title: "容器网络",
    description: "bridge、DNS、compose 编排与排障三分法。学完终于能回答：为什么两个容器互相 ping 不通。",
    track: "docker",
    difficulty: "intermediate",
    duration: "55 分钟",
    icon: "🌐",
    tags: ["bridge", "DNS", "compose", "排障"],
    chapters: [
      {
        id: "ch-net",
        slug: "net",
        title: "容器之间怎么说话",
        lessons: [
          {
            id: "l-bridge",
            slug: "bridge",
            title: "bridge 网络：容器们的小区局域网",
            priority: "must-know",
            minutes: 12,
            content: `每个容器默认都接入一张叫 **bridge** 的虚拟网桥（可以理解为小区交换机）：

\`\`\`bash
docker network ls                  # bridge 就是那个默认网络
docker network inspect bridge      # 看看谁接在上面、各自什么 IP（172.17.0.x）
docker run -d --name web nginx:alpine
docker network inspect bridge      # 再看，web 出现了
\`\`\`

同一张 bridge 上的容器在网络层是**互通**的（IP 层可达）。但注意——互通的是 IP，不是名字。此时你 ping 别人的容器名是解析不了的，原因下一节讲，这也是容器网络第一大坑。

宿主机访问容器靠端口映射（-p），容器访问宿主机用特殊地址 \`host.docker.internal\`（Desktop 版）或网桥 IP。`,
            sandboxExercise: {
              task: "起两个容器，docker network inspect bridge 看它们挂载与 IP 分配；再用 docker network disconnect bridge 容器名 把其中一个踢下网——观察 inspect 的变化。",
              solution: [
                "docker run -d --name n1 alpine sleep 1000",
                "docker run -d --name n2 alpine sleep 1000",
                "docker network inspect bridge",
                "docker network disconnect bridge n2",
                "docker network inspect bridge",
              ],
            },
            advanced: [
              {
                title: "高手视角：veth pair——容器网线的两端",
                body: `创建容器时内核做了一对**虚拟网线（veth pair）**：一端插在容器里变成 eth0，另一端插在 docker0 网桥上。容器发出的包从 veth 一端直达网桥，再按二层转发到目的地。所以「容器网络的隔离」其实只隔离在 namespace 的视角上，链路层大家都在同一台交换机上——这是理解容器抓包、排查丢包的地基。`,
              },
            ],
          },
          {
            id: "l-dns",
            slug: "dns",
            title: "容器互访与 DNS：为什么名字解析不了",
            priority: "must-know",
            minutes: 14,
            content: `这是容器网络最著名的坑，亲手踩一次：

\`\`\`bash
# 默认 bridge 上：用容器名互访 → 失败！
docker exec n1 curl http://n2      # Could not resolve host: n2
\`\`\`

**原因**：默认 bridge 网络是历史遗留的兼容区，**没有内置 DNS**。

## 正确姿势：自定义网络

\`\`\`bash
docker network create app-net      # 用户自定义网络自带 DNS
docker run -d --name api --network app-net nginx:alpine
docker run -d --name job --network app-net alpine sleep 1000
docker exec job curl http://api    # ✓ 名字直接解析成功
\`\`\`

自定义网络里，**每个容器名都是可解析的 DNS 记录**，服务发现一句话就完成了：不用查 IP、不用写 hosts。redis 官方文档让你先 create network 再 run，就是因为它默认你的应用要用名字连数据库。

> 一句话总结：**容器要互访，先建自定义网络；默认 bridge 只配「单容器 + 端口映射」。**`,
            sandboxExercise: {
              task: "复刻上面的完整实验：先在默认网络体验解析失败，再建 app-net 让两个容器用名字互访。这一课的肌肉记忆决定你以后排障的速度。",
              solution: [
                "docker run -d --name api nginx:alpine",
                "docker run -d --name job alpine sleep 1000",
                "docker exec job curl http://api   # 解析失败（默认 bridge 无 DNS）",
                "docker network create app-net",
                "docker network connect app-net api",
                "docker network connect app-net job",
                "docker exec job curl http://api   # 成功！",
              ],
            },
            advanced: [
              {
                title: "名场面事故：K8s DNS 偶发 5 秒延迟",
                body: `云原生圈最经典的网络悬案：Pod 里对外域名解析**偶发**精确的 5 秒延迟。根因是三方合谋：应用查询带搜索域（ndots:5 导致先解析多级搜索后缀）→ 并发 A/AAAA 双查询 → conntrack 对并发 UDP 的 race 处理导致丢包 → 等到超时重试正好 5 秒。修复手段包括优化 ndots、对 DNS 服务做 NodeLocal 缓存等。这条链路横跨 DNS 协议、内核 conntrack 与 K8s 配置，是面试和实战的双重名场面。`,
              },
            ],
          },
          {
            id: "l-compose",
            slug: "compose",
            title: "compose：把多容器编排写进一个文件",
            priority: "must-know",
            minutes: 14,
            content: `命令行起一个容器还行，起「web + 数据库 + 缓存」三件套就累了。compose 把整套编排写成一份 YAML：

\`\`\`yaml
services:
  web:
    image: nginx:alpine
    ports: ["8080:80"]
    volumes: [site:/usr/share/nginx/html]
    depends_on: [cache]
  cache:
    image: redis:alpine
volumes:
  site:
\`\`\`

\`\`\`bash
cd /root/stack && cat docker-compose.yml   # 沙盒里就有这份
docker compose up -d        # 一条命令起全套
docker compose ps           # 只看这个项目的容器
docker compose down         # 一条命令拆全套（-v 连卷一起拆）
\`\`\`

compose 背后做了三件贴心事：**自动建项目专用网络**（所以服务名直接互访）、按 depends_on 排启动顺序、给容器统一打 project 标签管理。web 服务可以直接 \`curl http://cache\`——上一节学的 DNS 自动生效。`,
            sandboxExercise: {
              task: "cd /root/stack → cat docker-compose.yml → docker compose up -d → curl localhost:8080 验证 → docker compose down 全部拆掉 → docker ps 确认干净。",
              solution: [
                "cd /root/stack",
                "cat docker-compose.yml",
                "docker compose up -d",
                "curl localhost:8080",
                "docker compose ps",
                "docker compose down",
              ],
            },
            advanced: [
              {
                title: "compose 到底帮你做了什么",
                body: `把 compose up 逐层翻译回去，它等价于：
1. \`docker network create stack_default\`；
2. 对每个 service：\`docker run -d --name stack-web-1 --network stack_default -p 8080:80 -v site:/usr/share/nginx/html nginx:alpine\`（按 depends_on 拓扑排序）；
3. 打上 com.docker.compose.project 标签，down 时按标签一锅端。
理解了这一层，compose 就不再是黑魔法——它只是把你手工敲的命令固化成声明式文件。`,
              },
            ],
          },
          {
            id: "l-troubleshoot",
            slug: "troubleshoot",
            title: "网络排障三分法：冲突、解析、拒绝",
            priority: "important",
            minutes: 14,
            content: `容器网络故障千奇百怪，但入口永远分三类：

## 一、port is already allocated → 冲突类

宿主机端口被占。排查：\`docker ps\` 看谁占了端口；换端口或停掉旧的。

## 二、Could not resolve host → 解析类

容器名解析失败。排查：双方在同一个（自定义）网络吗？\`docker network inspect\` 确认。默认 bridge 没有 DNS——九成是这个。

## 三、Connection refused → 到达但没听

包到了，但目标端口没人听。三层检查：
1. 服务真的起了吗？\`docker logs\` 看启动日志；
2. 听的端口对吗？\`docker exec 容器 env\` / 看配置（PORT 环境变量错配是惯犯）；
3. 映射对吗？\`docker port 容器\`——映射的是容器内**真正在听**的那个端口吗？

> 排障心法：先分类，再定位，最后只验证一件事。把这三分法练成条件反射，凌晨的告警就没那么可怕了。`,
            sandboxExercise: {
              task: "自我考核：起一个 nginx 但只映射 8081（容器 80），然后故意 curl localhost:8080 观察 refused；用本课三分法说出每一层的答案，再用 curl localhost:8081 收尾。",
              solution: [
                "docker run -d --name t -p 8081:80 nginx:alpine",
                "curl localhost:8080   # Connection refused：没映射这个端口",
                "docker port t         # 检查映射：8081→80",
                "curl localhost:8081   # ✓",
              ],
            },
            advanced: [
              {
                title: "进阶事故：SNAT 端口耗尽",
                body: `高并发容器访问外网时偶发超时，抓包看到大量 TCP 重传——很可能是宿主机 SNAT 端口池（默认约 64K/目标地址对）被 TIME_WAIT 短连接耗尽。修法：应用侧连接复用/长连接池；内核侧 tcp_tw_reuse；网络侧扩大源端口段。特征记法：**越忙越慢、闲时自愈，基本就是端口池和连接池这俩池子的问题。**`,
              },
            ],
          },
        ],
      },
    ],
    summary: {
      keyPoints: [
        "默认 bridge 互通但不通 DNS；容器互访先建自定义网络",
        "compose = 网络 + 启动顺序 + 标签管理三件事的声明式固化",
        "排障三分法：端口冲突 / DNS 解析 / Connection refused，先分类再定位",
      ],
    },
  },

  /* ================= K8s 进阶篇 · 课程五：为什么需要 Kubernetes ================= */
  {
    id: "k8s-why",
    slug: "k8s-why",
    title: "为什么需要 Kubernetes",
    description: "从「五十个容器我管不动了」讲到声明式 API。不背概念，先建立 K8s 解决什么问题的画面。",
    track: "k8s",
    difficulty: "beginner",
    duration: "40 分钟",
    icon: "🎯",
    tags: ["编排", "声明式", "心智模型"],
    chapters: [
      {
        id: "ch-pain",
        slug: "pain",
        title: "手动管理的天花板",
        lessons: [
          {
            id: "l-pain",
            slug: "fifty-containers",
            title: "五十个容器之后，人会疯掉",
            priority: "must-know",
            minutes: 9,
            content: `Docker 篇毕业时你已经会：打包镜像、起容器、映射端口、排网络。一台机器上 10 个容器，你管得井井有条。现在把规模乘以十——

**凌晨 2:17，你的手机开始连环震动：**

1. 挂了没人拉。某台机器内存吃紧，OOM killer 干掉了你的 web 容器。没人重启它，流量白白流走 20 分钟。
2. 流量来了不会扩。晚高峰 QPU 涨了三倍，你手忙脚乱 SSH 到五台机器各 docker run 一遍——端口、环境变量、卷路径，一个都不能抄错。
3. 更新全靠手。新版本要上线，你在一台台机器上 docker stop、docker rm、docker run。第 37 台时你漏敲了一个 -e，那个实例带病运行了一周。
4. 机器坏了没处躲。一台宿主机宕机，上面的容器全部陪葬，你要手工把它们「搬家」到别的机器。

你会发现：**你 95% 的时间在做同一件事——盯着容器，让它和「我想要的样子」保持一致。**挂了要拉起、少了要补、旧了要换。

这件事不该由人做。Kubernetes 的全部工作就是：**把你想要的样子写下来，让机器替你永远盯着。**`,
            advanced: [
              {
                title: "高手视角：K8s 不是凭空发明的",
                body: `Kubernetes 2014 年由 Google 开源，脱胎于内部跑了十多年的集群系统 **Borg**。Google 当年用 Borg 把数据中心抽象成一台电脑，据说让运维人员可以管理上千台机器而只需个位数值班员。

所以 K8s 的设计哲学带着浓厚的 Google 血统：声明式 API、控制循环、标签选择器，全是从 Borg 实战里沉淀的。学 K8s 某种程度是在学 Google 十几年的运维教训。`,
                links: [
                  { label: "Borg 论文（Large-scale cluster management at Google）", url: "https://research.google/pubs/large-scale-cluster-management-at-google-with-borg/" },
                  { label: "Kubernetes 官方：什么是 Kubernetes", url: "https://kubernetes.io/zh-cn/docs/concepts/overview/" },
                ],
              },
            ],
          },
          {
            id: "l-declarative",
            slug: "declarative",
            title: "声明式：把「我要几个」写下来",
            priority: "must-know",
            minutes: 10,
            content: `命令式和声明式的区别，一句话就能说清：

- **命令式**（docker run）：「现在，给我起一个容器。」——做完了就完了，之后死活没人管。
- **声明式**（K8s）：「我要的状态是：这个应用永远保持 3 个副本。」——你没教它怎么做，你只说了你要什么。

声明式像雇了一个 **7×24 小时永不下班的值班员**。你的愿望是一份写在纸上的「期望状态」，值班员的唯一工作是不断做三件事：

1. **观察**：现在实际有几个？
2. **对比**：实际和期望一样吗？
3. **行动**：不一样就想办法抹平差距。

这个「观察→对比→行动」的循环叫**调和循环（Reconciliation Loop）**，它是 K8s 的心脏。你删掉一个 Pod？值班员看了一眼期望值是 3，实际剩 2，立刻补一个。机器炸了？上面所有 Pod 没了，值班员在别的机器上重新铺出来。

> 关键观念转变：**你不「操作」集群，你向集群「申报」期望。**从这一刻起，「确保」这件事交给了机器。`,
            advanced: [
              {
                title: "高手视角：这个循环在代码里长什么样",
                body: `每个 K8s 控制器本质是一个死循环：List-Watch API Server 的事件流（不是傻轮询，是长连接推送），收到变化就跑一遍 Reconcile 函数——输入期望对象，输出增删改动作，直到实际状态收敛。

社区把这套模式做成了框架（controller-runtime），写一个自己的控制器几十行起步。你以后会遇到的 Operator（数据库自动化运维器），本质就是「自定义资源的自定义控制器」。`,
                links: [
                  { label: "K8s 博客：The Reconciliation Loop", url: "https://kubernetes.io/blog/2021/08/06/some-things-you-should-know-about-the-reconciliation-loop/" },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "ch-map",
        slug: "map",
        title: "集群长什么样",
        lessons: [
          {
            id: "l-arch",
            slug: "architecture",
            title: "控制平面与工作节点：一张地图",
            priority: "important",
            minutes: 10,
            content: `把 K8s 集群想象成一家公司：

**控制平面（Control Plane）= 总部**

- **API Server**：唯一的前台窗口。你（kubectl）、控制器、节点，所有人办事都走它。你永远不会绕过前台直接进车间。
- **etcd**：公司的档案库，一张只信它的账本——整个集群的期望状态都存在这里。账本丢了，集群就失忆了。
- **Scheduler**：调度员。新来的 Pod 放哪台机器？它看资源余量、亲和性规则来分房。
- **Controller Manager**：值班员们集中的办公室，几十个控制器各管一摊（副本够不够、节点死没死、证书过没过期）。

**工作节点（Worker Node）= 车间**（通常很多台）

- **kubelet**：每台机器的工头，接总部的单子，保证本机的容器真的在跑。
- **容器运行时**：真正干活的 Docker/containerd——你 Docker 篇学的技能在这里原样生效。
- **kube-proxy**：本机的流量员，负责把请求转发到正确的 Pod。

你会注意到：**Docker 没有消失，它降级成了「被调度的工人」。**K8s 不替代容器技术，它是站在容器之上的调度层。`,
            advanced: [
              {
                title: "面试追问：etcd 挂了集群会怎样",
                body: `短答案：集群「失忆」但不会「瘫痪」——已运行的 Pod 继续跑（kubelet 自主工作），但任何新变更（调度、扩容、更新）都无从谈起，因为所有决策都要读写 etcd。

所以 etcd 是集群最需要备份的东西：\`etcdctl snapshot save\` 一条命令的事，但真出事时能救命。生产环境 etcd 永远奇数节点（3/5/7）部署，靠 Raft 协议投票容错。`,
                links: [
                  { label: "K8s 官方：集群架构文档", url: "https://kubernetes.io/zh-cn/docs/concepts/architecture/" },
                ],
              },
            ],
          },
          {
            id: "l-wishlist",
            slug: "objects",
            title: "对象：交给集群的愿望单",
            priority: "important",
            minutes: 8,
            content: `和集群打交道只有一种姿势：**提交「对象（Object）」**。对象就是愿望单上的一条目——用 YAML 写成，里面有两条关键信息：

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment        # 愿望的类型
metadata:
  name: web             # 愿望的名字
spec:
  replicas: 3           # 期望状态（spec）：我要 3 个
\`\`\`

**spec 是你写的「期望」，status 是集群填的「实际」。**控制器的工作就是让 status 无限逼近 spec。

K8s 对象几十种，入门只需要记住三件套的关系链：

- **Pod**：真正跑容器的最小单位（下一门课的主角）
- **Deployment**：管理 Pod 的「经理」——管数量、管更新
- **Service**：给一群飘忽不定的 Pod 一个固定访问入口

提交愿望用一条命令：\`kubectl apply -f web.yaml\`。就这样，没有任何「然后呢」——然后是控制器的事。`,
            advanced: [
              {
                title: "高手视角：万物皆对象，万物皆可扩展",
                body: `Deployment、Service、ConfigMap 在 API 层面完全平等——都是 kind + spec + status。这个统一模型带来 K8s 最强的扩展机制 **CRD（自定义资源定义）**：你可以发明自己的对象类型（比如一个 MysqlCluster kind），配上自定义控制器，集群就「原生」认识你的新对象了。整个云原生生态（Prometheus、Istio、ArgoCD）都是靠 CRD 长在 K8s 上的。`,
                links: [
                  { label: "K8s API 约定（API Conventions）", url: "https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/api-conventions.md" },
                ],
              },
            ],
          },
        ],
      },
    ],
    summary: {
      keyPoints: [
        "规模一大，人盯容器必疯：挂了没人拉、扩容靠手、更新靠抄",
        "声明式 = 只写期望状态，观察/对比/行动交给调和循环",
        "API Server 是唯一前台，etcd 是唯一账本，Docker 降级为被调度的工人",
      ],
    },
  },

  /* ================= K8s 进阶篇 · 课程六：核心对象与 kubectl ================= */
  {
    id: "k8s-objects",
    slug: "k8s-objects",
    title: "核心对象与 kubectl",
    description: "Pod、Deployment、Service 三件套 + kubectl 读写入门。学完能看懂任何一篇 K8s 教程的前半部分。",
    track: "k8s",
    difficulty: "beginner",
    duration: "55 分钟",
    icon: "🧩",
    tags: ["Pod", "Deployment", "Service", "kubectl"],
    chapters: [
      {
        id: "ch-pod",
        slug: "pod",
        title: "Pod：最小单位",
        lessons: [
          {
            id: "l-pod",
            slug: "what-is-pod",
            title: "Pod：为什么不是一个容器",
            priority: "must-know",
            minutes: 10,
            content: `你可能会问：我都有容器了，K8s 干嘛发明个「Pod」？

因为有些容器**天生是一伙的**。经典例子：主应用 + 日志收集器。它们要共享同一个目录（应用写日志、收集器读日志），还要用 localhost 互调接口。如果部署成两个容器，就要对齐卷路径、打通网络，麻烦且脆。

K8s 的答案：把「一伙容器」打包成 **Pod**——

- 同一 Pod 里的容器**共享同一个网络命名空间**：互相用 localhost 访问，像在同一台机器上；
- 可以**共享同一个目录**（Volume）；
- **同生共死**：一起调度到同一台机器，一起被销毁。

> 心智模型：**一个 Pod ≈ 一台逻辑主机**。以前你把两个进程装在一台虚拟机里让它们 localhost 互通，现在把两个容器装进同一个 Pod——仅此而已。

绝大多数 Pod 只有一个容器；需要「贴身 helper」时才放两个（这个 helper 有个名字叫 sidecar，边斗——摩托挎斗那个意象）。`,
            advanced: [
              {
                title: "高手视角：sidecar 模式的现代演化",
                body: `sidecar 已从「设计模式」升级为「一等公民」：K8s 1.28+ 引入原生 sidecar 容器（initContainers 带 restartPolicy: Always），解决了老式 sidecar 的启动/退出顺序问题。服务网格 Istio 的经典做法就是给每个 Pod 注入一个 Envoy sidecar 代理——后来 Google 推的Istio ambient 模式又把代理挪回节点层，社区对「sidecar 是否值得」的争论至今没停。理解 sidecar 的取舍是进阶分水岭。`,
                links: [
                  { label: "K8s 博客：Pods 与 sidecar 容器", url: "https://kubernetes.io/zh-cn/docs/concepts/workloads/pods/" },
                ],
              },
            ],
          },
          {
            id: "l-pod-mortal",
            slug: "pods-are-mortal",
            title: "Pod 是会死的：别跟它处感情",
            priority: "must-know",
            minutes: 8,
            content: `这是 K8s 新手最贵的一课，先打预防针：

**Pod 是凡人。**节点故障、资源紧张、滚动更新、人为删除——任何原因都能让 Pod 死掉，而且 K8s 不会抢救它，只会**重新生一个新的**。

新生的 Pod 和死掉的那个**毫无关系**：

- **名字变了**：pod-web-a1b2x 死了，新来的是 pod-web-9k3fq——后缀是随机哈希，不是自增编号；
- **IP 变了**：每个 Pod 从节点池里随机拿一个集群内 IP，重启就换；
- **存储默认蒸发**：Pod 删了，它可写层里的数据跟着消失（和容器一个道理）。

所以 K8s 圈有条铁律：**永远不要直接管理 Pod，也不要记住任何 Pod 的名字和 IP。**名字会变、IP 会变，那「固定」的东西靠什么？靠下一节 Deployment（管住数量）和 Service（管住地址）。

这和 Docker 篇「容器删了数据就没了」是同一个哲学的延续：**基础设施是不可宠物的（cattle, not pets）**。`,
            advanced: [
              {
                title: "面试追问：那要保存状态怎么办",
                body: `Pod 会死 → 可写层不可靠 → 状态必须放在 Pod 之外。层次从低到高：数据库（放集群外的托管服务）、**PV/PVC**（集群里的网络盘，Pod 死了盘还在）、StatefulSet（给有身份的 Pod 稳定名字+专属盘，数据库在 K8s 里跑就靠它）。这就是为什么「有状态应用上 K8s」单独是一门学问——无状态随便杀，有状态要配盘、要讲顺序。`,
                links: [
                  { label: "K8s 官方：Pod 生命周期", url: "https://kubernetes.io/zh-cn/docs/concepts/workloads/pods/pod-lifecycle/" },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "ch-deploy",
        slug: "deploy",
        title: "编排三层",
        lessons: [
          {
            id: "l-deploy",
            slug: "deployment",
            title: "Deployment→ReplicaSet→Pod：三层委托",
            priority: "must-know",
            minutes: 10,
            demo: "reconcile-loop",
            content: `点上面的动画，亲手玩一遍 K8s 的心脏：左边是 Deployment 控制器的调和循环，右边是它管的 Pod 舰队。删一个、加一个、滚一版，感受「期望 vs 实际」怎么被自动抹平。

现在看管人的组织结构。你在 K8s 里真正提交的是 **Deployment**，但直接跑着容器的是 **Pod**，中间还夹着一层 **ReplicaSet**。为什么三层？

- **Pod**：干活的，命短，说死就死（上一节讲过）；
- **ReplicaSet**：小队长，只负责一件事——「让 label 匹配我的 Pod 数量永远等于 N」。你删一个它补一个，机器炸了它换个地方铺；
- **Deployment**：经理，管着 ReplicaSet——真正的价值在**发布新版本**时体现：它不直接改 Pod，而是**新建一个新版本的 ReplicaSet、慢慢把流量从旧的倒到新的**，出问题一键回滚。

三层委托的好处：每一层只做一件事，改版本不影响「保数量」的逻辑，回滚就是「把经理的手指回旧队长」。

你在动画里看到的一切，都发生在这三层之间。`,
            advanced: [
              {
                title: "面试追问：为什么中间非要夹一个 ReplicaSet",
                body: `直接让 Deployment 管 Pod 数量不行吗？行，但滚动更新会变成「原地改」——老版本必须先死才能腾位置给新版本，服务就断了。ReplicaSet 把「版本」物化成一层：新旧版本各是一个 ReplicaSet，并存于集群，更新就是新旧此消彼长，回滚就是把新 RS 缩到 0、旧 RS 扩回来——**历史版本天然保留在集群里**（默认保留 10 个），回滚不需要任何备份。这是「分层委托」的经典收益。`,
                links: [
                  { label: "K8s 官方：Deployment 文档", url: "https://kubernetes.io/zh-cn/docs/concepts/workloads/controllers/deployment/" },
                ],
              },
            ],
          },
          {
            id: "l-service",
            slug: "service",
            title: "Service：给一群飘忽的 Pod 一个固定门牌",
            priority: "must-know",
            minutes: 10,
            content: `回忆上一课：Pod 会死、IP 会换。那前端 Pod 想调后端 API，写什么 IP？写死就翻车。

**Service 就是解决方案：一个永远不变的虚拟门牌。**

\`\`\`yaml
kind: Service
spec:
  selector:
    app: web          # 贴着这个标签的 Pod，都是我的服务对象
  ports:
    - port: 80        # 大家访问我的 80
\`\`\`

它做两件事：

1. **固定地址**：Service 一旦创建就拿到一个终身不变的集群内 IP（ClusterIP）和一个 DNS 名字——格式温柔得像 \`web.default.svc.cluster.local\`，同命名空间里甚至直接叫 \`web\` 就行。
2. **自动跟人**：Service 靠**标签选择器（selector）**找服务对象。新生的 Pod 只要带着 \`app: web\` 标签，下一秒就被纳入负载均衡；死的 Pod 自动被摘掉。你不用改任何配置。

> 一句话记住三者分工：**Deployment 管住「数量」，Service 管住「地址」，Pod 负责干活。**

（至于请求怎么从 Service IP 流到 Pod——那是 kube-proxy 在每台机器上写的转发规则，原理篇见。）`,
            advanced: [
              {
                title: "进阶：Service 的四种类型",
                body: `- **ClusterIP**（默认）：集群内可见，微服务互调用它；
- **NodePort**：在每个节点上开个端口（30000-32767）暴露到集群外——演示和临时用；
- **LoadBalancer**：找云厂商要一个真负载均衡器——公网服务标准姿势；
- **ExternalName**：就是个 DNS 别名。

生产里最常见组合：Deployment + ClusterIP 内部互调， ingress（第七层门卫）统一收外部流量。DNS 短名能通是因为集群 DNS（CoreDNS）把 Service 名字解析成了 ClusterIP——还记得 Docker 篇的自定义网络 DNS 吗？同一个思路，放大到整个集群。`,
                links: [
                  { label: "K8s 官方：Service 文档", url: "https://kubernetes.io/zh-cn/docs/concepts/services-networking/service/" },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "ch-kubectl",
        slug: "kubectl",
        title: "kubectl 读写",
        lessons: [
          {
            id: "l-kubectl",
            slug: "kubectl-basics",
            title: "kubectl 读写入门：五条命令走天下",
            priority: "must-know",
            minutes: 12,
            content: `kubectl 是集群前台（API Server）的窗口，语法只有一个模板：

\`\`\`
kubectl  动作  对象类型  对象名      [flags]
\`\`\`

**读（日常 80%）**

\`\`\`bash
kubectl get pods                      # 列出 Pod（加 -o wide 看 IP 和节点）
kubectl get deployments               # 看 Deployment 和副本就绪数
kubectl describe pod pod-web-a1b2     # 一个 Pod 的完整病历：事件、状态、失败原因
kubectl logs pod-web-a1b2             # 看它容器吐的日志（-f 跟随）
\`\`\`

**写（改动集群）**

\`\`\`bash
kubectl apply -f web.yaml             # 提交/更新愿望（声明式，首选）
kubectl scale deployment web --replicas=5
kubectl delete pod pod-web-a1b2       # 删（自愈型 Pod 会立刻重生一个）
\`\`\`

**YAML 和命令的关系**：scale、set image 这类命令是在「替你改 YAML 里的 spec」，本质和 apply 一份新 YAML 等价。生产纪律是**能 apply 就 apply**——因为 YAML 进了 Git，改了什么、谁改的、怎么回滚，全有据可查。这就是「GitOps」的种子。

五条命令 + 一个模板，你已经有能力读懂任何 K8s 教程了。`,
            advanced: [
              {
                title: "高手效率包：describe 是排障之王",
                body: `排障优先级永远是 \`describe\` > \`logs\`：logs 只有应用自己的输出，而 describe 的 **Events 段**会告诉你调度失败（Insufficient memory）、镜像拉取失败（ImagePullBackOff）、探针失败（Unhealthy: HTTP probe returned 500）这些「集群替你看到的真相」。再配 \`kubectl get events --sort-by=.lastTimestamp\` 能看全场时间线。工具党进阶：k9s 终端 UI，把 get/describe/logs 变成交互式操作，值回票价。`,
                links: [
                  { label: "kubectl 速查表（官方）", url: "https://kubernetes.io/zh-cn/docs/reference/kubectl/cheatsheet/" },
                ],
              },
            ],
          },
          {
            id: "l-labels",
            slug: "labels",
            title: "标签与选择器：K8s 的社交网络",
            priority: "important",
            minutes: 8,
            content: `K8s 里几乎没有任何「A 指定 B」的硬编码关系——所有关系都靠**标签（label）**牵线。

标签就是贴在对象上的键值对：

\`\`\`yaml
metadata:
  labels:
    app: web
    version: v1
    team: payments
\`\`\`

别的东西用**选择器（selector）**按标签找人：

- Deployment 的 selector 选中 Pod → 管住它们的生命；
- Service 的 selector 选中 Pod → 把流量发给它们；
- 甚至调度规则也能按标签选节点。

为什么这个设计妙？因为它是**多对多的松耦合**：

- 一个 Service 可以同时选中 v1 和 v2 的 Pod（金丝雀发布的原理）；
- 你换个 Pod 名字、换个 IP、换个机器，标签不动，关系就不动；
- 十个 Service 可以按不同维度选中同一批 Pod（一个按 app，一个按 team）。

Docker 篇你见过 \`docker run --network\` 把容器绑进网络；K8s 用「标签 + 选择器」替代了一切点对点绑定——**关系是查询出来的，不是连接死的**。这是 K8s 灵活性的总开关。`,
            advanced: [
              {
                title: "实战细节：selector 一旦定下不能改",
                body: `Deployment 的 selector 是「身份证级」字段——创建后不可修改（immutable）。改错了只能删了重建（连带所有 Pod 重生）。新手最痛的变体：Service selector 和 Pod labels 差一个字母，于是 Service 后面 0 个 Endpoints，报错却是连接拒绝而不是任何显式错误。排查命令：\`kubectl get endpoints <svc名>\`，列表为空 = 选择器没选到人。`,
                links: [
                  { label: "K8s 官方：标签与选择器", url: "https://kubernetes.io/zh-cn/docs/concepts/overview/working-with-objects/labels/" },
                ],
              },
            ],
          },
        ],
      },
    ],
    summary: {
      keyPoints: [
        "Pod ≈ 一台逻辑主机；同 Pod 容器 localhost 互通、同生共死",
        "Pod 必死且新生者无名无 IP——Deployment 管数量、Service 管地址",
        "kubectl 五条命令一个模板；能 apply 不敲命令，愿望进 Git",
      ],
    },
  },

  /* ================= K8s 进阶篇 · 课程七：调和循环实战 ================= */
  {
    id: "k8s-reconcile",
    slug: "k8s-reconcile",
    title: "调和循环实战",
    description: "自愈、扩缩容、滚动更新、CrashLoopBackOff 排障——把 K8s 的心脏亲手玩明白，最后用 kind 上真机。",
    track: "k8s",
    difficulty: "intermediate",
    duration: "50 分钟",
    icon: "🔁",
    tags: ["自愈", "滚动更新", "排障", "kind"],
    chapters: [
      {
        id: "ch-selfheal",
        slug: "heal-scale",
        title: "自愈与扩缩",
        lessons: [
          {
            id: "l-selfheal",
            slug: "self-healing",
            title: "删掉一个 Pod 会发生什么",
            priority: "must-know",
            minutes: 10,
            demo: "reconcile-loop",
            content: `到动画里亲手制造一次事故：**点掉任意一个 Pod**，然后盯着左边控制器和事件流——

1. 你删的那张卡变红（Terminating），随后消失；
2. 控制器下一拍就发现「实际 2 ≠ 期望 3」；
3. **一个新 Pod 出现**，先 Creating，一两秒后 Running。

全程没人操作，约两三秒。这就是「自愈」。

两个值得停下来咂摸的细节：

**新 Pod 不是「复活的旧的」。**它名字换了、IP 换了、可写层是全新的。K8s 的自愈不是抢救，是**重造**。所以「重要数据放 Pod 里」在任何 K8s 团队都是笑话。

**自愈的「健康」是谁说了算？**目前控制器只看「进程活着没」。但进程活着 ≠ 能服务：卡死的 JVM、死锁的应用、假死的连接池。真正工业级的健康靠**探针（Probe）**——liveness 探针定期戳应用（HTTP 某个路径或命令），连续失败就判定「这台其实死了」，杀掉重造。你写 Deployment 时会配它，一句话：**让集群知道什么叫「真的挂了」**。`,
            advanced: [
              {
                title: "高手视角：探针三兄弟，配错会翻车",
                body: `- **liveness**：失败就重启容器——配得太激进（阈值太紧）等于给自己装了个定时自杀器，流量高峰响应稍慢就被连环杀；
- **readiness**：失败只是摘出负载均衡，不重启——发布时「预热完成再接客」全靠它；
- **startupProbe**：给启动慢的老应用（Spring Boot）一条生路：启动期不跑 liveness。

血泪配比：liveness 的 initialDelaySeconds 一定要大于应用最坏冷启动时间；能 readiness 解决的不要上 liveness。`,
                links: [
                  { label: "K8s 官方：配置存活、就绪和启动探针", url: "https://kubernetes.io/zh-cn/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/" },
                ],
              },
            ],
          },
          {
            id: "l-scale",
            slug: "scaling",
            title: "扩缩容：改一个数字的事",
            priority: "must-know",
            minutes: 8,
            demo: "reconcile-loop",
            content: `在动画里按两下「＋」，把 replicas 从 3 拉到 5——看 Pod 一个个长出来；再按「−」缩回去，多余的 Pod 逐个退役。整条链路只有一件事发生了变化：**愿望单上的数字**。

对比 Docker 篇的你：SSH 五台机器、抄五遍 docker run、改五遍 nginx upstream。现在这是一行 \`kubectl scale deployment web --replicas=5\`，而且——

- **新 Pod 自动选机器**：Scheduler 看哪台节点资源富余就放哪；
- **流量自动跟上**：Service 的选择器下一拍就把新 Pod 拉进负载均衡；
- **缩容也温柔**：控制器先 Terminating（让它在跑的请求收尾）再移除。

最后一层的想象力：**这个数字也可以让机器来定**。HPA（Horizontal Pod Autoscaler，水平自动扩缩器）盯着 CPU 或自定义指标，忙了自动 scale up，闲了自动 scale down。你写的还是那个「期望」，只不过期望本身有了自己的控制器——K8s 从里到外都是同一套哲学的嵌套。`,
            advanced: [
              {
                title: "高手视角：HPA 的四个坑",
                body: `① HPA 只认「单位副本负载」，Pod request 必须配准（没配 request = HPA 算不了 = 完全不工作），这是新手第一大坑；② 缩容默认 5 分钟稳定窗，防抖动，别嫌它反应慢；③ 流量确实陡到「扩容器都来不及拉起」时，是**提前扩**（定时 HPA/Cron）或**预热池**的问题，不是 HPA 参数问题；④ 数据库类应用别 HPA——副本间有状态，水平扩等于给自己埋雷，该垂直扩或读写分离。`,
                links: [
                  { label: "K8s 官方：水平自动扩缩（HPA）", url: "https://kubernetes.io/zh-cn/docs/tasks/run-application/horizontal-pod-autoscale/" },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "ch-rollout",
        slug: "rollout",
        title: "更新与故障",
        lessons: [
          {
            id: "l-rollout",
            slug: "rolling-update",
            title: "滚动更新：不断服务换版本",
            priority: "must-know",
            minutes: 12,
            demo: "reconcile-loop",
            content: `动画里点「滚动更新」，盯住 Pod 舰队的变化节奏：

1. **先铺新的**：一个 v2 Pod 创建（此时 v1 还在服务，总量短暂是 N+1——这叫 maxSurge 溢出额度）；
2. **v2 就绪**：Creating → Running（新版本要先通过探针才算数）；
3. **再退旧的**：一个 v1 进入 Terminating；
4. 循环往复，直到舰队全部换血。

任何时刻至少有 N 个 Pod 能干活，**用户全程无感**。对比 Docker 篇的更新方式（stop → rm → run，中间是服务真空期），这就是为什么全世界都愿意把应用搬上 K8s。

**出问题怎么办？**一条命令回滚：

\`\`\`bash
kubectl rollout undo deployment/web
\`\`\`

还记得三层委托吗？旧版本的 ReplicaSet 一直躺在集群里（默认留 10 个历史），回滚就是把权重倒回旧队长——**不需要重新构建、不需要备份、几秒钟的事**。发布事故的恐惧，在这里被工程化地消解了。`,
            advanced: [
              {
                title: "高手视角：发布策略光谱",
                body: `滚动更新（RollingUpdate）只是起点。往精细走：**金丝雀**——先给 5% 流量上新版本（新 ReplicaSet 副本数压到 1），观察指标再放量，Service 同时选中 v1/v2 Pod 天然按比例分流；再往上是**蓝绿**（新旧两套整套切换）和**灰度分用户**（需要服务网格 Istio/Argo Rollouts 按用户特征路由）。策略选择的本质是：**你敢用多快的速度发现新版本有问题。**`,
                links: [
                  { label: "K8s 官方：Deployment 滚动更新策略", url: "https://kubernetes.io/zh-cn/docs/concepts/workloads/controllers/deployment/#strategy" },
                ],
              },
            ],
          },
          {
            id: "l-crashloop",
            slug: "crashloopbackoff",
            title: "CrashLoopBackOff：当调和循环救不了",
            priority: "important",
            minutes: 10,
            content: `调和循环能解决「进程死了」，解决不了「进程起来又立刻死」。于是你会在 \`kubectl get pods\` 里见到 K8s 最著名的错误状态：

\`\`\`
pod-web-9k3fq   0/1   CrashLoopBackOff   5 (2m ago)   123m
\`\`\`

**它在说什么**：容器启动 → 秒退 → 控制器按退避策略重试（10s、20s、40s……封顶 5 分钟）→ 反复循环。注意，这**不是故障本身，是集群在诚实地告诉你「这货我拉不活」**。

**排查三板斧**（Docker 篇学的肌肉在这里原样发力）：

\`\`\`bash
kubectl get pods                          # ① 谁 in CrashLoop
kubectl describe pod pod-web-9k3fq        # ② 看事件：退出码是多少？
kubectl logs pod-web-9k3fq --previous     # ③ 看上一次崩溃前的遗言
\`\`\`

高频根因（按出现频率排序）：**配置缺失**（没注入的环境变量——Docker 篇的 PORT 剧本原样重演）、**依赖不可达**（连不上数据库直接退）、**启动即崩的代码 bug**、**资源限制被 OOM 杀**（exit 137 又见面了）、**探针配太狠**（应用没病被 liveness 杀疯）。

你看，K8s 排障 = Docker 排障 + 一层「集群视角」。肌肉没白练。`,
            advanced: [
              {
                title: "排障决策树：从 BackOff 到根因",
                body: `\`describe\` 里看 **Last State**：exit code 0 = 应用自己认为该退（多半是配置告诉它别跑了）；exit 1 = 代码抛错（看 logs 遗言）；exit 137 = OOMKilled（调大 limits 或查内存泄漏）；**ImagePullBackOff** 是它表兄弟（镜像名打错/私有仓没凭证，看 describe Events 里的拉取失败原因）。终极大招 \`kubectl logs --previous\`：上一次崩溃前的日志通常直指根因。`,
                links: [
                  { label: "K8s 官方：调试 Pod（排障手册）", url: "https://kubernetes.io/zh-cn/docs/tasks/debug/debug-application/debug-pods/" },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "ch-real",
        slug: "real-cluster",
        title: "从浏览器到真机",
        lessons: [
          {
            id: "l-kind",
            slug: "kind",
            title: "毕业设计：用 kind 在真机起一个集群",
            priority: "must-know",
            minutes: 15,
            content: `你已经在浏览器里玩透了调和循环。最后一课，把它落到真机——**kind**（Kubernetes in Docker）官方出品的本地集群，用容器模拟节点，5 分钟起一个真集群：

\`\`\`bash
# 1. 装 kind（本机已有 Docker 即可）
brew install kind          # macOS（Windows: choco install kind，或去 GitHub 下二进制）

# 2. 起集群（第一次会拉镜像，约 1 分钟）
kind create cluster --name demo

# 3. 验证：你有一个真集群了
kubectl get nodes
# NAME                 STATUS   ROLES           AGE   VERSION
# demo-control-plane   Ready    control-plane   45s   v1.31.x

# 4. 部署 Docker 篇构建的镜像（先 kind load docker load 进去）
kind load docker-image my-web:1.0
kubectl create deployment web --image=my-web:1.0 --replicas=3

# 5. 见证调和循环
kubectl get pods -w        # 盯着 Pod 从 Creating 到 Running
kubectl delete pod <名字>   # 删一个，看它秒级重生
\`\`\`

**毕业清单**——做完这些，本站课程全部通关：

- [ ] kind 起集群，kubectl get nodes 看到 Ready
- [ ] 把 my-web:1.0 部署成 3 副本 Deployment
- [ ] 手动删一个 Pod，用 \`kubectl get pods -w\` 亲眼看到自愈
- [ ] \`kubectl scale\` 从 3 扩到 6，再缩回 3
- [ ] （选做）用 \`kubectl expose\` 建 Service，\`kubectl port-forward\` 后 curl 到你的网页

走完这份清单，你对 K8s 的理解已经超过「背概念」的绝大多数教程读者——因为调和循环你不但看过动画，还亲手在真集群里触发过。`,
            advanced: [
              {
                title: "选型：kind / minikube / k3d / k3s 怎么挑",
                body: `- **kind**：节点=容器，最贴近 CI 用法（K8s 官方测试也用它），本课首选；
- **minikube**：老牌，支持虚拟机/容器多驱动，Addons 生态丰富，教学友好；
- **k3d**：跑 **k3s**（轻量化发行版）的 kind 替代，资源占用极小，老旧笔记本福音；
- **k3s**：真的能上生产的极简发行版，树莓派/边缘计算最爱。

本地学习推荐 kind 或 k3d；想理解「多节点调度」，可以 kind 起个 3 节点配置（一份 YAML 配 control-plane + 2 worker）体验 Scheduler 挑机器。`,
                links: [
                  { label: "kind 快速开始（官方）", url: "https://kind.sigs.k8s.io/docs/user/quick-start/" },
                  { label: "K8s 官方：本地运行集群方案对比", url: "https://kubernetes.io/zh-cn/docs/setup/" },
                ],
              },
            ],
          },
        ],
      },
    ],
    summary: {
      keyPoints: [
        "自愈 = 重造不是复活；工业级健康判断靠探针",
        "滚动更新 = 新旧 ReplicaSet 此消彼长，rollout undo 秒级回滚",
        "CrashLoopBackOff 是症状不是病；三板斧 get → describe → logs --previous",
        "kind 让调和循环在真机 5 分钟成真",
      ],
    },
  },
];
