export interface ILogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
  debug?(message: string): void;
}

export interface IRAGLogger extends ILogger {
  sources(count: number, details: string): void;
  rerank(before: number, after: number): void;
  rewrite(original: string, rewritten: string): void;
}
