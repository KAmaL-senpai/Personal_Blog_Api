import jwt from "jsonwebtoken";
import fp from "fastify-plugin";

async function authPlugin(fastify, options) {
  fastify.decorate("authenticate", async (req, res) => {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res
          .code(401)
          .send({ success: false, message: "No Token Provided" });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      return res.code(401).send({ success: false, message: "Unauthorized" });
    }
  });
}

export default fp(authPlugin);
