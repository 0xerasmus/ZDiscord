import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { useCallback, useEffect, useState } from 'react';
import { Contract } from 'ethers';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/messenger';
import '../styles/MessengerApp.css';

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

function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return `0x${hex}`;
}

function formatEncryptedPreview(payload: string | Uint8Array): string {
  const text = payload instanceof Uint8Array ? toHex(payload) : payload;
  return text.length > 64 ? `${text.slice(0, 60)}...` : text;
}

function normalizeEncryptedPayload(payload: string | Uint8Array): Uint8Array {
  if (payload instanceof Uint8Array) {
    return payload;
  }

  const trimmed = payload.trim();
  if (trimmed.startsWith('0x') && trimmed.length >= 4) {
    const hex = trimmed.slice(2);
    if (hex.length % 2 !== 0) {
      throw new Error('Invalid hex payload');
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  const cleaned = trimmed.replace(/\s+/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function decryptWithAddress(address: string, encoded: string | Uint8Array): Promise<string> {
  const key = await deriveKeyFromAddress(address);
  const bytes = normalizeEncryptedPayload(encoded);
  if (bytes.length < 13) {
    throw new Error('Invalid encrypted payload length');
  }
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

type MessageItem = {
  from: string;
  timestamp: bigint;
  encryptedContent: string | Uint8Array;
  encAddr: string;
  decryptedText?: string;
  decryptedAddress?: string;
  decrypting?: boolean;
  error?: string;
};

export function MessengerApp() {
  const { address, isConnected } = useAccount();
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

  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<MessageItem[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!address || !count) return;
      const signer = await signerPromise;
      if (!signer || !signer.provider) return;
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI as any, signer.provider);
      const c = Number(count as bigint);
      const out: MessageItem[] = [];
      for (let i = 0; i < c; i++) {
        const [from, ts, encContent, encAddr] = await contract.getMessageAt(address, i);
        out.push({
          from,
          timestamp: ts,
          encryptedContent: encContent,
          encAddr: typeof encAddr === 'string' ? encAddr : String(encAddr),
        });
        console.log('Loaded message', {
          index: i,
          from,
          timestamp: Number(ts),
          encAddr,
          encryptedContent: encContent,
        });
      }
      setItems(out);
      setLoaded(true);
    };
    load();
  }, [address, count, signerPromise]);

  const handleDecrypt = useCallback(
    async (index: number) => {
      if (!address || !instance) return;

      const current = items[index];
      if (!current || current.decrypting) {
        console.log('Decrypt skipped: invalid state', { index, current });
        return;
      }

      const encryptedContent = current.encryptedContent;
      const encryptedAddressHandle = current.encAddr as string;

      console.log('Decrypt start', {
        index,
        from: current.from,
        encryptedContent: encryptedContent instanceof Uint8Array
          ? toHex(encryptedContent)
          : encryptedContent,
        encAddr: encryptedAddressHandle,
      });

      setItems((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], decrypting: true, error: undefined };
        return next;
      });

      try {
        const signer = await signerPromise;
        if (!signer) {
          throw new Error('Wallet signer unavailable.');
        }

        const plaintext = await decryptWithAddress(address, encryptedContent);

        let decryptedAddress: string | undefined;
        let decryptError: string | undefined;

        try {
          const keypair = instance.generateKeypair();
          const startTimestamp = Math.floor(Date.now() / 1000).toString();
          const durationDays = '7';
          const contractAddresses = [CONTRACT_ADDRESS];
          const handleContractPairs = [
            {
              handle: encryptedAddressHandle,
              contractAddress: CONTRACT_ADDRESS,
            },
          ];

          const eip712 = instance.createEIP712(
            keypair.publicKey,
            contractAddresses,
            startTimestamp,
            durationDays
          );

          const signature = await signer.signTypedData(
            eip712.domain,
            { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
            eip712.message
          );

          const decryption = await instance.userDecrypt(
            handleContractPairs,
            keypair.privateKey,
            keypair.publicKey,
            signature.replace(/^0x/, ''),
            contractAddresses,
            signer.address,
            startTimestamp,
            durationDays
          );

          const rawAddress =
            decryption[encryptedAddressHandle] ??
            decryption[encryptedAddressHandle.replace(/^0x/, '')];
          if (typeof rawAddress === 'string') {
            decryptedAddress = rawAddress;
          } else if (typeof rawAddress === 'bigint') {
            decryptedAddress = `0x${rawAddress.toString(16)}`;
          }
        } catch (zamaError) {
          console.error('Zama decryption failed', zamaError);
          decryptError = zamaError instanceof Error ? zamaError.message : 'Failed to decrypt Zama address.';
        }

        console.log('Decrypt success', { index, plaintext, decryptedAddress });

        setItems((prev) => {
          if (!prev[index]) return prev;
          const next = [...prev];
          next[index] = {
            ...next[index],
            decrypting: false,
            decryptedText: plaintext,
            decryptedAddress: decryptedAddress || next[index].decryptedAddress,
            error: decryptError,
          };
          return next;
        });
      } catch (err) {
        console.error(err);
        console.log('Decrypt failed', { index, error: err });
        const message = err instanceof Error ? err.message : 'Unable to decrypt message.';
        setItems((prev) => {
          if (!prev[index]) return prev;
          const next = [...prev];
          next[index] = { ...next[index], decrypting: false, error: message };
          return next;
        });
      }
    },
    [address, instance, signerPromise, items]
  );

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
      await tx.wait();
      setTxHash(tx.hash);
      await refetchCount();

      // Clear form after successful send
      setText('');
      setTo('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }, [address, instance, signerPromise, to, text, refetchCount]);

  return (
    <div className="messenger-container">
      {/* Header */}
      <header className="messenger-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="12" fill="url(#gradient1)"/>
                <path d="M20 10L25 15L20 20L15 15L20 10Z" fill="white" fillOpacity="0.9"/>
                <path d="M20 20L25 25L20 30L15 25L20 20Z" fill="white" fillOpacity="0.7"/>
                <defs>
                  <linearGradient id="gradient1" x1="0" y1="0" x2="40" y2="40">
                    <stop stopColor="#6366f1"/>
                    <stop offset="1" stopColor="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1 className="app-title">ZamaDiscord</h1>
              <p className="app-subtitle">Private Messaging on Ethereum</p>
            </div>
          </div>
          <div className="connect-button-wrapper">
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="messenger-main">
        {/* Send Message Card */}
        <div className="card send-card">
          <div className="card-header">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="card-title">Send Encrypted Message</h2>
          </div>

          {!isConnected ? (
            <div className="empty-state">
              <div className="empty-icon">🔐</div>
              <p className="empty-text">Connect your wallet to start messaging</p>
            </div>
          ) : (
            <div className="send-form">
              <div className="form-group">
                <label className="form-label">
                  <span>Recipient Address</span>
                  <span className="label-badge">Required</span>
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
                    className="form-input"
                  />
                  <div className="input-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>Message</span>
                  <span className="label-info">End-to-end encrypted</span>
                </label>
                <div className="textarea-wrapper">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type your secret message here..."
                    className="form-textarea"
                    rows={4}
                  />
                  <div className="textarea-footer">
                    <span className="character-count">{text.length} characters</span>
                  </div>
                </div>
              </div>

              <button
                disabled={!canSend}
                onClick={onSend}
                className={`send-button ${!canSend ? 'disabled' : ''}`}
              >
                {sending ? (
                  <>
                    <span className="spinner"></span>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Send Message</span>
                  </>
                )}
              </button>

              {txHash && (
                <div className="success-banner">
                  <div className="success-icon">✓</div>
                  <div className="success-content">
                    <p className="success-title">Message sent successfully!</p>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-link"
                    >
                      View transaction →
                    </a>
                  </div>
                </div>
              )}

              {zamaLoading && (
                <div className="info-banner">
                  <span className="spinner-small"></span>
                  <span>Initializing encryption system...</span>
                </div>
              )}

              {zamaError && (
                <div className="error-banner">
                  <span>⚠️</span>
                  <span>{zamaError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Inbox Card */}
        <div className="card inbox-card">
          <div className="card-header">
            <div className="card-icon inbox-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 12H16L14 15H10L8 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5.45 5.11L2 12V18C2 18.5304 2.21071 19.0391 2.58579 19.4142C2.96086 19.7893 3.46957 20 4 20H20C20.5304 20 21.0391 19.7893 21.4142 19.4142C21.7893 19.0391 22 18.5304 22 18V12L18.55 5.11C18.3844 4.77679 18.1292 4.49637 17.813 4.30028C17.4967 4.10419 17.1321 4.0002 16.76 4H7.24C6.86792 4.0002 6.50326 4.10419 6.18704 4.30028C5.87083 4.49637 5.61558 4.77679 5.45 5.11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="inbox-header-content">
              <h2 className="card-title">Inbox</h2>
              {isConnected && (
                <span className="message-badge">{String(count || 0n)} messages</span>
              )}
            </div>
          </div>

          {!isConnected ? (
            <div className="empty-state">
              <div className="empty-icon">📬</div>
              <p className="empty-text">Connect your wallet to view messages</p>
              <p className="empty-subtext">Your encrypted messages are stored on Sepolia testnet</p>
            </div>
          ) : (
            <div className="inbox-content">
              {!loaded ? (
                <div className="loading-state">
                  <span className="spinner-large"></span>
                  <p>Loading messages...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <p className="empty-text">No messages yet</p>
                  <p className="empty-subtext">You'll see encrypted messages here when someone sends you one</p>
                </div>
              ) : (
                <div className="messages-list">
                  {items.map((m, idx) => (
                    <div key={idx} className="message-item">
                      <div className="message-header">
                        <div className="message-avatar">
                          {m.from.slice(2, 4).toUpperCase()}
                        </div>
                        <div className="message-info">
                          <div className="message-from">
                            <span className="from-label">From:</span>
                            <code className="address-code">{m.from.slice(0, 6)}...{m.from.slice(-4)}</code>
                          </div>
                          <div className="message-time">
                            {new Date(Number(m.timestamp) * 1000).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="message-body">
                        {m.decryptedText !== undefined ? (
                          <div className="decrypted-message">
                            <div className="decrypted-header">
                              <span className="decrypted-icon">🔓</span>
                              <span className="decrypted-label">Decrypted Message</span>
                            </div>
                            <div className="decrypted-text">{m.decryptedText}</div>
                            {m.decryptedAddress && (
                              <div className="decrypted-address">
                                <span className="field-label">Zama Address:</span>
                                <code className="address-code">{m.decryptedAddress}</code>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="message-field">
                              <span className="field-label">Encrypted Content:</span>
                              <div className="encrypted-content">
                                {formatEncryptedPreview(m.encryptedContent)}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDecrypt(idx)}
                              disabled={m.decrypting}
                              className={`decrypt-button ${m.decrypting ? 'decrypting' : ''}`}
                            >
                              {m.decrypting ? (
                                <>
                                  <span className="spinner-small"></span>
                                  <span>Decrypting...</span>
                                </>
                              ) : (
                                <>
                                  <span>🔐</span>
                                  <span>Decrypt Message</span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                        {m.error && (
                          <div className="decrypt-error">
                            <span>⚠️</span>
                            <span>{m.error}</span>
                          </div>
                        )}
                        <div className="message-field">
                          <span className="field-label">FHE Sender Address:</span>
                          <div className="encrypted-content fhe-address">
                            {String(m.encAddr).slice(0, 40)}...
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="messenger-footer">
        <p>
          Powered by <strong>Zama FHEVM</strong> • Deployed on <strong>Sepolia</strong>
        </p>
        <p className="footer-links">
          <a href="https://docs.zama.ai/fhevm" target="_blank" rel="noopener noreferrer">Documentation</a>
          <span>•</span>
          <a href="https://github.com/zama-ai/fhevm" target="_blank" rel="noopener noreferrer">GitHub</a>
        </p>
      </footer>
    </div>
  );
}
