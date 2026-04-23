'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav, Avatar, PageHeader } from '@/components/ui';
import { useLang } from '@/lib/lang';

type Props = {
  roomId: string;
  players: string[];
  myPlayerIndex: number;
  maxPlayers?: number;
  gameType: string;
  accent?: string;
};

export default function WaitingScreen({
  roomId, players, myPlayerIndex, maxPlayers = 2, gameType, accent = 'var(--accent)',
}: Props) {
  const router = useRouter();
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const isMulti = maxPlayers > 2;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>
      <PageHeader left={<>
        <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: 'var(--text)' }}>
          {t.waitingForOpponentTitle}
        </span>
      </>} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px 100px', gap: 32 }}>

        {/* Room code */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
            {isMulti ? t.shareCodeMulti : t.shareCodeSingle}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 48, fontWeight: 700, letterSpacing: 12,
            color: 'var(--text)', border: '1px solid var(--border)',
            padding: '20px 36px', background: 'var(--card)',
          }}>
            {roomId}
          </div>
        </div>

        {/* Player slots */}
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isMulti ? (
            <>
              {players.map((name, i) => {
                const isMe = i === myPlayerIndex;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isMe ? `${accent}12` : 'transparent', border: `1px solid ${isMe ? accent + '44' : 'var(--border)'}`, padding: '10px 14px' }}>
                    <Avatar name={name} color={isMe ? accent : 'var(--accent)'} size={32} />
                    <div style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                      {name}{isMe ? <span style={{ color: accent, fontSize: 11 }}> {t.youParen}</span> : null}
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-faint)' }}>{t.waitDots}</div>
                  </div>
                );
              })}
              {players.length < maxPlayers && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: '1px dashed var(--border)', padding: '10px 14px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid transparent`, borderTopColor: accent, animation: 'spin 1.2s linear infinite' }} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-faint)' }}>{t.waitingSlots(players.length, maxPlayers)}</div>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              {Array.from({ length: 2 }, (_, i) => {
                const name = players[i];
                const isMe = i === myPlayerIndex;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: name ? `${accent}0d` : 'transparent', border: `1px solid ${name ? accent + '44' : 'var(--border)'}` }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: name ? accent : 'var(--border)' }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: name ? 'var(--text)' : 'var(--text-faint)' }}>
                      {name ?? t.playerN(i + 1)}
                      {isMe && name && <span style={{ color: accent, fontSize: 11 }}> {t.youParen}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pulsing dots */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: accent, animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
          ))}
        </div>

        {/* Copy link */}
        <button
          onClick={copy}
          style={{ padding: '8px 20px', border: `1px solid ${copied ? accent : 'var(--border)'}`, background: 'transparent', color: copied ? accent : 'var(--text-muted)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}
        >
          {copied ? t.linkCopied : t.copyInviteLink}
        </button>
      </div>

      <BottomNav items={[
        { label: t.home,   icon: 'home',   onClick: () => router.push('/') },
        { label: t.lobby,  icon: 'lobby',  onClick: () => router.push(`/lobby?game=${gameType}`) },
        { label: t.scores, icon: 'scores', onClick: () => router.push('/scores') },
        { label: t.shop,   icon: 'shop',   onClick: () => router.push('/shop') },
      ]} />

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.2} 50%{opacity:1} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
