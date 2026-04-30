import test from "node:test";
import assert from "node:assert/strict";

import { ScratchRemoteDebugger } from "../dist/scratch-remote-debugger.js";

test("ScratchRemoteDebugger retries target discovery after transient fetch failures", async () => {
  let fetchCalls = 0;
  const debuggerClient = new ScratchRemoteDebugger({
    fetch: async () => {
      fetchCalls += 1;
      if (fetchCalls < 3) {
        throw new TypeError("fetch failed");
      }

      return {
        ok: true,
        async json() {
          return [
            {
              id: "scratch-target",
              title: "Scratch 3",
              type: "page",
              url: "file:///Scratch/index.html",
              webSocketDebuggerUrl: "ws://127.0.0.1:9000/devtools/page/1"
            }
          ];
        }
      };
    }
  });

  const target = await debuggerClient.waitForScratchTarget(9000, 2000);

  assert.equal(target.id, "scratch-target");
  assert.equal(fetchCalls, 3);
});
