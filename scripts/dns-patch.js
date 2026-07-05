// Preload script: set DNS servers before any module loads
const dns = require("dns");
try { dns.setServers(["8.8.8.8", "8.8.4.4"]); } catch {}
