export interface ILinkGenerator {
  generate(subdomain: string): {
    token: string;
    link: string;
    expiresAt: Date;
  };
}
