'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setStatus('sending');
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setStatus('sent');
      setForm({ name: '', email: '', message: '' });
    } else {
      setStatus('error');
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-4 md:py-5 border-t-2 border-[#3f4cf6]">
        <div className="pointer-events-auto">
          <Link href="/">
            <Image src="/logo.png" alt="Mediagenic Logo" width={220} height={70} className="object-contain w-[130px] md:w-[220px] h-auto" />
          </Link>
        </div>
        <div className="flex items-center gap-4 md:gap-8 font-mono uppercase font-semibold tracking-widest">
          <Link href="/work" className="text-white/70 hover:text-white text-xs md:text-sm min-h-[44px] flex items-center relative group transition-colors duration-200">
            Work
            <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#3f4cf6] group-hover:w-full transition-all duration-300" />
          </Link>
          <Link href="/contact" className="text-white text-xs md:text-sm min-h-[44px] flex items-center relative">
            Contact
            <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-[#3f4cf6]" />
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-24">
        <div className="w-full max-w-lg">

          <p className="font-mono uppercase text-[11px] tracking-widest text-[#3f4cf6] mb-4">Get in Touch</p>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight mb-12">
            Let&apos;s make<br /><span className="italic">something.</span>
          </h1>

          {status === 'sent' ? (
            <div className="border border-[#3f4cf6]/40 px-8 py-10 text-center">
              <p className="font-mono uppercase text-[11px] tracking-widest text-[#3f4cf6] mb-2">Message Sent</p>
              <p className="text-white/60 text-sm">We&apos;ll be in touch soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

              <div className="flex flex-col gap-2">
                <label className="font-mono uppercase text-[10px] tracking-widest text-white/40">
                  Name <span className="text-[#3f4cf6]">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Your name"
                  className="bg-white/[0.04] border border-white/10 focus:border-[#3f4cf6]/60 outline-none px-4 py-3 text-sm text-white placeholder:text-white/20 transition-colors duration-200 font-mono"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-mono uppercase text-[10px] tracking-widest text-white/40">
                  Email <span className="text-[#3f4cf6]">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="your@email.com"
                  className="bg-white/[0.04] border border-white/10 focus:border-[#3f4cf6]/60 outline-none px-4 py-3 text-sm text-white placeholder:text-white/20 transition-colors duration-200 font-mono"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-mono uppercase text-[10px] tracking-widest text-white/40">
                  Message <span className="text-[#3f4cf6]">*</span>
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder="Tell us about your project..."
                  className="bg-white/[0.04] border border-white/10 focus:border-[#3f4cf6]/60 outline-none px-4 py-3 text-sm text-white placeholder:text-white/20 transition-colors duration-200 font-mono resize-none"
                />
              </div>

              {status === 'error' && (
                <p className="font-mono text-[10px] uppercase tracking-widest text-red-400">
                  Something went wrong. Please try again.
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="mt-2 px-8 py-4 bg-[#3f4cf6] text-white font-mono uppercase text-xs tracking-widest hover:bg-[#5562f8] disabled:opacity-50 transition-colors duration-200 self-start"
              >
                {status === 'sending' ? 'Sending...' : 'Send Message'}
              </button>

            </form>
          )}
        </div>
      </div>
    </main>
  );
}
