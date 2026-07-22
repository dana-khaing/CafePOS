import 'dotenv/config'

import { createHubApp } from './app.js'
import { loadHubConfig } from './config.js'
import { FileOutboxStore } from './outbox-store.js'

const config = loadHubConfig()
const app = createHubApp(config, new FileOutboxStore(config.outboxPath))

await app.listen({ host: config.host, port: config.port })
