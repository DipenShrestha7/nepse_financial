import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import UsersModel from "../models/UsersModel.js";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string" || !storedHash.includes(":")) {
    return false;
  }

  const [salt, key] = storedHash.split(":");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const expectedKey = Buffer.from(key, "hex");

  if (expectedKey.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedKey, derivedKey);
}

function buildUserPayload(user) {
  return {
    user_id: user.user_id,
    user_name: user.user_name,
    email: user.email,
    created_at: user.created_at,
  };
}

function signUserToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("Missing JWT_SECRET environment variable");
  }

  return jwt.sign(
    {
      user_id: user.user_id,
      user_name: user.user_name,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function usersRoutes(fastify) {
  fastify.get("/users", async (request, reply) => {
    try {
      const users = await UsersModel.findAll({
        attributes: ["user_id", "user_name", "email", "created_at"],
        order: [["user_id", "ASC"]],
      });

      return reply.send(users);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to fetch users",
      });
    }
  });

  fastify.get("/users/:id", async (request, reply) => {
    try {
      const userId = Number(request.params.id);

      if (!Number.isInteger(userId) || userId <= 0) {
        return reply.code(400).send({
          success: false,
          error: "Invalid user id",
        });
      }

      const user = await UsersModel.findByPk(userId, {
        attributes: ["user_id", "user_name", "email", "created_at"],
      });

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: "User not found",
        });
      }

      return reply.send(user);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to fetch user",
      });
    }
  });

  fastify.post("/users", async (request, reply) => {
    try {
      const { user_name, email, password } = request.body || {};

      if (typeof user_name !== "string" || !user_name.trim()) {
        return reply.code(400).send({
          success: false,
          error: "User name is required",
        });
      }

      if (typeof email !== "string" || !email.trim()) {
        return reply.code(400).send({
          success: false,
          error: "Email is required",
        });
      }

      if (typeof password !== "string" || password.length < 6) {
        return reply.code(400).send({
          success: false,
          error: "Password must be at least 6 characters",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await UsersModel.findOne({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        return reply.code(409).send({
          success: false,
          error: "A user with this email already exists",
        });
      }

      const createdUser = await UsersModel.create({
        user_name: user_name.trim(),
        email: normalizedEmail,
        password_hash: hashPassword(password),
      });

      const token = signUserToken(createdUser);

      return reply.code(201).send({
        success: true,
        user: buildUserPayload(createdUser),
        token,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to create user",
      });
    }
  });

  fastify.post("/users/login", async (request, reply) => {
    try {
      const { user_id, email, password } = request.body || {};

      if (typeof password !== "string" || !password) {
        return reply.code(400).send({
          success: false,
          error: "Password is required",
        });
      }

      let user = null;

      if (user_id !== undefined && user_id !== null && user_id !== "") {
        const parsedUserId = Number(user_id);
        if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
          return reply.code(400).send({
            success: false,
            error: "Invalid user id",
          });
        }

        user = await UsersModel.findByPk(parsedUserId);
      } else if (typeof email === "string" && email.trim()) {
        user = await UsersModel.findOne({
          where: { email: email.trim().toLowerCase() },
        });
      } else {
        return reply.code(400).send({
          success: false,
          error: "User id or email is required",
        });
      }

      if (!user || !verifyPassword(password, user.password_hash)) {
        return reply.code(401).send({
          success: false,
          error: "Invalid user id or password",
        });
      }

      const token = signUserToken(user);

      return reply.send({
        success: true,
        user: buildUserPayload(user),
        token,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to login user",
      });
    }
  });
}

export default usersRoutes;
