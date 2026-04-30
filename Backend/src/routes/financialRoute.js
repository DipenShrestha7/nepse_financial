import metricsModel from "../models/metricsModel.js";
import financialModel from "../models/financialModel.js";

function financialRoutes(fastify) {
  fastify.post("/financial", async (request, reply) => {
    try {
      const { company_id, quarter, metric_id, value } = request.body;
    } catch (error) {
      console.error("Error inserting financial data:", error);
      reply.status(500).send({ error: "Failed to insert financial data" });
    }
  });
}

export default financialRoutes;
    