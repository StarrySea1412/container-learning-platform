<p align="center">
  <h1 align="center">🐳 容器学习平台</h1>
  <p align="center">开源的交互式容器中文学习网站 · Docker 正课 + K8s 进阶 + 原理篇 · 浏览器内自研 Docker 模拟引擎 · 双栏联动沙盒 · 事故场景挑战</p>
</p>

一个**完全在浏览器中运行**的容器学习平台：课程、可交互的 Docker 模拟沙盒、场景挑战、精选资源导航。不需要安装 Docker、不需要任何后端，打开网页就能练。

> 学习五重奏的第五件：[python-learning](https://gitee.com/starry-sea-1412/python-learning) · [git-learning-platform](https://gitee.com/starry-sea-1412/git-learning-platform) · [linux-learning-platform](https://gitee.com/starry-sea-1412/linux-learning-platform) · [photography-learning](https://gitee.com/starry-sea-1412/photography-learning)

> 技术栈：Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion

## ✨ 产品原则

**菜鸟看得懂，高手有真案例**（低地板 + 高天花板）：

- **全网最全**：Docker 正课（16 门规划）+ K8s 进阶（8 门规划）+ namespace/cgroups/overlayfs 原理篇——原理篇是全网少有的交互动画讲解；
- **交互最好**：双栏联动沙盒——左边敲 `docker run`，右边容器/镜像分层/网络拓扑/数据卷实时可视化；点任何对象反查对应命令；
- **动画驱动**：镜像分层缓存、端口映射、overlayfs 写时复制、容器 vs 虚拟机——动画是命令的真实结果，不是贴片演示；
- **本地可跑**：零后端、零依赖服务，`npm run dev` 即用，断网完整可用，进度本地保存。

## 🖥️ 自研容器模拟引擎

`src/lib/container-sandbox-engine.ts`（纯 TypeScript，无任何后端）：

- **虚拟镜像仓库**：nginx / redis / node / python / alpine 等 16 个常用镜像，体积与分层还原真实数据
- **容器生命周期**：run / ps / stop / kill（exit 137 剧本）/ pause / rm，端口冲突、名字冲突等真实报错
- **docker build 解释器**：Dockerfile 逐指令解析，支持多阶段构建、构建缓存（CACHED 标记）、COPY --from
- **端口映射与 HTTP**：`-p 8080:80` 后 `curl localhost:8080` 真的能通，且会留下 access log
- **数据卷与 bind mount**：named volume 生命周期、in-use 保护、bind mount 实时生效（改宿主机文件 → curl 立刻变化）
- **自定义网络与 DNS**：默认 bridge 无 DNS（真实行为！）、自定义网络容器名互访
- **compose 编排**：内置极简 YAML 解析器，`docker compose up/down` 全流程
- **终端体验**：Tab 补全、命令历史、颜色输出、help 系统

## 🎬 交互动画

核心概念均配有可交互动画（Framer Motion 实现，引擎状态驱动）：

镜像分层与构建缓存（CACHED/REBUILT 实时演示）· 端口映射与端口冲突 · 容器 vs 虚拟机 · overlayfs 写时复制

## 🚨 场景挑战

带剧情的实战演练，初始故障现场 + 逐条验证目标 + 分层提示 + 参考解法：

- **镜像瘦身：从 1.2GB 到 200MB 以内**（内置 Dockerfile 编辑器 + 自动判分）
- **凌晨 3 点：容器一启动就退出**（logs 排障第一现场）

## 🧭 高手折叠区与资源导航

- 每节课内置「高手折叠区」：生产事故复盘（PID 1 与优雅停机、日志撑爆磁盘、DNS 5 秒延迟、SNAT 端口耗尽）、源码与规范直达链接
- 精选资源导航：练手靶子（Gitea/Vaultwarden/MinIO/n8n）、效率工具（dive/lazydocker/k9s）、视频课与书籍——每条带点评和「什么时候去看」

## 🚀 快速开始

```bash
git clone https://gitee.com/starry-sea-1412/container-learning-platform.git
cd container-learning-platform
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。生产构建：`npm run build && npm start`。

## 📁 项目结构

```
src/
├── app/                    # 页面路由（App Router）
│   ├── courses/            # 课程列表
│   ├── course/[slug]/      # 课程阅读页（含高手折叠区、动画、沙盒任务）
│   ├── sandbox/            # 双栏联动沙盒
│   ├── challenges/         # 场景挑战（自动判分）
│   └── resources/          # 精选资源导航
├── components/container/   # 终端、可视化面板、交互动画
├── data/                   # 课程 / 挑战 / 资源 全部为声明式数据
│   ├── courses.ts          # 课程内容（22 节已上线，持续扩充）
│   ├── challenges.ts       # 场景挑战
│   └── resources.ts        # 精选资源
├── lib/container-sandbox-engine.ts  # 自研 Docker 模拟引擎
└── types/                  # 领域类型定义
```

课程内容完全数据驱动——新增课程只需在 `src/data/courses.ts` 添加条目。

## 🗺️ 路线图

| 阶段 | 内容 | 状态 |
|---|---|---|
| M1 | Docker 正课 6 门（22 节）+ 引擎 + 双栏沙盒 + 挑战 ×2 | ✅ |
| M2 | 镜像/Compose/网络挑战扩充至 10 个，速查表 | 🚧 |
| M3 | K8s 进阶篇 8 门 + 调和循环动画引擎 | 📋 |
| M4 | 原理篇（namespace / cgroups / overlayfs 专题） | 📋 |
| M5 | 定位测试与三轨学习路径、XP 成就系统 | 📋 |

## 📄 许可证

[MIT](LICENSE)
