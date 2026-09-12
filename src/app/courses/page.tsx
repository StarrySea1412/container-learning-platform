import Link from "next/link";
import { courses } from "@/data/courses";
import { TRACK_CONFIG, PRIORITY_CONFIG, Difficulty, Track } from "@/types";

const DIFF_LABEL: Record<Difficulty, string> = { beginner: "入门", intermediate: "中级", advanced: "高级" };

export default function CoursesPage() {
  const tracks: Track[] = ["docker", "principle", "k8s"];
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">课程矩阵</h1>
      <p className="text-slate-500 mb-8">Docker 正课从零讲起；原理篇拆开容器的引擎盖；K8s 进阶篇在容器之上学编排。每节课都有沙盒任务。</p>
      {tracks.map((track) => {
        const list = courses.filter((c) => c.track === track);
        if (list.length === 0) return null;
        return (
          <section key={track} className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-sm font-semibold px-3 py-1 rounded-lg ${TRACK_CONFIG[track].bgColor} ${TRACK_CONFIG[track].color}`}>{TRACK_CONFIG[track].label}</span>
              <span className="text-xs text-slate-400">{TRACK_CONFIG[track].desc}</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {list.map((c) => {
                const lessons = c.chapters.flatMap((ch) => ch.lessons);
                const minutes = lessons.reduce((s, l) => s + l.minutes, 0);
                return (
                  <Link key={c.id} href={`/course/${c.slug}`} className="card p-5 hover:border-sky-300 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{c.icon}</span>
                      <div>
                        <div className="font-bold text-slate-800">{c.title}</div>
                        <div className="text-xs text-slate-400">{DIFF_LABEL[c.difficulty]} · {lessons.length} 节 · 约 {minutes} 分钟</div>
                      </div>
                    </div>
                    <div className="text-sm text-slate-500 mt-3 leading-relaxed">{c.description}</div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {lessons.some((l) => l.advanced?.length) && <span className="chip !text-emerald-600 !bg-emerald-50 !border-emerald-200">🧗 有高手折叠区</span>}
                      {lessons.some((l) => l.demo) && <span className="chip !text-sky-600 !bg-sky-50 !border-sky-200">🎬 有动画</span>}
                      {lessons.slice(0, 3).map((l) => (
                        <span key={l.id} className={`chip ${l.priority ? PRIORITY_CONFIG[l.priority].bgColor : ""} ${l.priority ? PRIORITY_CONFIG[l.priority].color : ""}`}>{l.title}</span>
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
