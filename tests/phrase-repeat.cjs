const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });
  const p = await b.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(process.env.BASE_URL);
  await p.evaluate(async () => {
    state.bpm = 112;
    state.tab = "sheet";
    state.lineRepeat = true;
    state.lineAutoSpeed = true;
    state.metro = false;
    const seq = [
      ["C4", 2],
      ["D4", 2],
      ["E4", 2],
      ["F4", 2],
    ];
    PIECES.push({ id: "test-loop", title: "Test", seq });
    const n = resolve(seq);
    document.querySelector("#app").innerHTML =
      previewScore(n, "test-loop") + linePracticeBar(n, "test-loop");
    lineListen.streakKey = "test-loop:0:8:112";
    lineListen.streak = 2;
    navigator.mediaDevices.getUserMedia = async () => {
      const ctx = new AudioContext(),
        dest = ctx.createMediaStreamDestination();
      const b = 60 / state.bpm,
        origin = ctx.currentTime + 0.08 + 5 * b;
      [72, 74, 76, 77].forEach((m, i) => {
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
        g.gain.value = 0.1;
        o.connect(g);
        g.connect(dest);
        o.start(origin + i * b);
        o.stop(origin + (i + 1) * b - 0.035);
      });
      window.lineTrack = dest.stream.getTracks()[0];
      return dest.stream;
    };
    await practiceLine(document.querySelector('[data-act="practice-line"]'));
  });
  await p.waitForTimeout(5900);
  const result = await p.evaluate(() => ({
    bpm: state.bpm,
    report: document.querySelector("#report-test-loop").innerText,
    on: lineListen.on,
    repeat: !!lineListen.repeatTimer,
    track: lineTrack.readyState,
  }));
  console.log(JSON.stringify(result));
  if (
    !result.report.includes("Nhịp vào nốt:") ||
    result.on ||
    !result.repeat ||
    result.track !== "ended"
  )
    throw Error("loop completion");
  if (result.bpm !== 116) throw Error("auto tempo " + result.bpm);
  await p.waitForFunction(() => lineListen.on, { timeout: 4500 });
  if (!(await p.evaluate(() => lineTrack.readyState === "live")))
    throw Error("repeat did not reopen mic");
  await p.evaluate(() => {
    state.tab = "notes";
    paint();
  });
  await p.waitForTimeout(2700);
  if (await p.evaluate(() => lineListen.on || !!lineListen.repeatTimer))
    throw Error("repeat survived navigation");
  if (errors.length) throw Error(errors.join(";"));
  console.log("repeat and tempo passed");
  await b.close();
})();
