import { useState, useRef, useEffect } from "react";
import Header from "../../components/Header";
import { FiMessageSquare, FiSend } from "react-icons/fi";

type Message = {
  id: number;
  text: string;
  from: "user" | "bot";
};

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm Mero Market assistant. Ask me about a company.",
      from: "bot",
    },
  ]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now(),
      text: input.trim(),
      from: "user",
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    // Simple placeholder bot response (frontend-only)
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          text: `You asked: "${userMsg.text}". This is a demo reply.`,
          from: "bot",
        },
      ]);
    }, 600);
  };

  return (
    <main className="market-page">
      <div className="market-shell">
        <Header />

        <header className="panel page-hero flex flex-wrap items-start justify-between gap-4 px-5 py-5 max-[560px]:px-3.5 max-[560px]:py-3.5">
          <div className="page-hero-copy">
            <h1 className="m-0 flex items-center gap-2 text-[clamp(1.45rem,2.2vw,2rem)] font-bold tracking-[-0.015em] max-[560px]:text-[1.34rem]">
              <FiMessageSquare className="shrink-0" />
              Chatbot
            </h1>
            <p className="mt-1.5 text-[0.92rem] text-[#9fb0d4]">
              Ask about companies or financial data (demo frontend only).
            </p>
          </div>

          <div className="page-actions" />
        </header>

        <section className="panel chat-panel p-4">
          <div ref={listRef} className="chat-list mb-4 max-h-80 overflow-auto">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`mb-3 flex items-start ${m.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`inline-flex w-fit max-w-[70%] self-start rounded-md px-3 py-2 leading-snug ${m.from === "user" ? "bg-cyan-500 text-white" : "bg-white/5 text-slate-100"}`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="chat-composer">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Type your message..."
              className="market-input flex-1"
            />
            <button onClick={sendMessage} className="btn-primary">
              <FiSend />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
