import { app } from './app.js';
import { env } from './lib/env.js';

const port = env.PORT;

app.listen(port, () => {
  console.log(`[Wayfarer Server] listening on http://localhost:${port}`);
});

