export interface IWebhookHandler {
  handleWebhook(payload: any): Promise<void>;
}
