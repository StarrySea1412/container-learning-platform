/* 命令速查表 —— 数据驱动：每条 = 真实 Docker 命令 + 一句话用途 + 可选的高手备注。
   分组顺序即排查/使用频率顺序，与课程章节呼应。 */

export interface CheatEntry {
  cmd: string;
  desc: string;
  /** 高手备注：坑、参数细节、生产习惯 */
  note?: string;
}

export interface CheatGroup {
  id: string;
  icon: string;
  title: string;
  desc: string;
  entries: CheatEntry[];
}

export const cheatsheet: CheatGroup[] = [
  {
    id: "lifecycle",
    icon: "🚀",
    title: "容器生命周期",
    desc: "跑起来、看状态、停掉、删掉——最高频的八条",
    entries: [
      { cmd: "docker run -d --name web -p 8080:80 nginx:alpine", desc: "后台起一个容器：命名 + 端口映射 + 指定镜像", note: "-d 后台、--name 起名（不起名会随机分配）、-p 宿主机:容器。生产容器一律显式命名。" },
      { cmd: "docker ps", desc: "看运行中的容器", note: "加 -a 才能看到已退出的——排障第一步永远是 docker ps -a。" },
      { cmd: "docker stop web", desc: "优雅停机：先发 SIGTERM，宽限期后才 SIGKILL", note: "默认宽限 10s，可 -t 20 调整。应用要注册 SIGTERM 处理器才能优雅。" },
      { cmd: "docker kill web", desc: "破门而入：直接 SIGKILL", note: "退出码 137 = 128+9。别和 OOM 混淆——docker inspect 看 OOMKilled 字段区分。" },
      { cmd: "docker start web / docker restart web", desc: "把停掉的容器拉回来 / 重启", note: "容器内对文件的改动在 stop/start 之间保留（可写层还在），rm 后才消失。" },
      { cmd: "docker rm web", desc: "删除容器（须先停止）", note: "-f 可强删运行中的。rm 不删卷——数据安全靠这条纪律兜底。" },
      { cmd: "docker rename old new", desc: "给容器改名" },
      { cmd: "docker exec -it web sh", desc: "钻进运行中的容器开个 shell", note: "exec 起的是新进程，不是主进程；主进程 PID 1 死了容器就死，与 exec 无关。" },
    ],
  },
  {
    id: "image",
    icon: "📦",
    title: "镜像管理",
    desc: "拉取、构建、瘦身、盘点",
    entries: [
      { cmd: "docker pull nginx:alpine", desc: "从 registry 拉镜像", note: "不写 tag 默认 latest。latest 是可变指针，生产环境永远用明确版本号。" },
      { cmd: "docker build -t app:1.0 .", desc: "按 Dockerfile 构建并打 tag", note: "最后的 . 是构建上下文，不是 Dockerfile 路径。上下文越大上传越慢，配 .dockerignore。" },
      { cmd: "docker build -t app:1.0 -f Dockerfile.prod .", desc: "指定 Dockerfile 构建" },
      { cmd: "docker images", desc: "盘点本地镜像（体积一目了然）" },
      { cmd: "docker history app:1.0", desc: "逐层看镜像是怎么长大的", note: "找「哪层最肥」的第一工具，自下而上 = 自旧而新。" },
      { cmd: "docker rmi app:1.0", desc: "删除镜像", note: "有容器在用会拒绝，-f 强删。镜像瘦身前先删旧的，否则新镜像只是叠加。" },
      { cmd: "docker tag app:1.0 registry.example.com/app:1.0", desc: "给镜像打新标签（用于推送私有仓库）", note: "tag 只是指针，不复制层数据，瞬间完成。" },
      { cmd: "docker push registry.example.com/app:1.0", desc: "推送镜像到 registry" },
      { cmd: "docker save app:1.0 -o app.tar / docker load -i app.tar", desc: "离线导出/导入镜像", note: "内网交付、断网迁移的正规姿势，比 scp 整个 /var/lib/docker 干净得多。" },
    ],
  },
  {
    id: "dockerfile",
    icon: "📜",
    title: "Dockerfile 指令",
    desc: "构建脚本的九个核心指令",
    entries: [
      { cmd: "FROM node:20-alpine", desc: "指定基础镜像——镜像体积的大头", note: "瘦身第一杠杆：完整发行版 vs alpine/slim 能差 10 倍。" },
      { cmd: "WORKDIR /app", desc: "设定工作目录（后续指令的基准）", note: "比 RUN cd 好：目录自动创建，且路径语义清晰。" },
      { cmd: "COPY package.json ./", desc: "把文件从构建上下文拷进镜像", note: "缓存黄金法则：依赖清单单独一层，先于源码层，改代码才不会重装依赖。" },
      { cmd: "RUN npm install", desc: "构建期执行命令并生成新层", note: "每条 RUN = 一层。合并清理：RUN apt-get update && ... && rm -rf /var/lib/apt/*。" },
      { cmd: "COPY --from=build /app/dist ./dist", desc: "多阶段构建：从上一个阶段只搬产物", note: "编译器、devDependencies、构建缓存全留在 build 阶段，最终镜像只剩运行时。" },
      { cmd: "EXPOSE 3000", desc: "声明容器监听的端口（元数据）", note: "纯文档作用，不发布端口；真正映射靠 run -p。" },
      { cmd: "ENV NODE_ENV=production", desc: "设置环境变量（构建期与运行期都在）" },
      { cmd: 'ENTRYPOINT ["nginx"]\nCMD ["-g", "daemon off;"]', desc: "入口 + 默认参数：ENTRYPOINT 定程序，CMD 定参数", note: "run 时追加的参数会覆盖 CMD 而保留 ENTRYPOINT——这就是它能当「固定命令」用。" },
      { cmd: "VOLUME /data", desc: "声明匿名卷", note: "防运行时数据写进可写层；但匿名卷名字随机，生产还是显式 -v 命名卷。" },
    ],
  },
  {
    id: "troubleshoot",
    icon: "🚨",
    title: "排障五件套",
    desc: "容器出事时的标准动作，按顺序来",
    entries: [
      { cmd: "docker ps -a", desc: "① 看状态：Running / Restarting / Exited (137)？", note: "退出码速查：0 正常 / 1 应用报错 / 137 SIGKILL（OOM 嫌疑）/ 125 daemon 错误。" },
      { cmd: "docker logs web", desc: "② 看日志：秒退容器的答案几乎都在这", note: "--tail 100 -f 常用组合；json-file 驱动无上限，长跑容器配 --log-opt max-size。" },
      { cmd: "docker inspect web", desc: "③ 看配置与状态全量 JSON", note: "重点看 State.OOMKilled、RestartCount、Mounts、NetworkSettings——四个高频案发现场。" },
      { cmd: "docker stats", desc: "④ 看资源：CPU / 内存用量与限额", note: "MEM USAGE 逼近 LIMIT 就离 137 不远了。没限额的容器显示宿主机总量——这本身就是隐患。" },
      { cmd: "docker exec web env", desc: "⑤ 钻进去看现场：环境变量 / 文件 / 进程", note: "exec web ps aux 看进程，exec web cat /etc/app/config.json 验配置。" },
      { cmd: "docker port web", desc: "查容器的端口映射关系", note: "「8080 被谁占了」的答案常在这里——配合 docker ps 看 PORTS 列。" },
      { cmd: "docker system df", desc: "磁盘体检：镜像/容器/卷/构建缓存各占多少", note: "磁盘告警先跑这条，再决定 rmi / volume prune / system prune。" },
    ],
  },
  {
    id: "volume",
    icon: "💾",
    title: "数据卷",
    desc: "让数据活过容器的生死",
    entries: [
      { cmd: "docker volume create appdata", desc: "创建命名卷", note: "判断标准一句话：这份数据死了之后还要吗？要，就进卷。" },
      { cmd: "docker run -d -v appdata:/var/lib/mysql mysql:8", desc: "挂载命名卷（不存在会自动创建）" },
      { cmd: "docker run -d -v /root/web:/usr/share/nginx/html nginx:alpine", desc: "bind mount：挂宿主机目录，改文件即时生效", note: "开发热更新用它，生产数据用命名卷——路径可移植性是 bind mount 的软肋。" },
      { cmd: "docker volume ls / docker volume inspect appdata", desc: "盘点卷 / 看卷详情（真实宿主机路径）" },
      { cmd: "docker volume rm appdata", desc: "删除卷", note: "有容器挂着会拒绝（in-use 保护）。数据无价，rm 前三思。" },
      { cmd: "docker volume prune", desc: "清掉所有没被挂载的卷", note: "回收空间利器，也是误删数据的常见现场——先 volume ls 看清楚再执行。" },
    ],
  },
  {
    id: "network",
    icon: "🌐",
    title: "网络",
    desc: "容器互访与端口发布",
    entries: [
      { cmd: "docker network create appnet", desc: "创建自定义网络", note: "自定义网络自带容器名 DNS——这是它和默认 bridge 的本质区别。" },
      { cmd: "docker run -d --network appnet --name api myapi:1.0", desc: "把容器直接跑进指定网络" },
      { cmd: "docker network connect appnet web", desc: "把已在运行的容器接入网络（不用重建）" },
      { cmd: "docker exec web curl http://api:80", desc: "容器名互访：同网络内容器名即主机名", note: "默认 bridge 没有这条福利（无 DNS）——微服务互访一律走自定义网络。" },
      { cmd: "docker network ls / docker network inspect appnet", desc: "盘点网络 / 看谁在里面", note: "inspect 的 Containers 字段就是网络成员名单。" },
      { cmd: "docker network rm appnet", desc: "删除网络", note: "有活跃端点会拒绝；compose down 会自动收掉它建的网络。" },
    ],
  },
  {
    id: "compose",
    icon: "🎼",
    title: "Compose 编排",
    desc: "把一组 docker run 声明成一个 YAML",
    entries: [
      { cmd: "docker compose up -d", desc: "一条命令起整套服务", note: "自动建项目网络（服务名 DNS）、按 depends_on 排序，全部免费赠送。" },
      { cmd: "docker compose ps / logs -f", desc: "看编排内容器的状态 / 跟踪日志" },
      { cmd: "docker compose down", desc: "停掉并删除整套容器与网络", note: "卷默认保留（数据安全）；确认不要了加 -v。" },
      { cmd: "docker compose up -d --build", desc: "改了代码重新构建并更新服务", note: "声明式：改 YAML ≠ 生效，down/up（或 up --build）才是应用动作。" },
      { cmd: "docker compose config", desc: "校验并展开 compose 文件", note: "写完 YAML 先跑这条，语法错误当场暴露。" },
    ],
  },
  {
    id: "maintain",
    icon: "🧹",
    title: "系统维护",
    desc: "清理、登录与版本",
    entries: [
      { cmd: "docker system prune", desc: "一键清理：停止的容器 + 悬空镜像 + 无用网络", note: "不带卷（数据安全）。加 -a 连未使用的镜像一起清，更狠。" },
      { cmd: "docker image prune -a", desc: "清掉所有没被容器引用的镜像", note: "CI 机器定期跑，磁盘不再慢性爆仓。" },
      { cmd: "docker login / docker logout", desc: "登录 / 登出 registry", note: "凭证写入 ~/.docker/config.json——注意别把它打进构建上下文。" },
      { cmd: "docker version / docker info", desc: "看客户端与 daemon 版本 / 全局信息", note: "排障报 issue 前先带上这两条的输出。" },
      { cmd: "docker cp web:/etc/app/config.json ./", desc: "容器与宿主机之间拷文件", note: "应急取证据的快刀；长期方案还是卷或挂载。" },
    ],
  },
];
