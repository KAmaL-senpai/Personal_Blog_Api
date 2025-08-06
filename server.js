import { configDotenv } from "dotenv";
configDotenv();
import Fastify from "fastify";
import fastifyMySQL from "@fastify/mysql";
import userRoutes from "./routes/userRoutes.js";
import articleRoutes from "./routes/articleRoutes.js";
import fastifyCookie from "@fastify/cookie";
import authPlugin from "./middlewares/AuthMiddleware.js";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

const PORT = process.env.PORT || 5000;

const fastify = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "SYS:Standard", // Format timestamp
        ignore: "pid,hostname", // Ignore specific fields
      },
    },
  },
});

fastify.register(fastifySwagger, {
  swagger: {
    info: {
      title: "Personal Blog API",
      description: "REST API for managing blog articles",
      version: "1.0.0",
    },
    consumes: ["application/json"],
    produces: ["application/json"],
  },
});

fastify.register(fastifySwaggerUi, {
  routePrefix: "/docs",
  swagger: {
    info: {
      title: "Personal Blod API",
      version: "1.0.0",
    },
  },
});

fastify.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET, // for signed cookies
});
fastify.register(authPlugin);

fastify.register(fastifyMySQL, {
  promise: true,
  connectionString: process.env.MYSQL_URL,
});

fastify.register(userRoutes, { prefix: "/api/user" });
fastify.register(articleRoutes, { prefix: "/api/article" });

fastify.after(async (err) => {
  if (err) throw err;
  try {
    const [rows] = await fastify.mysql.query("SELECT 1");
    console.log("Connected to db");
  } catch (error) {
    console.log("Error Connecting to DB", error.message);
  }
});

fastify.get("/", (req, res) => {
  res.send("Working");
});

fastify.listen({ port: Number(PORT), host: "0.0.0.0" }, (err, address) => {
  if (err) throw err;
  console.log(`Server listening at ${address}`);
});