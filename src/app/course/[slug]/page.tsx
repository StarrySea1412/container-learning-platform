import { notFound } from "next/navigation";
import Link from "next/link";
import { courses } from "@/data/courses";
import Markdown from "@/components/container/Markdown";
import { DemoRenderer } from "@/components/container/demos";
import { AdvancedSection, SandboxExerciseBlock } from "@/components/container/LessonExtras";
import { PRIORITY_CONFIG } from "@/types";

export function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = courses.find((c) => c.slug === slug);
  if (!course) notFound();
  const lessons = course.chapters.flatMap((ch) => ch.lessons.map((l) => ({ ...l, chapter: ch.title })));

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 grid lg:grid-cols-[240px_1fr] gap-8">
      {/* 侧边目录（sticky 不能和 .glass 同元素——.glass 的 position:relative 会顶掉 sticky） */}
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <div className="glass p-5 space-y-4">
          <Link href="/courses" className="text-xs text-slate-400 hover:text-sky-600">← 返回课程列表</Link>
          <div>
            <div className="flex items-center gap-2 font-bold text-slate-800"><span>{course.icon}</span>{course.title}</div>
            <div className="text-xs text-slate-400 mt-1">{lessons.length} 节 · {course.duration}</div>
          </div>
          {course.chapters.map((ch) => (
            <div key={ch.id}>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{ch.title}</div>
              <ul className="space-y-0.5">
                {ch.lessons.map((l) => (
                  <li key={l.id}>
                    <a href={`#${l.slug}`} className="block text-sm text-slate-600 hover:text-sky-600 hover:translate-x-0.5 transition-all py-0.5">{l.title}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          </div>
        </div>
      </aside>

      {/* 正文 */}
      <article className="min-w-0">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{course.icon}</span>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{course.title}</h1>
              <p className="text-slate-500 mt-1">{course.description}</p>
            </div>
          </div>
        </header>

        {course.chapters.map((ch) => (
          <section key={ch.id} className="mb-12">
            <h2 className="text-lg font-bold text-slate-400 border-b border-slate-200 pb-2 mb-6">{ch.title}</h2>
            {ch.lessons.map((l) => (
              <section key={l.id} id={l.slug} className="mb-14 scroll-mt-20">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <h3 className="text-2xl font-bold text-slate-900">{l.title}</h3>
                  {l.priority && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[l.priority].bgColor} ${PRIORITY_CONFIG[l.priority].color}`}>
                      {PRIORITY_CONFIG[l.priority].label}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">⏱ {l.minutes} 分钟</span>
                </div>
                {l.demo && <DemoRenderer name={l.demo} />}
                <Markdown>{l.content}</Markdown>
                {l.advanced && l.advanced.length > 0 && <AdvancedSection notes={l.advanced} />}
                {l.sandboxExercise && <SandboxExerciseBlock exercise={l.sandboxExercise} sandboxHref="/sandbox" />}
                <div className="text-xs text-slate-400 mt-4">本章内容全部可以在 <Link href="/sandbox" className="text-sky-600 hover:underline">沙盒</Link> 里亲手验证。</div>
              </section>
            ))}
          </section>
        ))}

        {course.summary && (
          <section className="card p-6 bg-gradient-to-br from-sky-50 to-indigo-50">
            <h2 className="font-bold text-slate-800 mb-3">📋 课程总结卡</h2>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {course.summary.keyPoints.map((k) => <li key={k}>✓ {k}</li>)}
            </ul>
          </section>
        )}
      </article>
    </div>
  );
}
