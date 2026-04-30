import sequelize from "../config/db.js";
import { DataTypes } from "sequelize";

const Metrics = sequelize.define(
  "metrics",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: false,
  },
);

export default Metrics;
