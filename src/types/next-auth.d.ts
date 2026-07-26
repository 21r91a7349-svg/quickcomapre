declare module "next-auth" {
  export interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    };
  }

  export interface User {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  }

  export default function NextAuth(config: any): any;
}

declare module "next-auth/providers/google" {
  export default function Google(options: any): any;
}
