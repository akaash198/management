declare module "qrcode" {
  export function toDataURL(text: string, options?: any): Promise<string>;

  const QRCode: {
    toDataURL: typeof toDataURL;
  };

  export default QRCode;
}
