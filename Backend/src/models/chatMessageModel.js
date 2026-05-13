import sequelize from "../config/db.js";
import { DataTypes } from "sequelize";
import chatSessionModel from "./chatSessionModel.js";

const chatMessageModel = sequelize.define(
  "chat_messages",
  {
    message_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    session_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("user", "assistant"),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

chatMessageModel.belongsTo(chatSessionModel, {
  foreignKey: "session_id",
  as: "session",
});

chatSessionModel.hasMany(chatMessageModel, {
  foreignKey: "session_id",
  as: "messages",
});

export default chatMessageModel;
