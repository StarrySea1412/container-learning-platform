/* 三轨定位测试 —— 10 道情景选择题，按作答画像推荐学习轨道。
   设计原则：题目全是「场景判断」而非名词解释，答错的选项本身也是教学内容。 */

export type TrackId = "zero" | "skip" | "sre";

export interface QuizOption {
  text: string;
  /** 是否最佳答案；解释在 explanation 里统一给 */
  correct?: boolean;
}

export interface QuizQuestion {
  id: string;
  scene: string;
  options: QuizOption[];
  /** 答案解析：选什么、为什么、去哪门课看 */
  explanation: string;
  /** 该题考的是哪个知识域，答错计入对应轨道的信号 */
  domain: "docker" | "image" | "ops" | "k8s" | "principle";
}

export interface TrackDef {
  id: TrackId;
  icon: string;
  title: string;
  tagline: string;
  desc: string;
  path: { step: string; href?: string }[];
}

export const quiz: QuizQuestion[] = [
  {
    id: "q1",
    scene: "同事说「刚才明明 build 过了」，但你 docker images 里死活找不到他说的镜像。最可能的原因是？",
    options: [
      { text: "镜像构建失败了，但他没看构建输出", correct: true },
      { text: "镜像被自动清理任务删掉了" },
      { text: "docker images 只显示运行中的镜像" },
],
    explanation:
      "build 中途报错（比如某条 RUN 失败）就不会产出最终镜像，而新手经常不看滚屏输出。docker images 显示的是本地全部镜像，与运行无关。→《镜像与容器基础》",
    domain: "docker",
  },
  {
    id: "q2",
    scene: "docker run -p 8080:80 nginx 后访问 localhost:8080 通了。这个 8080 到底是谁监听的？",
    options: [
      { text: "宿主机上的 docker-proxy/内核转发，把流量转进容器 80", correct: true },
      { text: "容器把 nginx 进程直接跑在了宿主机 8080 上" },
      { text: "nginx 自己改了配置监听 8080" },
    ],
    explanation:
      "-p 是宿主机与容器端口之间的 NAT 映射：宿主机上 8080 收到流量后被转进容器的 80。容器里的 nginx 始终只监听 80。→《容器网络》端口映射一节",
    domain: "docker",
  },
  {
    id: "q3",
    scene: "一条 Dockerfile 里 RUN npm install 排在 COPY . . 之后。改一行前端代码重新 build 会发生什么？",
    options: [
      { text: "COPY . . 层缓存失效，npm install 层被连坐重跑", correct: true },
      { text: "只有 COPY . . 重跑，npm install 依然 CACHED" },
      { text: "所有层都重跑，因为代码变了" },
    ],
    explanation:
      "构建缓存是多米诺：某层失效，其后所有层连环作废。黄金法则「最常变的放最后」——先 COPY package.json、再 npm install、最后 COPY 源码。→《Dockerfile 精讲》与挑战「CI 慢如牛」",
    domain: "image",
  },
  {
    id: "q4",
    scene: "FROM node:20 换成 FROM node:20-alpine 通常能省下多少空间？为什么？",
    options: [
      { text: "约 900MB——完整 Debian 用户态被换成了极简 musl 世界", correct: true },
      { text: "约 10MB——只是少了一些文档" },
      { text: "不会变——基础镜像体积和应用无关" },
    ],
    explanation:
      "node:20 约 1GB，node:20-alpine 约 130MB，差的大头是完整发行版的用户态（apt、glibc 工具链、文档）。瘦身的本质是「运行时真正需要什么」。→《镜像优化与瘦身》",
    domain: "image",
  },
  {
    id: "q5",
    scene: "容器里往 /var/log/app.log 写了 2GB 日志，docker rm 容器后这 2GB 在哪？",
    options: [
      { text: "随可写层一起被删除了", correct: true },
      { text: "还在宿主机 /var/lib/docker 里，要手动清" },
      { text: "自动被转移到了某个卷里" },
    ],
    explanation:
      "可写层的命运 = 容器的命运。rm 连带可写层一起删，数据想活过容器就必须放卷里（或宿主机 bind mount）。json-file 日志驱动的内容同理也是容器级的。→《数据管理与卷》",
    domain: "ops",
  },
  {
    id: "q6",
    scene: "凌晨磁盘告警 95%，docker system df 显示 Local Volumes 巨大。最稳妥的第一步是？",
    options: [
      { text: "docker volume ls 找出没被挂载的卷，再决定 prune", correct: true },
      { text: "直接 docker volume prune，反正它只删没用的" },
      { text: "把 /var/lib/docker/volumes 整个目录 rm 掉" },
    ],
    explanation:
      "prune 会无差别删除所有未被挂载的卷——先 ls 看名单，确认没有「暂时没挂但重要」的卷再动手。直接 rm 目录会让 daemon 的元数据与实际状态错位。→ 挑战「日志爆盘」与《数据管理与卷》",
    domain: "ops",
  },
  {
    id: "q7",
    scene: "两个容器都起在默认 bridge 上，互相 ping 容器名 ping 不通。为什么？",
    options: [
      { text: "默认 bridge 没有内置 DNS，只有 IP 互通——建自定义网络才有名字解析", correct: true },
      { text: "ping 被防火墙挡了，curl 其实是通的" },
      { text: "容器名 DNS 需要 --link 参数才有（--link 现在仍推荐使用）" },
    ],
    explanation:
      "这是历史兼容行为，不是故障：默认 bridge 只有 IP 互通。自定义网络自带容器名 DNS。--link 是已废弃的旧方案，别再学它。→《容器网络》与挑战「微服务互相找不到」",
    domain: "docker",
  },
  {
    id: "q8",
    scene: "容器 Exited (137)，docker inspect 里 OOMKilled: true。137 这个数字怎么来的？",
    options: [
      { text: "128 + 9：进程被信号 9（SIGKILL）终止的通用公式", correct: true },
      { text: "137 是 OOM Killer 专属错误码" },
      { text: "应用代码里调用了 exit(137)" },
    ],
    explanation:
      "退出码 = 128 + 信号编号，9 是 SIGKILL。OOMKilled: true 才把「内核杀的」和「你 docker kill 杀的」区分开。治本：给容器 -m 限额 + 应用做内存画像。→ 挑战「exit 137」",
    domain: "ops",
  },
  {
    id: "q9",
    scene: "K8s 里你把 Deployment 副本数从 3 改到 5，之后手动删掉一个 Pod。会发生什么？",
    options: [
      { text: "控制器发现实际 4 ≠ 期望 5，自动补一个新 Pod", correct: true },
      { text: "保持 4 个，直到你再次修改副本数" },
      { text: "报错：手动操作与声明式管理冲突" },
    ],
    explanation:
      "声明式调和循环：控制器持续对比期望与实际状态，差额自动补齐。删 Pod 是合法的（Pod 必死勿念），自愈是设计而非意外。→《为什么需要 Kubernetes》与《调和循环实战》",
    domain: "k8s",
  },
  {
    id: "q10",
    scene: "docker run -m 100m --memory-swap 100m 后容器里的 Java 满堆报 OOM。JVM 看到的内存上限是？",
    options: [
      { text: "旧 JVM 看到的是宿主机总内存——cgroup 限额它感知不到，堆照样超，然后被内核杀", correct: true },
      { text: "100MB——JVM 一直都能正确感知 cgroup 限额" },
      { text: "宿主机总内存的一半" },
    ],
    explanation:
      "JVM 8u191 之前根本不感知 cgroup：UseContainerSupport 默认关闭时代，堆按宿主机内存估算，然后被 cgroup 限额击杀，这就是著名的「容器里跑 JVM 必挂」事故。原理在 cgroup。→《容器是怎么被造出来的》",
    domain: "principle",
  },
];

