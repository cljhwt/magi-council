import { defineTool } from '@deepseek-ai/dsh-tools';
import { magiToolOptions, envInvokeFactory } from './src/harness-tool.js';

export const name = 'magi-council';
export const inject = ['tools'];
export function apply(ctx) {
  const disposed = new AbortController();
  ctx.effect(() => () => disposed.abort());
  ctx.tools.register(defineTool(magiToolOptions({ invokeFactory: envInvokeFactory, disposeSignal: disposed.signal })));
}
