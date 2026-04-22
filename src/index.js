import dotenv from "dotenv";

dotenv.config();

const { default: app } = await import("./app.js");

const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
