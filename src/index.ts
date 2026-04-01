/**

* ButterSync: A skeleton TypeScript repository using Bun, Vite, and JSR.
 */

export const sync = async (message: string): Promise<string> => {
  return `Syncing: ${message}`;
};

if (import.meta.main) {
  console.log(await sync("Hello World from Bun!"));
}