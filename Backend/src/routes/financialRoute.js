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
      const { scrip } = request.query;

      if (!scrip) {
        return reply.status(400).send({
          error: "scrip query parameter is required",
        });
      }

      // Find the company by scrip/symbol
      const company = await companyModel.findOne({
        where: { symbol: scrip },
      });

      if (!company) {
        return reply.status(404).send({ error: "Company not found" });
      }

      // Fetch financial records with metric information
      const financialData = await financialModel.findAll({
        where: { company_id: company.id },
        include: [
          {
            model: metricsModel,
            as: "metric",
            attributes: ["name"],
          },
        ],
      });

      if (financialData.length === 0) {
        return reply.status(200).send([]);
      }

      // Transform the data to match frontend expectations
      const formattedData = financialData.map((record) => ({
        quarter: record.quarter,
        metricName: record.metric?.name || "Unknown",
        value: record.value,
      }));

      return reply.status(200).send(formattedData);
    } catch (err) {
      console.error("Error fetching financial data:", err);
      reply.status(500).send({ error: "Failed to fetch financial data" });
    }
  });
}

export default financialRoutes;
