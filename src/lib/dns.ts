import { setServers } from "node:dns/promises";

setServers(["1.1.1.1", "8.8.8.8"]);