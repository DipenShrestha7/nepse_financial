import sequelize from "./config/db.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import companyRoutes from "./routes/companyRoute.js";
import financialRoutes from "./routes/financialRoute.js";
import "dotenv/config";

const fastify = Fastify({
  logger: true,
});

const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];

fastify.register(cors, {
  methods: ["GET", "POST", "PUT", "DELETE"],
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
    await fastify.listen({ port: process.env.PORT || 8000 });
    console.log("Server is running on port " + (process.env.PORT || 8000));
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
