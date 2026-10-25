const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"));
const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
});
server.listen(0, "127.0.0.1", async () => {
  const env = {
    ...process.env,
    BASE_URL: `http://127.0.0.1:${server.address().port}`,
  };
  try {
    for (const name of [
      "ear-regression.cjs",
      "audio-coach.cjs",
      "phrase-repeat.cjs",
    ]) {
      await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [path.join(__dirname, name)], {
          env,
          stdio: "inherit",
        });
        child.on("error", reject);
        child.on("exit", (code) =>
          code === 0 ? resolve() : reject(new Error(`${name}: exit ${code}`)),
        );
      });
    }
    console.log("All learning upgrade checks passed.");
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
