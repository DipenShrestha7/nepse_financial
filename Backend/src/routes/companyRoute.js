import companyModel from "../models/companyModel.js";

function companyRoutes(fastify) {
  fastify.get("/companies", async (request, reply) => {
    try {
      const companies = await companyModel.findAll();
      reply.send(companies);
    } catch (error) {
      reply.status(500).send({ error: "Failed to fetch companies" });
    }
  });

  fastify.post("/companies", async (request, reply) => {
    try {
      const companies = request.body;
      const newCompany = await companyModel.bulkCreate(companies);
      reply.status(201).send(newCompany);
    } catch (error) {
      reply.status(500).send({ error: "Failed to create company" });
    }
  });
}

export default companyRoutes;
