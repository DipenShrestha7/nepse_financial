import loginModel from "../models/loginModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

function loginRoutes(fastify) {
  const getUserIdFromAuthHeader = (authHeader) => {
    if (!authHeader) return null;
    const token = authHeader.split(" ")[1];
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.user_id;
  };

  fastify.post("/users", async (request, reply) => {
    try {
      const { username, email, password } = request.body;
      if (!username || !email || !password) {
        return reply
          .status(400)
          .send({ error: "Username, email and password are required" });
      }

      const user = await loginModel.create({
        username,
        email,
        password_hash: await bcrypt.hash(password, 10),
      });

      return {
        message: "User created successfully",
        user: { user_id: user.id, user_name: user.username },
      };
    } catch (err) {
      console.error("Login Error:", err.message);
      fastify.log.error(err);
      return reply.status(500).send({ error: "Failed to create user" });
    }
  });

  fastify.post("/users/login", async (request, reply) => {
    try {
      const { email, password } = request.body;
      const user = await loginModel.findOne({ where: { email } });

      if (!user) {
        return reply.status(401).send({ error: "Invalid email or password" });
      }
      if (!user.password_hash) {
        return reply.code(401).send({ message: "Invalid email or password" });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return reply.code(401).send({ message: "Invalid email or password" });
      }

      const token = jwt.sign(
        { user_id: user.user_id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );
      return reply.send({ message: "Login successful", token });
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: "Failed to login" });
    }
  });
}
export default loginRoutes;
