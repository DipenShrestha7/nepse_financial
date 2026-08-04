import dotenv from "dotenv";
import { Sequelize } from "sequelize";

dotenv.config({ path: ".env.local" });
dotenv.config();
const isProduction = process.env.NODE_ENV === "production";

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: isProduction
      ? {
          require: true,
          rejectUnauthorized: false,
        }
      : false,
  },
  logging: false,
});

export default sequelize;
