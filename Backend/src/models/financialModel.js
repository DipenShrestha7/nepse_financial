import sequelize from "../config/db.js";
import { DataTypes } from "sequelize";
import companyModel from "./companyModel.js";
import metricsModel from "./metricsModel.js";

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
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  { timestamps: false },
);

// Define associations
financialModel.belongsTo(companyModel, {
  foreignKey: "company_id",
  as: "company",
});

financialModel.belongsTo(metricsModel, {
  foreignKey: "metric_id",
  as: "metric",
});

export default financialModel;