export const tracks: Record<TrackId, TrackDef> = {
  zero: {
    id: "zero",
    icon: "🌱",
    title: "零基础顺序轨",
    tagline: "从「代码为什么在别人机器上跑不起来」讲起",
    desc: "老老实实从第一章开始，每一课都往沙盒里敲一遍。容器的地基（镜像、层、端口）一次打牢。",
    path: [
      { step: "容器思想史 → 镜像与容器基础 → Dockerfile 精讲", href: "/course/dockerfile" },
      { step: "镜像优化与瘦身 → 数据管理与卷 → 容器网络", href: "/course/networking" },
      { step: "挑战区实战：从「镜像瘦身」开始逐个通关", href: "/challenges" },
      { step: "原理篇：想知道容器到底是怎么被造出来的再来", href: "/course/principles-container" },
    ],
  },
  skip: {
    id: "skip",
    icon: "🚀",
    title: "熟手跳级轨",
    tagline: "docker run 你早会了，缺的是体系和排障章法",
    desc: "定位测试错的大多是缓存、缓存连坐、cgroup、可写层这些「半桶水重灾区」。跳过入门，直击薄弱点。",
    path: [
      { step: "Dockerfile 精讲（重点：层与缓存）", href: "/course/dockerfile" },
      { step: "镜像优化与瘦身 → 数据管理与卷", href: "/course/image-slimming" },
      { step: "把 10 个事故挑战当测验做，全对算过关", href: "/challenges" },
      { step: "K8s 进阶篇：compose 之上加自愈", href: "/course/k8s-why" },
    ],
  },
  sre: {
    id: "sre",
    icon: "🔥",
    title: "SRE 直达轨",
    tagline: "你不缺知识，缺的是事故现场",
    desc: "命令都会敲，那就直接上案发现场：10 个生产事故挑战 + 原理篇硬核拆解，把「为什么」补成体系。",
    path: [
      { step: "事故挑战全部通关（重启风暴 / 日志爆盘 / OOM 137 / CI 缓存…）", href: "/challenges" },
      { step: "原理篇：namespace / cgroups / overlayfs 硬核拆解", href: "/course/principles-container" },
      { step: "K8s 调和循环实战 + CrashLoopBackOff 排障三板斧", href: "/course/k8s-reconcile" },
      { step: "资源导航：挑一个真实开源项目做容器化毕业设计", href: "/resources" },
    ],
  },
};
