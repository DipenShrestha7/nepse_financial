import ChatMessageModel from "../models/ChatMessagesModel.js";
import ChatSessionModel from "../models/ChatSessionsModel.js";
import authHook from "../hooks/auth.js";

function ChatSessionRoutes(fastify) {
  fastify.get("/sessions", { preHandler: authHook }, async (request, reply) => {
    const userId = request.user.user_id;

    try {
      const sessions = await ChatSessionModel.findAll({
        where: {
          user_id: userId,
        },
        order: [["created_at", "DESC"]],
      });

      return reply.send(sessions);
    } catch (err) {
      console.error("Fetch Sessions Error:", err.message);
      fastify.log.error(err);

      return reply.code(500).send({
        success: false,
        error: "Failed to fetch sessions",
      });
    }
  });

  fastify.patch(
    "/sessions/:id",
    { preHandler: authHook },
    async (request, reply) => {
      const userId = request.user.user_id;
      const sessionId = request.params.id;
      const { title } = request.body;

      try {
        if (!title || typeof title !== "string" || !title.trim()) {
          return reply.code(400).send({
            success: false,
            error: "Title is required",
          });
        }

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

        await ChatSessionModel.update(
          {
            title: title.trim(),
          },
          {
            where: {
              session_id: sessionId,
              user_id: userId,
            },
          },
        );

        return reply.send({
          success: true,
          message: "Session title updated",
          title: title.trim(),
        });
      } catch (err) {
        console.error("Update Session Error:", err.message);
        fastify.log.error(err);

        return reply.code(500).send({
          success: false,
          error: "Failed to update session",
        });
      }
    },
  );

  fastify.delete(
    "/sessions/:id",
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

        await ChatMessageModel.destroy({
          where: {
            session_id: sessionId,
          },
        });

        await ChatSessionModel.destroy({
          where: {
            session_id: sessionId,
          },
        });

        return reply.send({
          success: true,
          message: "Session deleted",
        });
      } catch (err) {
        console.error("Delete Session Error:", err.message);
        fastify.log.error(err);

        return reply.code(500).send({
          success: false,
          error: "Failed to delete session",
        });
      }
    },
  );
}

export default ChatSessionRoutes;
