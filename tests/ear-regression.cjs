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
  const gen = await p.evaluate(() => {
    for (const lesson of EAR_LESSONS)
      for (const level of [1, 2, 3])
        for (let i = 0; i < 20; i++) {
          const s = makeEarSession(lesson.id, level);
          if (s.questions.length !== 10) throw Error("length");
          if (
            ["same", "direction"].includes(lesson.id) &&
            s.questions.filter((q) => q.answer === s.questions[0].answer)
              .length !== 5
          )
            throw Error("balance");
          for (const q of s.questions) {
            if (
              lesson.id === "same" &&
              (q.seq[0] === q.seq[1]) !== (q.answer === "same")
            )
              throw Error("same");
            if (
              lesson.id === "direction" &&
              q.seq[1] > q.seq[0] !== (q.answer === "up")
            )
              throw Error("direction");
            if (
              lesson.id === "name" &&
              (q.seq[0] !== 60 ||
                q.seq[1] !== Number(q.answer) ||
                !q.options.some((o) => o[0] === q.answer))
            )
              throw Error("name");
            if (lesson.id === "echo" && q.seq.length !== level)
              throw Error("echo");
          }
        }
    return "240 sessions checked";
  });
  if (!(await p.locator('[data-act="ear-answer"]').first().isDisabled()))
    throw Error("premature answer");
  await p.evaluate(() => (state.voice = false));
  await p.locator('[data-act="ear-play"]').tap();
  await p.waitForTimeout(150);
  if (!(await p.evaluate(() => ear.playing && engine.nodes.length > 0)))
    throw Error("audio while voice off");
  await p.waitForTimeout(2000);
  if (!(await p.evaluate(() => ear.session.questions[0].heard && !ear.playing)))
    throw Error("audio completion");
  for (let i = 0; i < 10; i++) {
    await p.evaluate(() => {
      const q = ear.session.questions[ear.session.index];
      q.heard = true;
      paint();
    });
    const ans = await p.evaluate(
      () => ear.session.questions[ear.session.index].answer,
    );
    await p.locator(`[data-act="ear-answer"][data-answer="${ans}"]`).tap();
    await p.evaluate(() =>
      answerEar(ear.session.questions[ear.session.index].answer),
    );
    if ((await p.evaluate(() => ear.session.good)) !== i + 1)
      throw Error("duplicate score");
    await p.locator('[data-act="ear-next"]').tap();
  }
  if (!(await p.getByRole("heading", { name: "10/10 câu đúng" }).isVisible()))
    throw Error("summary");
  if ((await p.evaluate(() => earHistory().length)) !== 1)
    throw Error("history");
  await p.evaluate(() => paint());
  if ((await p.evaluate(() => earHistory().length)) !== 1)
    throw Error("duplicate history");
  await p.locator('[data-lesson="echo"]').tap();
  await p.locator('[data-act="ear-level"][data-level="3"]').tap();
  await p.evaluate(() => {
    ear.session.questions[0].heard = true;
    paint();
  });
  await p.locator('[data-act="ear-reveal"]').tap();
  await p.getByText("Đối chiếu", { exact: true }).waitFor();
  await p.locator('[data-act="ear-echo-next"]').tap();
  if ((await p.evaluate(() => earHistory().length)) !== 1)
    throw Error("echo scored");
  await p.reload();
  if (
    (await p.evaluate(
      () =>
        ear.lesson === "echo" && ear.level === 3 && state.practice === "ear",
    )) !== true
  )
    throw Error("settings");
  await p.locator('[data-act="ear-play"]').tap();
  await p.waitForTimeout(100);
  await p.locator('.dock [data-tab="notes"]').tap();
  if (await p.evaluate(() => ear.playing || engine.nodes.length))
    throw Error("stop on navigation");
  await p.locator('.dock [data-tab="practice"]').tap();
  for (const width of [320, 390, 844]) {
    await p.setViewportSize({ width, height: width === 844 ? 390 : 844 });
    if (
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    )
      throw Error("overflow " + width);
    await p.screenshot({ path: `/tmp/ear-${width}.png` });
  }
  console.log(JSON.stringify({ gen, errors, result: "passed" }));
  await b.close();
  if (errors.length) process.exitCode = 1;
})();
