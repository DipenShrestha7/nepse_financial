import sequelize from "../config/db.js";
import { DataTypes } from "sequelize";

const financialModel = sequelize.define(
  "financial_data",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quarter: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metric_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  },
  { timestamps: false },
);

export default financialModel;
