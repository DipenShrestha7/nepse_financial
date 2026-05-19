// hooks/auth.js
import jwt from "jsonwebtoken";

const authHook = async (request, reply) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    request.user = decoded; // same idea — attach to request
  } catch (err) {
    return reply.status(401).send({ error: "Invalid token" });
  }
  // no next() in Fastify — just don't send a reply and it moves on
};

export default authHook;
