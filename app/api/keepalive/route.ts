/**
 * Keep-alive endpoint for Vercel Cron
 * Prevents cold starts by pinging the serverless function periodically
 */
export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'alive',
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
