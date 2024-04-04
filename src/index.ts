import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

const app = new OpenAPIHono();

const FailedSchema = z.object({
  success: z.boolean().default(false),
  message: z.string(),
});

const SuccessSchema = z.object({
  success: z.boolean().default(true),
});

const UserSchema = z.object({
  id: z.number().openapi({
    type: "integer",
  }),
  name: z.string(),
});

type User = z.infer<typeof UserSchema>;

let users: User[] = [];

app.openapi(
  createRoute({
    method: "get",
    path: "/",
    responses: {
      200: {
        description: "Get all users",
        content: {
          "application/json": {
            schema: SuccessSchema.merge(
              z.object({
                users: z.array(UserSchema),
              })
            ),
          },
        },
      },
    },
    tags: ["user"],
  }),
  async (c) => {
    return c.json({ success: true, users }, 200);
  }
);

app.openapi(
  createRoute({
    method: "post",
    path: "/",
    description: "Create new user",
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              name: z.string(),
            }),
          },
        },
      },
    },
    responses: {
      400: {
        description: "Name not valid",
        content: {
          "application/json": {
            schema: FailedSchema,
          },
        },
      },
      201: {
        description: "New user created successfully",
        content: {
          "application/json": {
            schema: SuccessSchema.merge(
              z.object({
                user: UserSchema,
              })
            ),
          },
        },
      },
    },
    tags: ["user"],
  }),
  async (c) => {
    const formData = await c.req.formData();

    const name = (formData.get("name") as string) ?? "";

    if (name.length === 0)
      return c.json({ success: false, message: "Invalid name" }, 400);

    const newUser = {
      id: Date.now(),
      name,
    };

    users.push(newUser);

    return c.json({ success: true, user: newUser }, 201);
  }
);

app.openapi(
  createRoute({
    method: "put",
    path: "/{id}",
    description: "Update user",
    request: {
      params: z.object({
        id: z.coerce.number().min(0),
      }),
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              name: z.string(),
            }),
          },
        },
      },
    },
    responses: {
      400: {
        description: "Invalid name",
        content: {
          "application/json": {
            schema: FailedSchema,
          },
        },
      },
      200: {
        description: "User updated successfully",
        content: {
          "application/json": {
            schema: SuccessSchema.merge(
              z.object({
                user: UserSchema,
              })
            ),
          },
        },
      },
    },
    tags: ["user"],
  }),
  async (c) => {
    const { id } = c.req.param();
    const formData = await c.req.formData();

    const name = (formData.get("name") as string) ?? "";
    if (name.length === 0)
      return c.json({ success: false, message: "Invalid name" }, 400);

    const parsedId = parseInt(id);
    users = users.map((user) => {
      if (user.id === parsedId) {
        user.name = name;
      }
      return user;
    });

    return c.json({ success: true, user: { id: parsedId, name } }, 200);
  }
);

app.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    request: {
      params: z.object({
        id: z.coerce.number().min(0),
      }),
    },
    responses: {
      200: {
        description: "User deleted successfully",
      },
    },
    tags: ["user"],
  }),
  async (c) => {
    const { id } = c.req.param();

    const parsedId = parseInt(id);
    users = users.filter((user) => user.id !== parsedId);

    return c.json({}, 200);
  }
);

app.notFound((c) => {
  return c.json({ success: false, message: "Not found" }, 404);
});

const port = 3000;
console.log(`Server is running on port ${port}`);

app.get(
  "/ui",
  swaggerUI({
    url: "/doc",
  })
);

app.doc("/doc", {
  info: {
    title: "Intro to Hono (www.youtube.com/@ryn__bsd)",
    version: "v1",
  },
  openapi: "3.1.0",
});

serve({
  fetch: app.fetch,
  port,
});
