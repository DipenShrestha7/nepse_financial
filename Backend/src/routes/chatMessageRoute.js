import ChatMessageModel from "../models/ChatMessagesModel.js";
import ChatSessionModel from "../models/ChatSessionsModel.js";
import UsersModel from "../models/UsersModel.js";
import authHook from "../hooks/auth.js";

function ChatMessageRoutes(fastify) {
  fastify.post("/chat", { preHandler: authHook }, async (request, reply) => {
    const userId = Number(request.user?.user_id);
    let { session_id, message } = request.body;

    try {
      if (!Number.isInteger(userId) || userId <= 0) {
        return reply.code(401).send({
          success: false,
          error: "Invalid auth token payload",
          code: "INVALID_AUTH_PAYLOAD",
        });
      }

      const user = await UsersModel.findOne({
        where: { user_id: userId },
      });

      if (!user) {
        return reply.code(401).send({
          success: false,
          error: "User from token no longer exists. Please log in again.",
          code: "TOKEN_USER_NOT_FOUND",
        });
      }

      if (typeof message !== "string" || !message.trim()) {
        return reply.code(400).send({
          success: false,
          error: "Message is required",
        });
      }

      message = message.trim();

      if (session_id) {
        const existingSession = await ChatSessionModel.findOne({
          where: { session_id, user_id: userId },
        });

        if (!existingSession) {
          return reply.code(404).send({
            success: false,
            error: "Session not found for this user",
          });
        }
      }

      if (!session_id) {
        const chatSession = await ChatSessionModel.create({
          user_id: userId,
          title: message.slice(0, 40),
        });

        session_id = chatSession.session_id;
      }

      const messages = await ChatMessageModel.findAll({
        where: { session_id },
        order: [
          ["created_at", "ASC"],
          ["message_id", "ASC"],
        ],
      });

      const history = messages.map((m) => {
        return {
          role: m.sender,
          content: m.message,
        };
      });

      const requestBody = {
        message,
        session_id: String(session_id),
        history,
      };

      await ChatMessageModel.create({
        session_id,
        sender: "user",
        message,
      });

      const aiRes = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!aiRes.ok) {
        throw new Error(`Agent service failed with status ${aiRes.status}`);
      }

      const aiData = await aiRes.json();

      const aiReply =
        typeof aiData?.reply === "string"
          ? aiData.reply
          : "Sorry, I could not generate a response right now.";

      await ChatMessageModel.create({
        session_id,
        sender: "ai",
        message: aiReply,
      });

      return reply.send({
        success: true,
        session_id,
        reply: aiReply,
      });
    } catch (err) {
      if (err?.name === "SequelizeForeignKeyConstraintError") {
        return reply.code(409).send({
          success: false,
          error: "User-session relationship is invalid. Please log in again.",
          code: "FK_USER_SESSION_MISMATCH",
        });
      }

      console.error("Chat Route Error:", err.message);

      return reply.code(500).send({
        success: false,
        error: err.message,
      });
    }
  });

  fastify.get(
    "/sessions/:id/messages",
    { preHandler: authHook },
    async (request, reply) => {
      const userId = request.user.user_id;
      const sessionId = request.params.id;

      try {
        const session = await ChatSessionModel.findOne({
          where: {
            session_id: sessionId,
            user_id: userId,
          },
        });

        if (!session) {
          return reply.code(404).send({
            success: false,
            error: "Session not found",
          });
        }

        const messages = await ChatMessageModel.findAll({
          where: {
            session_id: sessionId,
          },
          order: [
            ["created_at", "ASC"],
            ["message_id", "ASC"],
          ],
        });

        return reply.send(messages);
      } catch (err) {
        console.error("Fetch Session Messages Error:", err.message);
        fastify.log.error(err);

        return reply.code(500).send({
          success: false,
          error: "Failed to fetch chat messages",
        });
      }
    },
  );
}

export default ChatMessageRoutes;
