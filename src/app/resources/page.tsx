import { resources } from "@/data/resources";
import { RESOURCE_CATEGORY_CONFIG } from "@/types";

export default function ResourcesPage() {
  const order = ["playground", "tools", "ecosystem", "video", "book", "official"] as const;
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">🧭 精选资源导航</h1>
      <p className="text-slate-500 mb-8 max-w-3xl">
        互联网上的容器资料多而杂，这里只收录编辑部亲自验证过的。每条都带<strong className="text-slate-700">点评</strong>（为什么值得、避什么坑）和
        <strong className="text-slate-700">学习节点绑定</strong>（什么时候去看最合适）——资源不在多，在对的时机出现。
      </p>
      <div className="space-y-10">
        {order.map((key) => {
          const cat = resources[key] ?? [];
          if (cat.length === 0) return null;
          const conf = RESOURCE_CATEGORY_CONFIG[key];
          return (
            <section key={key}>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-xl font-bold text-slate-800">{conf.icon} {conf.label}</h2>
                <span className="text-xs text-slate-400">{conf.desc}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {cat.map((r) => (
                  <a
                    key={r.name}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="card p-4 hover:border-sky-300 hover:shadow-md transition-all block group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 group-hover:text-sky-600 transition-colors">{r.name}</span>
                      {r.stars && <span className="chip !text-[10px] !py-0">⭐ {r.stars}</span>}
                      <span className="ml-auto text-slate-300 group-hover:text-sky-400 transition-colors">↗</span>
                    </div>
                    <div className="text-sm text-slate-600 mt-1.5 leading-relaxed">{r.desc}</div>
                    <div className="text-xs text-slate-500 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 leading-relaxed">
                      <strong className="text-amber-700">点评：</strong>{r.note}
                    </div>
                    {r.when && (
                      <div className="text-xs text-sky-600 mt-2">🎯 {r.when}</div>
                    )}
                  </a>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
