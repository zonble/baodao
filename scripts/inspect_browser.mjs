const res = await fetch("http://localhost:9222/json");
const targets = await res.json();
const page = targets.find(t => t.url.includes("localhost:8080"));
if (!page) {
  console.error("Page not found");
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);

ws.addEventListener("open", () => {
  let id = 1;
  const send = (method, params = {}) => {
    ws.send(JSON.stringify({ id: id++, method, params }));
  };

  send("Runtime.enable");
  send("Log.enable");

  setTimeout(() => {
    send("Runtime.evaluate", {
      expression: `
        (async () => {
          try {
            const { sounds } = await import("./js/audio.js");
            const { TMD_BGM } = await import("./js/bgmData.js");
            sounds.ensureContext();
            sounds.startBgm(0);
            
            await new Promise(r => setTimeout(r, 600));

            return {
              bgmPlaying: sounds.bgmPlaying,
              currentStageIndex: sounds.currentStageIndex,
              hasBgmTimer: !!sounds.bgmTimer,
              ctxState: sounds.ctx.state,
              currentTime: sounds.ctx.currentTime,
              bgmStep: sounds.bgmStep // If > 0, fallback was used! If 0, TMD was used!
            };
          } catch (e) {
            return { error: e.toString(), stack: e.stack };
          }
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
  }, 1000);
});

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.result && msg.result.result) {
    console.log("EVAL RESULT:", JSON.stringify(msg.result.result.value, null, 2));
    process.exit(0);
  }
});
