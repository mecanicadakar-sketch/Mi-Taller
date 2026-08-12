export default function handler(req: any, res: any) {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
}
