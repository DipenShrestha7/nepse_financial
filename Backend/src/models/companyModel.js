import sequelize from "../config/db.js";
import { DataTypes } from "sequelize";

const companyModel = sequelize.define(
  "nepse_companies",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sector: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: false,
  },
);

// Define associations after model is defined
companyModel.associate = (models) => {
  if (models.financial_data) {
    companyModel.hasMany(models.financial_data, {
      foreignKey: "company_id",
      as: "financialData",
    });
  }
};

export default companyModel;
