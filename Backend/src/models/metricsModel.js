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

// Define associations after model is defined
Metrics.associate = (models) => {
  if (models.financial_data) {
    Metrics.hasMany(models.financial_data, {
      foreignKey: "metric_id",
      as: "financialData",
    });
  }
};

export default Metrics;
