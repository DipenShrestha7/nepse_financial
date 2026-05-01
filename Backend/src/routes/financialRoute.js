import metricsModel from "../models/metricsModel.js";
import financialModel from "../models/financialModel.js";
import companyModel from "../models/companyModel.js";

function financialRoutes(fastify) {
  fastify.post("/financial", async (request, reply) => {
    try {
      const rows = request.body;

      if (!Array.isArray(rows)) {
        return reply
          .status(400)
          .send({ error: "Request body must be an array" });
      }

      let processedRows = 0;

      for (const row of rows) {
        const { scrip, quarter, metrics } = row;

        if (!scrip || !metrics) {
          return reply.status(400).send({
            error: "scrip or metrics is required",
          });
        }

        const company = await companyModel.findOne({
          where: { symbol: scrip },
        });

        if (!company) {
          return reply.status(404).send({ error: "Company not found" });
        }

        const companyId = company.id;

        for (const [metricName, value] of Object.entries(metrics)) {
          let metric = await metricsModel.findOne({
            where: { name: metricName },
          });

          if (!metric) {
            metric = await metricsModel.create({ name: metricName });
          }

          const existingRow = await financialModel.findOne({
            where: {
              company_id: companyId,
              quarter,
              metric_id: metric.id,
            },
          });

          if (existingRow) {
            await existingRow.update({
              value,
            });
          } else {
            await financialModel.create({
              company_id: companyId,
              quarter,
              metric_id: metric.id,
              value,
            });
          }

          processedRows += 1;
        }
      }

      return reply.status(200).send({
        message:
          "Financial data inserted successfully for scrip " + rows[0].scrip,
        processedRows,
      });
    } catch (error) {
      console.error("Error inserting financial data:", error);
      reply.status(500).send({ error: "Failed to insert financial data" });
    }
  });

  fastify.get("/financial", async (request, reply) => {
    try {
      const { scrip, quarter } = request.query;

      if (!scrip || !quarter) {
        return reply.status(400).send({
          error: "scrip and quarter query parameters are required",
        });
      }
    } catch (err) {
      console.error("Error fetching financial data:", err);
      reply.status(500).send({ error: "Failed to fetch financial data" });
    }
  });
}

export default financialRoutes;
