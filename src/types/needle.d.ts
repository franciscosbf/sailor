declare module "needle" {
  export interface Response {
    body: any;
  }

  export default async function needle(
    method: "get",
    url: string,
  ): Promise<Response>;
}
