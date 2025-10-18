import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/messenger';

// Simple AES-GCM using recipient address derived key
async function deriveKeyFromAddress(address: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  // Hash the address to 256-bit key
  const data = enc.encode(address.toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptWithAddress(address: string, plaintext: string): Promise<string> {
  const key = await deriveKeyFromAddress(address);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  const out = new Uint8Array(iv.byteLength + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), iv.byteLength);
  return btoa(String.fromCharCode(...out));
}

export function MessengerApp() {
  const { address, isConnected, chain } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const canSend = isConnected && !!address && !!to && !!text && !sending && !!CONTRACT_ADDRESS;

  const { data: count, refetch: refetchCount } = useReadContract({
    abi: CONTRACT_ABI as any,
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'getMessageCount',
    args: [address as `0x${string}`],
    query: { enabled: Boolean(address) },
  });

  const messages = [] as Array<{
    from: string;
    timestamp: bigint;
    encryptedContent: string;
    encAddr: string;
  }>;

  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<typeof messages>([]);

  useEffect(() => {
    const load = async () => {
      if (!address || !count) return;
      const provider = new BrowserProvider((await signerPromise)!.provider);
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI as any, provider);
      const c = Number(count as bigint);
      const out: typeof messages = [];
      for (let i = 0; i < c; i++) {
        const [from, ts, encContent, encAddr] = await contract.getMessageAt(address, i);
        out.push({ from, timestamp: ts, encryptedContent: encContent, encAddr });
      }
      setItems(out);
      setLoaded(true);
    };
    load();
  }, [address, count, signerPromise]);

  const onSend = useCallback(async () => {
    if (!address || !instance) return;
    try {
      setSending(true);
      setTxHash(null);
      const signer = await signerPromise!;
      // prepare encrypted address of sender using Zama relayer
      const buffer = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      buffer.addAddress(address);
      const encrypted = await buffer.encrypt();

      const encryptedContent = await encryptWithAddress(to, text);

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI as any, signer);
      const tx = await contract.sendMessage(to, encryptedContent, encrypted.handles[0], encrypted.inputProof);
      const r = await tx.wait();
      setTxHash(tx.hash);
      await refetchCount();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }, [address, instance, signerPromise, to, text, refetchCount]);

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>Zama Encrypted Messenger</h2>
        <ConnectButton />
      </div>

      <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Send Message</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          <label>
            To Address
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x..." style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }} />
          </label>
          <label>
            Text (will be encrypted with recipient address)
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }} />
          </label>
          <button disabled={!canSend} onClick={onSend} style={{ padding: '8px 12px', borderRadius: 6, background: canSend ? '#111827' : '#9ca3af', color: '#fff', border: 'none', cursor: canSend ? 'pointer' : 'default' }}>
            {sending ? 'Sending…' : 'Send'}
          </button>
          {txHash && (
            <div>Sent in tx {txHash}</div>
          )}
        </div>
        {zamaLoading && <div>Initializing encryption…</div>}
        {zamaError && <div style={{ color: 'red' }}>{zamaError}</div>}
      </div>

      <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <h3 style={{ marginTop: 0 }}>Inbox</h3>
        {!isConnected && <div>Connect a wallet on Sepolia to view.</div>}
        {isConnected && (
          <div>
            <div style={{ marginBottom: 8 }}>Total: {String(count || 0n)}</div>
            {!loaded && <div>Loading…</div>}
            {loaded && items.length === 0 && <div>No messages yet.</div>}
            {loaded && items.map((m, idx) => (
              <div key={idx} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 8 }}>
                <div><strong>From:</strong> {m.from}</div>
                <div><strong>Time:</strong> {new Date(Number(m.timestamp) * 1000).toLocaleString()}</div>
                <div><strong>Encrypted Text:</strong> {m.encryptedContent}</div>
                <div><strong>Zama Enc Address:</strong> {m.encAddr as any}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

