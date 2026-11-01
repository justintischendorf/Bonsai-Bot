import { Glob } from "bun";
import path from "node:path";
import type { Command, Event } from "./types.ts";

const srcDir = import.meta.dir;

async function loadModules<T>(pattern: string): Promise<T[]> {
  const modules: T[] = [];
  for await (const file of new Glob(pattern).scan(srcDir)) {
    const mod = await import(path.join(srcDir, file));
    if (!mod.default) {
      console.warn(`Überspringe ${file}: kein export default`);
      continue;
    }
    modules.push(mod.default as T);
  }
  return modules;
}

export const loadCommands = () => loadModules<Command>("commands/**/*.ts");
export const loadEvents = () => loadModules<Event>("events/*.ts");
