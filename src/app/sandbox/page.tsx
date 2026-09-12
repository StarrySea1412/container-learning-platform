import SandboxClient from "@/components/container/SandboxClient";

const QUICK = [
  "docker run -d -p 8080:80 nginx:alpine",
  "curl localhost:8080",
  "docker ps",
  "docker images",
  "docker history nginx:alpine",
  "cd web",
  "docker build -t mysite .",
  "docker run -d --name site -p 8081:80 mysite",
  "cd /root/stack",
  "docker compose up -d",
  "docker system df",
  "help",
];

export default function SandboxPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">🐳 容器沙盒</h1>
      <p className="text-slate-500 mb-6">
        一个完全在浏览器里模拟的 Docker 环境：虚拟镜像仓库、分层构建、端口映射、数据卷、自定义网络、compose 编排。
        敢删敢拆，<strong className="text-slate-700">rm -rf 整个世界也只是刷新一下的事</strong>。
      </p>
      <SandboxClient quickCommands={QUICK} height="h-[600px]" />
      <div className="grid md:grid-cols-3 gap-4 mt-6 text-sm text-slate-500">
        <div className="card p-4"><strong className="text-slate-700 block mb-1">🧪 推荐第一试</strong>docker run -d -p 8080:80 nginx:alpine，然后 curl localhost:8080，再 docker logs 看访问日志。</div>
        <div className="card p-4"><strong className="text-slate-700 block mb-1">🏗️ 推荐第二试</strong>cd web → cat Dockerfile → docker build -t mysite . → 跑起来 curl 一下。</div>
        <div className="card p-4"><strong className="text-slate-700 block mb-1">🎭 推荐第三试</strong>cd /root/stack → docker compose up -d，观察右侧网络面板里服务名互联。</div>
      </div>
    </div>
  );
}
