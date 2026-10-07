export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export abstract class MailProvider {
  abstract send(message: MailMessage): Promise<void>;
}
