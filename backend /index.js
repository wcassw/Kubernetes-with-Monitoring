const express = require("express");
const client = require("prom-client");

const app = express();
const PORT = 3000;

/* -----------------------------
   Prometheus setup
------------------------------*/

// Collect default Node.js & process metrics
client.collectDefaultMetrics({ prefix: "backend_" }); // optional: prefix metrics to avoid conflicts

// Custom HTTP request duration metric
const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5],
});

// Middleware to track request duration
app.use((req, res, next) => {
  const end = httpRequestDurationSeconds.startTimer();

  res.on("finish", () => {
    end({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });
  });

  next();
});

/* -----------------------------
   App routes
------------------------------*/

app.get("/health", (req, res) => {
  res.send("Backend is healthy");
});

// Prometheus metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

/* -----------------------------
   Add a "metrics" label for Kubernetes
   Optional: helps ServiceMonitor find it
------------------------------*/
app.locals.appName = "backend"; // matches ServiceMonitor selector label

/* -----------------------------
   Start server
------------------------------*/
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
