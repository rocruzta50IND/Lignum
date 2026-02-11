import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }
}

declare module "fastify" {
  export interface FastifyInstance {
    authenticate: any;
  }
}