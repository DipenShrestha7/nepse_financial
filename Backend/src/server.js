import sequelize from "./config/db.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import companyRoutes from "./routes/companyRoute.js";
import financialRoutes from "./routes/financialRoute.js";
import usersRoutes from "./routes/usersRoute.js";
import chatSessionRoutes from "./routes/chatSessionRoute.js";
import chatMessageRoutes from "./routes/chatMessageRoute.js";
import "dotenv/config";

const fastify = Fastify({
  logger: true,
});

const allowedOrigins = [process.env.FRONTEND_URL];

fastify.register(cors, {
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
});

const start = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    fastify.register(companyRoutes);
    fastify.register(financialRoutes);
    fastify.register(usersRoutes);
    fastify.register(chatSessionRoutes);
    fastify.register(chatMessageRoutes);
    const port = Number(process.env.PORT);
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log("Server is running on port " + port);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};
fastify.get("/", async () => {
  return {
    status: "ok",
    message: "Backend is running",
  };
});
start();
