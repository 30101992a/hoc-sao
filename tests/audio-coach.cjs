const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });
  const p = await b.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(process.env.BASE_URL);
  await p.locator('.dock [data-tab="practice"]').tap();
  await p.locator('[data-mode="ear"]').tap();
  const audio = await p.evaluate(async () => {
    const ctx = await engine.ac(),
      buf = await loadBamboo(ctx);
    const hz = yinPitch(
      buf.getChannelData(0).slice(4800, 6848),
      buf.sampleRate,
    ).hz;
    return { duration: buf.duration, hz };
  });
  if (Math.abs(audio.hz - 523.25) > 8) throw Error("sample not C5 " + audio.hz);
  await p.locator('[data-act="ear-play"]').tap();
  await p.waitForTimeout(2200);
  if (!(await p.evaluate(() => ear.session.questions[0].heard)))
    throw Error("recorded audio playback");
  await p.locator('[data-mode="coach"]').tap();
  async function mic(kind = "echo", wrong = false, gap = false) {
    await p.evaluate(
      ({ kind, wrong, gap }) => {
        navigator.mediaDevices.getUserMedia = async () => {
          const c = new AudioContext(),
            dest = c.createMediaStreamDestination(),
            o = c.createOscillator(),
            g = c.createGain();
          o.frequency.value = wrong ? 261.625565 : 523.25113;
          if (kind === "pair")
            o.frequency.setValueAtTime(587.3295, c.currentTime + 2.8);
          g.gain.value = 0.12;
          if (gap) {
            g.gain.setValueAtTime(0, c.currentTime + 2.65);
            g.gain.setValueAtTime(0.12, c.currentTime + 2.98);
          }
          o.connect(g);
          g.connect(dest);
          o.start();
          window.fakeTrack = dest.stream.getTracks()[0];
          return dest.stream;
        };
        coach.heard = true;
        paint();
      },
      { kind, wrong, gap },
    );
    await p.locator('[data-act="coach-start"]').tap();
  }
  await mic();
  await p.waitForTimeout(1900);
  if (
    !(await p
      .locator("#coachResult")
      .innerText()
      .then((x) => x.includes("Đã thổi đúng")))
  )
    throw Error("echo real mic graph");
  if (!(await p.evaluate(() => fakeTrack.readyState === "ended")))
    throw Error("track leak");
  await mic("echo", true);
  await p.waitForTimeout(1900);
  if (!(await p.evaluate(() => coach.run && coach.run.index === 0)))
    throw Error("accepted wrong octave");
  await p.locator('[data-act="coach-stop"]').tap();
  await p.locator('[data-kind="pair"]').tap();
  await mic("pair", false, true);
  await p.waitForTimeout(5200);
  const pair = await p.locator("#coachResult").innerText();
  if (!pair.includes("Khoảng im lặng") || !pair.includes("Có khoảng ngắt"))
    throw Error("gap report " + pair);
  const metrics = await p.evaluate(() => {
    const notes = [
        { ...noteById("C4"), e: 2 },
        { ...noteById("D4"), e: 2 },
      ],
      samples = [];
    for (let k = -15; k < 135; k++) {
      const t = k * 0.02;
      let hz = 0;
      if (t >= 0.14 && t < 0.84) hz = 523.25;
      if (t >= 1.04 && t < 2.24) hz = 587.33;
      samples.push({ t, hz, rms: hz ? 0.1 : 0 });
    }
    const m = measurePhrase(notes, 0, 4, samples, 1);
    const shifted = samples.map((s) => ({ ...s, t: s.t + 0.1 }));
    const calibrated = measurePhrase(notes, 0, 4, shifted, 1, 0.1);
    return { m, calibrated, pair: gradePairSamples(samples, [60, 62]) };
  });
  if (
    metrics.m.rows[0].startMs < 120 ||
    metrics.m.rows[0].durationMs > -200 ||
    metrics.m.rows[1].durationMs < 150
  )
    throw Error("timing/duration " + JSON.stringify(metrics));
  if (
    Math.abs(metrics.m.rows[0].startMs - metrics.calibrated.rows[0].startMs) > 1
  )
    throw Error("latency");
  await p.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("denied", "NotAllowedError");
    };
    coach.heard = true;
    paint();
  });
  await p.locator('[data-act="coach-start"]').tap();
  await p.waitForTimeout(100);
  if (
    !(await p
      .locator("#coachLive")
      .innerText()
      .then((x) => x.includes("bị từ chối")))
  )
    throw Error("permission flow");
  // A held identical pitch cannot count as two distinct repeated notes.
  await p.evaluate(() => {
    coach.kind = "echo";
    coach.seq = [60, 60];
  });
  await mic();
  await p.waitForTimeout(1900);
  if (
    !(await p.evaluate(() => coach.run?.index === 1 && coach.run.awaitRelease))
  )
    throw Error("repeated note accepted without release");
  await p.locator('[data-act="coach-stop"]').tap();
  await p.evaluate(() => {
    navigator.mediaDevices.getUserMedia = () =>
      new Promise((resolve) => (window.resolvePendingMic = resolve));
    coach.heard = true;
    paint();
  });
  await p.locator('[data-act="coach-start"]').tap();
  await p.waitForTimeout(100);
  await p.locator('.dock [data-tab="notes"]').tap();
  await p.evaluate(() => {
    const ctx = new AudioContext(),
      dest = ctx.createMediaStreamDestination();
    window.pendingTrack = dest.stream.getTracks()[0];
    resolvePendingMic(dest.stream);
  });
  await p.waitForTimeout(100);
  if (
    !(await p.evaluate(
      () => pendingTrack.readyState === "ended" && !coach.stream,
    ))
  )
    throw Error("stale permission leaked mic");
  await p.locator('.dock [data-tab="practice"]').tap();
  for (const width of [320, 390, 844]) {
    await p.setViewportSize({ width, height: width === 844 ? 390 : 844 });
    if (
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    )
      throw Error("overflow");
    await p.screenshot({ path: `/tmp/upgrade-${width}.png` });
  }
  console.log(
    JSON.stringify({
      audio,
      pair,
      metrics: metrics.m,
      errors,
      result: "passed",
    }),
  );
  await b.close();
  if (errors.length) process.exitCode = 1;
})();
