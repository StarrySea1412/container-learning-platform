export type Difficulty = "beginner" | "intermediate" | "advanced";
export type Track = "docker" | "k8s" | "principle";
export type LessonPriority = "must-know" | "important" | "optional";

export const PRIORITY_CONFIG: Record<LessonPriority, { label: string; color: string; bgColor: string }> = {
  "must-know": { label: "必学", color: "text-red-400", bgColor: "bg-red-400/15" },
  important: { label: "重点", color: "text-amber-400", bgColor: "bg-amber-400/15" },
  optional: { label: "拓展", color: "text-blue-400", bgColor: "bg-blue-400/15" },
};

export const TRACK_CONFIG: Record<Track, { label: string; color: string; bgColor: string; desc: string }> = {
  docker: { label: "Docker 正课", color: "text-sky-400", bgColor: "bg-sky-400/15", desc: "从零到熟练使用 Docker" },
  k8s: { label: "K8s 进阶篇", color: "text-indigo-400", bgColor: "bg-indigo-400/15", desc: "在容器之上学习编排" },
  principle: { label: "原理篇", color: "text-emerald-400", bgColor: "bg-emerald-400/15", desc: "namespace / cgroups / overlayfs" },
};

/** 沙盒任务的状态校验谓词（数据可序列化，由挑战/课程页解释执行） */
export type CheckPredicate =
  | { type: "imageExists"; ref: string }
  | { type: "imageSizeLtMb"; ref: string; mb: number }
  | { type: "containerRunning"; name: string }
  | { type: "containerGone"; name: string }
  | { type: "portBound"; hostPort: number }
  | { type: "volumeExists"; name: string }
  | { type: "networkHasContainer"; network: string; container: string }
  | { type: "curlOk"; url: string }
  | { type: "commandRan"; keyword: string };

export interface SandboxExercise {
  task: string;
  hint?: string;
  /** 参考答案：逐条命令（默认折叠，先自己试再看） */
  solution?: string[];
  /** 沙盒开始前自动执行的命令（营造初始状态） */
  initialCommands?: string[];
  checks?: CheckPredicate[];
}

/** 高手折叠区：生产实战案例 / 源码直达 / 性能数据 / 面试追问 */
export interface AdvancedNote {
  title: string;
  body: string;
  links?: { label: string; url: string }[];
}

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  priority?: LessonPriority;
  minutes: number;
  content: string;
  /** 内嵌交互动画组件 key（见 DemoRenderer） */
  demo?: string;
  sandboxExercise?: SandboxExercise;
  advanced?: AdvancedNote[];
}

export interface Chapter {
  id: string;
  slug: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  track: Track;
  difficulty: Difficulty;
  duration: string;
  icon: string;
  tags: string[];
  chapters: Chapter[];
  summary?: { keyPoints: string[] };
}

/* ---------- 精选资源 ---------- */

export type ResourceCategory = "playground" | "tools" | "ecosystem" | "video" | "book" | "official";

export const RESOURCE_CATEGORY_CONFIG: Record<ResourceCategory, { label: string; icon: string; desc: string }> = {
  playground: { label: "练手靶子", icon: "🎯", desc: "值得亲手容器化的真实开源项目" },
  tools: { label: "效率工具", icon: "🧰", desc: "装在本机、每天都会用的容器工具链" },
  ecosystem: { label: "进阶生态", icon: "🧭", desc: "从这里继续深入云原生世界" },
  video: { label: "视频课程", icon: "🎬", desc: "讲得好的视频课，配合本站查漏补缺" },
  book: { label: "书籍", icon: "📚", desc: "值得通读的经典" },
  official: { label: "官方文档与规范", icon: "📄", desc: "一手资料，高手折叠区的常客" },
};

export interface ResourceItem {
  name: string;
  url: string;
  desc: string;
  /** 编辑部点评：为什么值得 / 避什么坑 */
  note: string;
  /** 绑定学习节点：什么时候去看 */
  when?: string;
  stars?: string;
}

/* ---------- 场景挑战 ---------- */

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  difficulty: "简单" | "中等" | "困难";
  minutes: number;
  icon: string;
  story: string;
  /** 开场白：初始现象描述 */
  scene: string;
  initialCommands: string[];
  /** 挑战中允许用户编辑的文件（引擎内路径） */
  editableFile?: string;
  goals: { id: string; desc: string; check: CheckPredicate; hint: string }[];
  solution: string[];
  takeaway: string;
}
