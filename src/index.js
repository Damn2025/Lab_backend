import dotenv from "dotenv";
import { getMysqlPool } from "./services/mysqlService.js";

dotenv.config();

const { default: app } = await import("./app.js");

const port = Number(process.env.PORT) || 4000;

try {
  getMysqlPool();
} catch (error) {
  console.error("MySQL initialization failed at startup:", error);
}

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
