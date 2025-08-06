import {
  CreateArticle,
  ReadAllArticle,
  ReadOneArticle,
  UpdateArticle,
  DeleteArticle,
} from "../controllers/articleControllers.js";
export default async function articleRoutes(fastify, options) {
  const AddArticleRoute = {
    schema: {
      body: {
        type: "object",
        required: ["title", "content"],
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          tagIds: {
            type: "array",
            items: { type: "integer" },
            minItems: 1,
            maxItems: 3,
          },
        },
      },
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            articleId: { type: "string" },
          },
        },
      },
    },
    preHandler: async function (req, res) {
      await this.authenticate(req, res); // this sets req.user
    },
    handler: CreateArticle,
  };

  const GetAllArticleRoute = {
    schema: {
      querystring: {
        type: "object",
        properties: {
          startDate: { type: "string", format: "date" },
          endDate: { type: "string", format: "date" },
          tags: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  author: { type: "string" },
                  content: { type: "string" },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                  },
                  date_published: { type: "string", format: "date-time" },
                  last_updated: { type: "string", format: "date-time" },
                },
                required: [
                  "id",
                  "title",
                  "author",
                  "content",
                  "date_published",
                  "tags",
                ],
              },
            },
          },
          required: ["success", "message", "data"],
        },
      },
    },
    preHandler: async function (req, res) {
      await this.authenticate(req, res);
    },
    handler: ReadAllArticle,
  };

  const ReadOneArticleRoute = {
    schema: {
      params: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            data: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                author: { type: "string" },
                content: { type: "string" },
                tags: {
                  type: "array",
                  items: { type: "string" },
                },
                date_published: { type: "string", format: "date-time" },
                last_updated: { type: "string", format: "date-time" },
              },
              required: [
                "id",
                "title",
                "author",
                "content",
                "date_published",
                "tags",
              ],
            },
          },
        },
      },
    },
    preHandler: async function (req, res) {
      await this.authenticate(req, res);
    },
    handler: ReadOneArticle,
  };

  const UpdateArticleRoute = {
    schema: {
      params: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      },
      body: {
        type: "object",
        properties: {
          title: { type: "string" },
          author: { type: "string" },
          content: { type: "string" },
          tagIds: {
            type: "array",
            items: { type: "integer" },
            maxItems: 3,
          },
        },
        additionalProperties: false,
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
      },
    },
    preHandler: async function (req, res) {
      await this.authenticate(req, res);
    },
    handler: UpdateArticle,
  };

  const DeleteArticleRoute = {
    schema: {
      params: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
      },
    },
    preHandler: async function (req, res) {
      await this.authenticate(req, res); // ensure req.user is available
    },
    handler: DeleteArticle,
  };

  fastify.post("/add", AddArticleRoute);
  fastify.get("/all", GetAllArticleRoute);
  fastify.get("/:id", ReadOneArticleRoute);
  fastify.patch("/:id", UpdateArticleRoute);
  fastify.delete("/:id", DeleteArticleRoute);
}
