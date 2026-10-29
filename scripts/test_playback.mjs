const res = await fetch("http://localhost:9222/json");
const targets = await res.json();
const page = targets.find(t => t.url.includes("localhost:8080"));

const ws = new WebSocket(page.webSocketDebuggerUrl);

ws.addEventListener("open", () => {
  let id = 1;
  const send = (method, params = {}) => {
    ws.send(JSON.stringify({ id: id++, method, params }));
  };

  send("Runtime.enable");

  setTimeout(() => {
    send("Runtime.evaluate", {
      expression: `
        (async () => {
          try {
            const { sounds } = await import("./js/audio.js");
            const { TMD_BGM } = await import("./js/bgmData.js");
            
            // Simulate click to unlock AudioContext
            sounds.init();
            await sounds.ctx.resume();
            
            console.log("AudioContext state after resume:", sounds.ctx.state);
            console.log("AudioContext currentTime:", sounds.ctx.currentTime);
            
            // Track playTmdNote calls
            let playCount = 0;
            let noteErrors = [];
            const origPlay = sounds.playTmdNote.bind(sounds);
            sounds.playTmdNote = (n, t) => {
              playCount++;
              try {
                origPlay(n, t);
              } catch (err) {
                noteErrors.push(err.toString());
              }
            };
            
            sounds.startBgm(0);
            
            await new Promise(r => setTimeout(r, 1200));
            
            return {
              ctxState: sounds.ctx.state,
              currentTime: sounds.ctx.currentTime,
              playCount,
              noteErrors,
              bgmPlaying: sounds.bgmPlaying,
              currentStageIndex: sounds.currentStageIndex,
              bgmStep: sounds.bgmStep
            };
          } catch (e) {
            return { error: e.toString(), stack: e.stack };
          }
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
  }, 500);
});

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.result && msg.result.result) {
    console.log("TEST RESULT:", JSON.stringify(msg.result.result.value, null, 2));
    process.exit(0);
  }
});
