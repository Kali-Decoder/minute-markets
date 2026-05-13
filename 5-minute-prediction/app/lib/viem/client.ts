import { createPublicClient, http } from 'viem';
import { somniaTestnet } from '@/app/config/chains';

export const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(process.env.NEXT_PUBLIC_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network/'),
});

