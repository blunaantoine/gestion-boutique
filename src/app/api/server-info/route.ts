import { NextResponse } from 'next/server';
import os from 'os';

// GET - Server information (IP addresses, etc.)
export async function GET() {
  try {
    const interfaces = os.networkInterfaces();
    const addresses: { name: string; address: string; family: string }[] = [];

    for (const [name, nets] of Object.entries(interfaces)) {
      if (!nets) continue;
      
      for (const net of nets) {
        // Skip internal and IPv6 addresses
        if (!net.internal && net.family === 'IPv4') {
          addresses.push({
            name,
            address: net.address,
            family: net.family,
          });
        }
      }
    }

    return NextResponse.json({
      addresses,
      hostname: os.hostname(),
      port: 3000,
    });
  } catch (error) {
    console.error('Get server info error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des informations serveur' },
      { status: 500 }
    );
  }
}
