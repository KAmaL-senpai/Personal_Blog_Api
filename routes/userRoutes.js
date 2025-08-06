import {
  Signup,
  Login,
  Logout,
  Profile,
  ProfileUpdate,
  PasswordUpdate,
} from "../controllers/userControllers.js";

export default async function userRoutes(fastify, options) {
  const SignupRoute = {
    schema: {
      body: {
        type: "object",
        required: ["email", "username", "password"],
        properties: {
          email: { type: "string", format: "email" },
          username: { type: "string", minLength: 3 },
          password: { type: "string", minLength: 6 },
        },
      },
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
      },
    },
    handler: Signup,
  };
  const LoginRoute = {
    schema: {
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
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
    handler: Login,
  };
  const LogoutRoute = {
    schema: {
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
    handler: Logout,
  };

  const ProfileRoute = {
    schema: {
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            user: {
              type: "object",
              properties: {
                id: { type: "number" },
                email: { type: "string" },
                username: { type: "string" },
              },
            },
          },
        },
      },
    },
    preHandler: async function (req, res) {
      await this.authenticate(req, res);
    },
    handler: Profile,
  };

  const ProfileUpdateRoute = {
    schema: {
      body: {
        type: "object",
        required: ["email", "username"],
        properties: {
          email: { type: "string", format: "email" },
          username: { type: "string", minLength: 3 },
        },
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
    handler: ProfileUpdate,
  };

  const PasswordUpdateRoute = {
    schema: {
      body: {
        type: "object",
        required: ["currPassword", "newPassword"],
        properties: {
          currPassword: { type: "string", minLength: 6 },
          newPassword: { type: "string", minLength: 6 },
        },
      },
      response: {
        201: {
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
    handler: PasswordUpdate,
  };

  fastify.post("/signup", SignupRoute);
  fastify.post("/login", LoginRoute);
  fastify.get("/logout", LogoutRoute);
  fastify.get("/profile", ProfileRoute);
  fastify.put("/profile/update", ProfileUpdateRoute);
  fastify.put("/profile/password_update", PasswordUpdateRoute);
}
