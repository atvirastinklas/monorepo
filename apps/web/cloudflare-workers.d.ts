declare module "cloudflare:workers" {
  export abstract class DurableObject<Env = unknown> {
    constructor(state: DurableObjectState, env: Env);
  }
}
