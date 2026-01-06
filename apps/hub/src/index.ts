import { createHubApp } from './app.js'
import { loadHubConfig } from './config.js'

const config = loadHubConfig()
const app = createHubApp(config)

await app.listen({ host: config.host, port: config.port })
